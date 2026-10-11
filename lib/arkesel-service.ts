import axios from "axios";

const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const ARKESEL_VOICE_API_KEY = process.env.ARKESEL_VOICE_API_KEY;

interface SendSMSParams {
  recipients: string[];
  message: string;
  sender?: string;
}

interface SendVoiceParams {
  recipients: string[];
  voiceFileUrl?: string;
}

export const arkeselService = {
  async sendSMS({ recipients, message, sender = "Nsoatre" }: SendSMSParams) {
    try {
      if (!ARKESEL_API_KEY)
        throw new Error("ARKESEL_API_KEY is not configured");

      const validRecipients = recipients.filter(Boolean) as string[];
      if (validRecipients.length === 0)
        throw new Error("No valid recipients provided");

      const response = await axios.post(
        "https://sms.arkesel.com/api/v2/sms/send",
        { sender, message, recipients: validRecipients },
        {
          headers: {
            "api-key": ARKESEL_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error("SMS Send Error:", error.message);
      return { success: false, error: error.message || "Failed to send SMS" };
    }
  },

  async sendVoiceCall({ recipients, voiceFileUrl }: SendVoiceParams) {
    try {
      if (!ARKESEL_VOICE_API_KEY)
        throw new Error("ARKESEL_VOICE_API_KEY is not configured");

      if (!voiceFileUrl)
        throw new Error(
          "ARKESEL_voiceFileUrl is not configured. Please set it in your environment variables."
        );

      const validRecipients = recipients
        .filter(Boolean)
        .map((recipient) => recipient.replace(/^\+/, "")) as string[];

      if (validRecipients.length === 0)
        throw new Error("No valid recipients provided");

      const FormData = require("form-data");

      const formData = new FormData();

      // Append recipients as recipients[] (required by Arkesel API)
      validRecipients.forEach((recipient) => {
        formData.append("recipients[]", recipient);
      });

      if (voiceFileUrl) {
        console.log("[v0] Downloading voice file from:", voiceFileUrl);

        // Download the voice file as a buffer
        const response = await axios.get(voiceFileUrl, {
          responseType: "arraybuffer",
        });

        const buffer = Buffer.from(response.data);
        console.log(
          "[v0] Voice file downloaded, size:",
          buffer.length,
          "bytes"
        );

        // Append buffer directly to FormData with filename
        formData.append("voice_file", buffer, "voice_message.mp3");
      }

      // Add retry setting
      formData.append("retry", "false");

      console.log("[v0] Sending voice call to Arkesel API");
      console.log("[v0] Recipients (formatted):", validRecipients);
      console.log("[v0] Using voice_file:", voiceFileUrl ? "yes" : "no");

      const response = await axios.post(
        "https://sms.arkesel.com/api/v2/sms/voice/send", // ✅ corrected
        formData,
        {
          headers: {
            "api-key": ARKESEL_VOICE_API_KEY,
            ...formData.getHeaders(),
          },
        }
      );

      console.log("[v0] Voice call sent successfully:", response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status;

      console.error(
        `[v0] Voice Call Error - Status: ${statusCode}, Message: ${errorMessage}`
      );
      console.error("[v0] Full error:", error.response?.data || error.message);

      return {
        success: false,
        error: errorMessage || "Failed to make voice call",
        statusCode,
      };
    }
  },
};
