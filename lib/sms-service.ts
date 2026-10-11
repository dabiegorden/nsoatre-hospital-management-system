import axios, { type AxiosError } from "axios";

const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";

export interface SendSMSOptions {
  sender?: string;
  message: string;
  recipients: string[];
  callbackUrl?: string;
  scheduledDate?: string;
  useCase?: "promotional" | "transactional";
}

interface RetryOptions {
  retries?: number;
  delayMs?: number;
}

/**
 * Core SMS sending utility with retry + structured error handling
 * Follows Arkesel API v2 documentation
 */
export async function sendSMS(
  options: SendSMSOptions,
  retryOpts: RetryOptions = { retries: 2, delayMs: 1000 }
): Promise<any> {
  if (!ARKESEL_API_KEY) {
    throw new Error("ARKESEL_API_KEY is not defined in environment variables");
  }

  const data = {
    sender: options.sender || "Antenatal",
    message: options.message,
    recipients: options.recipients,
    ...(options.callbackUrl && { callback_url: options.callbackUrl }),
    ...(options.scheduledDate && { scheduled_date: options.scheduledDate }),
    ...(options.useCase && { use_case: options.useCase }),
  };

  const config = {
    method: "post",
    url: ARKESEL_API_URL,
    headers: {
      "api-key": ARKESEL_API_KEY,
      "Content-Type": "application/json",
    },
    data,
  };

  let attempt = 0;
  const { retries, delayMs } = retryOpts;

  while (attempt <= (retries ?? 0)) {
    try {
      const response = await axios(config);
      console.log(
        `[SMS] Sent to ${options.recipients.join(", ")} — Status: ${
          response.status
        }`
      );
      return response.data;
    } catch (err) {
      attempt++;
      const error = err as AxiosError;

      const errMsg =
        error.response?.data ??
        error.message ??
        "Unknown SMS sending error occurred";

      console.error(`[SMS] Attempt ${attempt} failed:`, errMsg);

      if (attempt > (retries ?? 0)) {
        throw new Error(
          `[SMS] Failed after ${attempt} attempts: ${JSON.stringify(errMsg)}`
        );
      }

      // Exponential backoff retry
      await delay(delayMs! * attempt);
    }
  }
}

/**
 * Sends missed appointment SMS to patient + all admins concurrently.
 */
export async function sendMissedAppointmentSMS(
  patientPhone: string,
  patientName: string,
  adminPhones: string[]
): Promise<void> {
  try {
    const patientMessage = `Dear ${patientName}, you missed your antenatal care appointment. Please contact your healthcare provider to reschedule. Thank you.`;

    const adminMessage = `Alert: Patient ${patientName} (${patientPhone}) missed their scheduled appointment. Please follow up.`;

    // Send all SMS concurrently
    const smsTasks = [
      sendSMS({
        message: patientMessage,
        recipients: [patientPhone],
        useCase: "transactional",
      }),
    ];

    if (adminPhones.length > 0) {
      smsTasks.push(
        sendSMS({
          message: adminMessage,
          recipients: adminPhones,
          useCase: "transactional",
        })
      );
    }

    await Promise.allSettled(smsTasks);
    console.log("[SMS] Missed appointment notifications dispatched");
  } catch (error: any) {
    console.error("[SMS] Error sending missed appointment SMS:", error.message);
    throw error;
  }
}

/**
 * Helper for async delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
