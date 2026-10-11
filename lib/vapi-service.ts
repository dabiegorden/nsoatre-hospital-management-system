import { VapiClient } from "@vapi-ai/server-sdk";

const VAPI_API_KEY = process.env.VAPI_API_KEY;

if (!VAPI_API_KEY) {
  throw new Error("VAPI_API_KEY is not defined in environment variables");
}

const vapi = new VapiClient({ token: VAPI_API_KEY });

export interface VoiceCallOptions {
  phoneNumber: string;
  message: string;
  assistantName?: string;
  retries?: number;
}

/**
 * Creates an AI assistant and makes a voice call with retries + structured logging
 */
export async function makeVoiceCall(options: VoiceCallOptions): Promise<any> {
  const {
    phoneNumber,
    message,
    assistantName = "Madam Clara",
    retries = 2,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create assistant
      const assistant = await vapi.assistants.create({
        name: assistantName,
        firstMessage: message,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `
                You are an AI nurse assistant calling on behalf of Nsoatre Hospital Sunyani (managed by Mr. Prince).
                Purpose: Follow up on pregnant women who missed antenatal appointments.
                1️⃣ Greet politely and introduce yourself.
                2️⃣ Ask why they couldn’t attend.
                3️⃣ Encourage them to reschedule soon.
                4️⃣ End warmly: “Thank you, Madam. Your health matters to us at Nsoatre Hospital Sunyani.”
              `,
            },
          ],
        },
      });

      // Place the call
      const call = await vapi.calls.create({
        assistantId: assistant.id,
        customer: { number: phoneNumber },
      });

      console.log(
        `📞 [VAPI] Call initiated to ${phoneNumber} — Assistant: ${assistantName}`
      );
      return call;
    } catch (error: any) {
      console.error(
        `❌ [VAPI] Attempt ${attempt} failed for ${phoneNumber}:`,
        error.message
      );

      if (attempt === retries) {
        throw new Error(
          `[VAPI] Failed to call ${phoneNumber} after ${retries} attempts: ${error.message}`
        );
      }

      // Backoff before retry
      await delay(2000 * attempt);
    }
  }
}

/**
 * Wrapper: Patient reminder call
 */
export async function makePatientReminderCall(
  patientPhone: string,
  patientName: string
): Promise<any> {
  const message = `Hello ${patientName}, this is a reminder that you missed your antenatal care appointment. Please contact your healthcare provider to reschedule. Thank you.`;

  return makeVoiceCall({
    phoneNumber: patientPhone,
    message,
    assistantName: "Missed Appointment Reminder",
  });
}

/**
 * Wrapper: Admin escalation call
 */
export async function makeAdminNotificationCall(
  adminPhone: string,
  patientName: string,
  patientPhone: string
): Promise<any> {
  const message = `Alert: Patient ${patientName} (${patientPhone}) missed their antenatal appointment. Please follow up immediately.`;

  return makeVoiceCall({
    phoneNumber: adminPhone,
    message,
    assistantName: "Missed Appointment Alert",
  });
}

/**
 * Async delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
