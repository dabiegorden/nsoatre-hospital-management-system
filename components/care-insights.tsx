"use client";

import { useState } from "react";
import { Baby, CalendarClock, HeartPulse, Languages } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/components/risk-badge";
import { nextAncContact, WHO_CONTACT_WEEKS } from "@/lib/anc-schedule";
import { assessRisk, currentGestationalWeeks, type RiskInput } from "@/lib/risk";

interface Props {
  woman: RiskInput & {
    _id: string;
    expectedDeliveryDate: string;
    gestationalAge: number;
    preferredLanguage?: "twi" | "english" | null;
    followUpStatus?: "none" | "assigned" | "visited" | "returned";
  };
}

const FOLLOW_UP_LABELS = {
  none: null,
  assigned: "Home visit assigned (defaulter follow-up)",
  visited: "Home visit done",
  returned: "Returned to care after follow-up",
};

/** Risk, due-date countdown, next WHO contact and call language for a patient. */
export function CareInsights({ woman }: Props) {
  const [language, setLanguage] = useState(woman.preferredLanguage ?? "ask");
  const risk = assessRisk(woman);
  const weeks = currentGestationalWeeks(woman.expectedDeliveryDate, woman.gestationalAge);
  const edd = new Date(woman.expectedDeliveryDate);
  const daysToDue = Math.ceil((edd.getTime() - Date.now()) / 86_400_000);
  const next = nextAncContact(edd);
  const contactsDone = weeks === null ? 0 : WHO_CONTACT_WEEKS.filter((w) => w <= weeks).length;
  const followUp = woman.followUpStatus ? FOLLOW_UP_LABELS[woman.followUpStatus] : null;

  const saveLanguage = async (value: string) => {
    setLanguage(value);
    const res = await fetch(`/api/pregnant-women/${woman._id}/follow-up`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ preferredLanguage: value === "ask" ? null : value }),
    });
    if (res.ok) toast.success("Call language updated");
    else toast.error("Could not update call language");
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600 rounded-t-xl">
        <CardTitle className="text-white flex items-center gap-2">
          <HeartPulse className="w-5 h-5" />
          Care Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Risk level</p>
          <RiskBadge level={risk.level} />
          {risk.reasons.length > 0 ? (
            <ul className="mt-2 text-sm text-gray-700 space-y-0.5">
              {risk.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No risk factors recorded.</p>
          )}
          {followUp && <p className="mt-2 text-xs font-medium text-amber-700">{followUp}</p>}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Baby className="w-3.5 h-3.5" /> Due date
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {edd.toLocaleDateString("en-GB", { dateStyle: "medium" })}
          </p>
          <p className="text-sm text-gray-600">
            {daysToDue > 0
              ? `in ${Math.floor(daysToDue / 7)} weeks ${daysToDue % 7} days`
              : daysToDue === 0
                ? "today"
                : `${Math.abs(daysToDue)} days overdue`}
          </p>
          {weeks !== null && (
            <p className="text-sm text-gray-600">About {Math.floor(weeks)} weeks pregnant</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Next WHO contact
          </p>
          {next ? (
            <>
              <p className="text-lg font-semibold text-gray-900">
                Contact {next.contactNumber} of 8
              </p>
              <p className="text-sm text-gray-600">
                {next.week} weeks · {next.date.toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600">All 8 contacts are past; plan delivery.</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {contactsDone} of 8 contact windows passed. Booked automatically when a visit is completed.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Languages className="w-3.5 h-3.5" /> Reminder call language
          </p>
          <Select value={language} onValueChange={saveLanguage}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ask">Ask each call (Twi / English menu)</SelectItem>
              <SelectItem value="twi">Twi (Twi SMS; call menu, then recording)</SelectItem>
              <SelectItem value="english">English (calls go straight to the AI nurse)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Remembered from her choice on the last answered call. Twi patients still hear the short menu so a key press confirms she answered.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
