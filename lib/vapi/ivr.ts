/**
 * Builds the per-call Vapi Squad for the bilingual reminder IVR:
 *
 *   Language Menu ──(1 / "Twi")──────► Twi Reminder  (plays the recorded Twi audio, hangs up)
 *                 └─(2 / "English")──► English Nurse (live AI conversation)
 *
 * Patients who chose English before skip the menu. Timers in the hooks count
 * from the end of the assistant's last utterance ("a quiet period starts after
 * the assistant speaks" — Vapi docs, assistant hooks), so the Twi hang-up only
 * starts after the recording has finished playing.
 */

export type CallLanguage = "twi" | "english";

export interface IvrContext {
  patientName: string;
  appointmentDate?: Date | null;
  appointmentTime?: string | null;
  appointmentLocation?: string | null;
  gestationalWeeks?: number | null;
  highRisk?: boolean;
  language?: CallLanguage | null;
}

export interface IvrOptions {
  twiAudioUrl: string;
  menuAudioUrl?: string | null;
  structuredOutputId?: string | null;
  /** Webhook for status and end-of-call events; omit when not publicly reachable. */
  server?: { url: string; headers: Record<string, string> } | null;
}

export const MEMBER_NAMES = {
  menu: "Language Menu",
  twi: "Twi Reminder",
  english: "English Nurse",
} as const;

export const HANDOFF_TOOL_NAMES = {
  twi: "handoff_to_twi",
  english: "handoff_to_english",
} as const;

const VOICE = { provider: "vapi", voiceId: "Hana" };

const TRANSCRIBER = {
  provider: "deepgram",
  model: "nova-2",
  language: "en",
  keywords: ["Twi:5", "English:2"],
};

function handoffTool(target: "twi" | "english") {
  return {
    type: "handoff",
    function: { name: HANDOFF_TOOL_NAMES[target] },
    destinations: [
      {
        type: "assistant",
        assistantName: MEMBER_NAMES[target],
        description:
          target === "twi"
            ? "The caller pressed 1, asked for Twi, spoke Twi, or did not choose clearly."
            : "The caller pressed 2 or asked for English.",
        contextEngineeringPlan: { type: "none" },
      },
    ],
  };
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function spokenDate(date?: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Accra",
  });
}

function menuMember(ctx: IvrContext, opts: IvrOptions) {
  const name = firstName(ctx.patientName);
  return {
    name: MEMBER_NAMES.menu,
    firstMessage:
      opts.menuAudioUrl ||
      `Hello, this is Nsoatre Hospital in Sunyani with a message for ${name}. Akwaaba. To hear the message in Twi, press 1, or say Twi. For English, press 2, or say English.`,
    firstMessageMode: "assistant-speaks-first",
    keypadInputPlan: { enabled: true, timeoutSeconds: 2 },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You route a hospital reminder phone call to the right language. You never chat, answer questions, or say anything yourself — you only call a handoff tool.

The caller was asked to press 1 or say "Twi" for Twi, or press 2 or say "English" for English. Keypad presses arrive as digits.

- "1", "one", "Twi", words that sound like Twi (for example "tree", "twee", "chwee", "tuwi"), or any reply in Twi or Akan (for example "aane", "yoo", "medaase", "ɛte sɛn") → call ${HANDOFF_TOOL_NAMES.twi} immediately.
- "2", "two", "English", or a reply clearly in English that asks for English → call ${HANDOFF_TOOL_NAMES.english} immediately.
- Anything else, silence, or uncertainty → call ${HANDOFF_TOOL_NAMES.twi}. Most patients of this hospital speak Twi.`,
        },
      ],
      tools: [handoffTool("twi"), handoffTool("english")],
    },
    voice: VOICE,
    transcriber: TRANSCRIBER,
    hooks: [
      {
        on: "customer.speech.timeout",
        options: { timeoutSeconds: 7, triggerMaxCount: 1 },
        do: [
          {
            type: "say",
            exact: "For Twi, press 1. For English, press 2.",
          },
        ],
      },
      {
        on: "customer.speech.timeout",
        options: { timeoutSeconds: 16, triggerMaxCount: 1 },
        do: [{ type: "tool", tool: handoffTool("twi") }],
      },
    ],
  };
}

function twiMember(opts: IvrOptions) {
  return {
    name: MEMBER_NAMES.twi,
    firstMessage: opts.twiAudioUrl,
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: false,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `A recorded Twi message from Nsoatre Hospital about the caller's antenatal appointment has just been played. You cannot speak Twi. If the caller says anything, reply only "Medaase. Nyame nhyira wo." and then end the call with the endCall tool.`,
        },
      ],
      tools: [{ type: "endCall" }],
    },
    voice: VOICE,
    transcriber: TRANSCRIBER,
    hooks: [
      {
        on: "customer.speech.timeout",
        options: { timeoutSeconds: 6, triggerMaxCount: 1 },
        do: [{ type: "tool", tool: { type: "endCall" } }],
      },
    ],
  };
}

