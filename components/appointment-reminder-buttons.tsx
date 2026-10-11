"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppointmentReminderButtonsProps {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  appointmentDateTime: string;
  isMissedNotificationSent: boolean;
  voiceCallAttempts: number;
}

export function AppointmentReminderButtons({
  appointmentId,
  patientName,
  patientPhone,
  appointmentDateTime,
  isMissedNotificationSent,
  voiceCallAttempts,
}: AppointmentReminderButtonsProps) {
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState(
    `Dear ${patientName}, this is a reminder about your antenatal appointment. Please contact us if you have any questions. - Nsoatre Hospital Antenatal Care`
  );
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      setSendingSMS(true);
      const response = await fetch(
        `/api/appointments/${appointmentId}/send-sms-reminder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: smsMessage }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send SMS");
      }

      toast.success(
        `SMS sent to ${patientName} and all admins with personalized messages!`
      );
      setShowSMSDialog(false);
    } catch (error: any) {
      console.error("Send SMS Error:", error);
      toast.error(error.message || "Failed to send SMS reminder");
    } finally {
      setSendingSMS(false);
    }
  };

  const handleSendVoiceCall = async () => {
    try {
      setSendingVoice(true);

      console.log(
        "[v0] Making voice call request for appointment:",
        appointmentId
      );

      const response = await fetch(
        `/api/appointments/${appointmentId}/send-voice-reminder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();

      console.log("[v0] Voice call response status:", response.status);
      console.log("[v0] Voice call response data:", data);

      if (!response.ok) {
        if (response.status === 401) {
          console.error(
            "[v0] Authentication failed - token may be missing or expired"
          );
          toast.error(
            "Session expired. Please refresh the page and log in again."
          );
          return;
        }
        const errorMsg = data.message || "Failed to make voice call";
        if (
          errorMsg.includes("ARKESEL") ||
          errorMsg.includes("authentication")
        ) {
          toast.error(
            "Voice service configuration issue. Please contact support. Error: " +
              errorMsg
          );
        } else {
          throw new Error(errorMsg);
        }
        return;
      }

      toast.success(data.message || `Voice call started for ${patientName}`);
    } catch (error: any) {
      console.error("[v0] Voice Call Error:", error);
      toast.error(error.message || "Failed to send voice reminder");
    } finally {
      setSendingVoice(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isMissedNotificationSent ? "secondary" : "outline"}
          onClick={() => setShowSMSDialog(true)}
          disabled={sendingSMS}
          className="gap-2 bg-emerald-500 text-white hover:bg-transparent hover:ring-[1px] hover:ring-emerald-500 hover:text-black cursor-pointer"
          title={
            isMissedNotificationSent
              ? "SMS already sent"
              : "Send SMS reminder to patient and admins"
          }
        >
          {sendingSMS ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          SMS Reminder
        </Button>

        <Button
          size="sm"
          variant={voiceCallAttempts > 0 ? "secondary" : "outline"}
          onClick={handleSendVoiceCall}
          disabled={sendingVoice}
          className="gap-2 bg-emerald-500 text-white hover:bg-transparent hover:ring-[1px] hover:ring-emerald-500 cursor-pointer"
          title={
            voiceCallAttempts > 0
              ? `Voice call already attempted (${voiceCallAttempts}x)`
              : "Call the patient: she chooses Twi (recorded message) or English (AI nurse)"
          }
        >
          {sendingVoice ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          Voice Reminder
        </Button>
      </div>

      {/* SMS Message Dialog */}
      <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS Reminder</DialogTitle>
            <DialogDescription>
              Send SMS reminder to {patientName} and all admins with
              personalized messages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Enter SMS message..."
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Character count: {smsMessage.length}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendSMS} disabled={sendingSMS}>
                {sendingSMS ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send SMS"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