function englishMember(ctx: IvrContext) {
  const name = firstName(ctx.patientName);
  const date = spokenDate(ctx.appointmentDate);
  const appointmentLine = [
    date && `on ${date}`,
    ctx.appointmentTime && `at ${ctx.appointmentTime}`,
    ctx.appointmentLocation && `(${ctx.appointmentLocation})`,
  ]
    .filter(Boolean)
    .join(" ");

  const systemPrompt = `# Identity
You are Madam Clara, a warm and patient nurse assistant calling on behalf of the antenatal clinic at Nsoatre Government Hospital, Sunyani, Ghana. You speak simple, clear English, slowly and kindly. Many patients speak English as a second language.

# Context
- Patient: ${ctx.patientName}
- Missed antenatal appointment: ${appointmentLine || "a recent appointment"}
${ctx.gestationalWeeks ? `- Pregnancy: about ${Math.round(ctx.gestationalWeeks)} weeks` : ""}
${ctx.highRisk ? "- The clinic has flagged this pregnancy as HIGH RISK. Encourage her strongly to come back as soon as possible." : ""}

# Goals (in this order)
1. Confirm you are speaking with ${name}. If someone else answered, politely ask to speak with ${name}. If she is not available, ask them to tell her to call or visit Nsoatre Hospital antenatal clinic, thank them, and end the call. Do not share any medical details with anyone else.
2. Ask gently how she and the baby are doing.
3. Ask why she could not come to the appointment. Listen without judging.
4. Check for danger signs. Ask one short question: "Since your last visit, have you had any bleeding, a very bad headache or blurred vision, swelling of your face or hands, fits, strong pain in your belly, fever, water leaking, or is the baby moving less than usual?"
   - If she reports ANY of these: calmly tell her this needs attention today. She should go to the hospital or the nearest health facility immediately, and call the National Ambulance Service on 193 or 112 if she cannot travel. Tell her the clinic team will also be informed.
5. Encourage her to return. Ask which day she can come back to the clinic, and repeat the day back to confirm.
6. Close warmly: "Thank you, ${name}. Your health and your baby's health matter to us at Nsoatre Hospital." Then end the call with the endCall tool.

# Style
- Keep every turn short: one or two sentences, one question at a time.
- Never diagnose, prescribe, or give medication advice. For medical questions, advise her to speak with the nurses at the clinic.
- If she is busy, ask for a better time to call and end politely.
- If she becomes upset, stay calm and kind.
- End the call with endCall once the goals are done, if she asks to stop, or if the line is silent.`;

  return {
    name: MEMBER_NAMES.english,
    firstMessage: `Hello ${name}, this is Madam Clara, a nurse assistant from Nsoatre Hospital, Sunyani. I'm calling about your antenatal appointment${date ? ` on ${date}` : ""}. Is this a good time to talk for two minutes?`,
    firstMessageMode: "assistant-speaks-first",
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }],
      tools: [{ type: "endCall" }],
    },
    voice: VOICE,
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    hooks: [
      {
        on: "customer.speech.timeout",
        options: {
          timeoutSeconds: 10,
          triggerMaxCount: 2,
          triggerResetMode: "onUserSpeech",
        },
        do: [{ type: "say", exact: "Hello, are you still there?" }],
      },
      {
        on: "customer.speech.timeout",
        options: { timeoutSeconds: 30, triggerMaxCount: 1 },
        do: [
          {
            type: "say",
            exact:
              "I will let you go now. Please visit the antenatal clinic at Nsoatre Hospital soon. Goodbye.",
          },
          { type: "tool", tool: { type: "endCall" } },
        ],
      },
    ],
  };
}

/** Returns the transient Squad for one reminder call. */
export function buildReminderSquad(ctx: IvrContext, opts: IvrOptions) {
  const shared = {
    maxDurationSeconds: 300,
    ...(opts.structuredOutputId
      ? { artifactPlan: { structuredOutputIds: [opts.structuredOutputId] } }
      : {}),
    ...(opts.server
      ? {
          server: { url: opts.server.url, headers: opts.server.headers },
          serverMessages: ["status-update", "end-of-call-report"],
        }
      : {}),
  };

  const twi = { ...twiMember(opts), ...shared };
  const english = { ...englishMember(ctx), ...shared };

  // English patients go straight to the AI nurse (the conversation confirms who
  // answered). Twi patients keep the short menu: pressing 1 is the only signal
  // that a person, not an answering machine or an empty room, is on the line.
  const members =
    ctx.language === "english"
      ? [english]
      : [{ ...menuMember(ctx, opts), ...shared }, twi, english];

  return { members: members.map((assistant) => ({ assistant })) };
}
