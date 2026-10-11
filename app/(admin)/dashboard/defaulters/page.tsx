"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Home, PhoneOff, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/components/risk-badge";
import type { RiskLevel } from "@/lib/risk";

interface Defaulter {
  patientId: string;
  fullName: string;
  phoneNumber: string;
  residentialAddress: string;
  folderNumber: string;
  expectedDeliveryDate: string;
  consecutiveMisses: number;
  totalMisses: number;
  lastMissedAt: string | null;
  unreachable: boolean;
  nextAppointmentAt: string | null;
  riskLevel: RiskLevel;
  riskReasons: string[];
  followUpStatus: "none" | "assigned" | "visited" | "returned";
  followUpAssigneeId: string | null;
  followUpAssigneeName: string | null;
  followUpNote: string | null;
}

interface StaffUser {
  id: string;
  name: string;
}

const STATUS_LABELS = {
  none: "Not assigned",
  assigned: "Home visit assigned",
  visited: "Visited",
  returned: "Returned to care",
};

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—";

export default function DefaultersPage() {
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/defaulters", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setDefaulters(json.data);
      setNotes(Object.fromEntries(json.data.map((d: Defaulter) => [d.patientId, d.followUpNote ?? ""])));
    } catch (error: any) {
      toast.error(error.message || "Failed to load defaulters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/users", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setStaff(json.users ?? []))
      .catch(() => undefined);
  }, []);

  const update = async (patientId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/pregnant-women/${patientId}/follow-up`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message || "Update failed");
      return;
    }
    toast.success("Follow-up updated");
    setDefaulters((list) =>
      list.map((d) =>
        d.patientId === patientId
          ? {
              ...d,
              followUpStatus: json.data.followUpStatus,
              followUpAssigneeId: json.data.followUpAssigneeId,
              followUpAssigneeName:
                staff.find((s) => s.id === json.data.followUpAssigneeId)?.name ?? null,
              followUpNote: json.data.followUpNote,
            }
          : d
      )
    );
  };

  const open = defaulters.filter((d) => d.followUpStatus !== "returned");

  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-emerald-50/30 via-white to-green-50/20 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-2">
          Defaulter Tracking
        </h1>
        <p className="text-gray-600">
          Women who missed two or more visits in a row, or could not be reached by the automatic
          calls. Assign a community health nurse for a home visit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Need follow-up", value: open.length, icon: UserX, tone: "bg-rose-100 text-rose-600" },
          {
            label: "Unreachable by phone",
            value: open.filter((d) => d.unreachable).length,
            icon: PhoneOff,
            tone: "bg-amber-100 text-amber-600",
          },
          {
            label: "Home visits assigned",
            value: defaulters.filter((d) => d.followUpStatus === "assigned").length,
            icon: Home,
            tone: "bg-emerald-100 text-emerald-600",
          },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? "—" : s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600">
          <CardTitle className="text-white">Defaulters (highest risk first)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : defaulters.length === 0 ? (
            <p className="text-center text-gray-500 py-16">
              No defaulters. Every active patient is attending or has been reached.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-emerald-100 bg-emerald-50/50 text-left">
                    <th className="px-3 py-3 font-bold text-gray-700">Patient</th>
                    <th className="px-3 py-3 font-bold text-gray-700">Risk</th>
                    <th className="px-3 py-3 font-bold text-gray-700">Missed</th>
                    <th className="px-3 py-3 font-bold text-gray-700">Due date</th>
                    <th className="px-3 py-3 font-bold text-gray-700">Next visit</th>
                    <th className="px-3 py-3 font-bold text-gray-700 min-w-44">Nurse</th>
                    <th className="px-3 py-3 font-bold text-gray-700 min-w-44">Status</th>
                    <th className="px-3 py-3 font-bold text-gray-700 min-w-56">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map((d) => (
                    <tr key={d.patientId} className="border-b border-gray-100 align-top hover:bg-emerald-50/30">
                      <td className="px-3 py-3">
                        <Link
                          href={`/dashboard/pregnant-women/${d.patientId}`}
                          className="font-semibold text-gray-900 hover:text-emerald-700"
                        >
                          {d.fullName}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {d.phoneNumber} · Folder {d.folderNumber}
                        </p>
                        <p className="text-xs text-gray-500">{d.residentialAddress}</p>
                      </td>
                      <td className="px-3 py-3">
                        <RiskBadge level={d.riskLevel} reasons={d.riskReasons} />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{d.consecutiveMisses} in a row</p>
                        <p className="text-xs text-gray-500">Last: {fmtDate(d.lastMissedAt)}</p>
                        {d.unreachable && (
                          <Badge className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Unreachable
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700">{fmtDate(d.expectedDeliveryDate)}</td>
                      <td className="px-3 py-3 text-gray-700">{fmtDate(d.nextAppointmentAt)}</td>
                      <td className="px-3 py-3">
                        <Select
                          value={d.followUpAssigneeId ?? "none"}
                          onValueChange={(v) =>
                            update(d.patientId, { followUpAssigneeId: v === "none" ? null : v })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Assign nurse" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {staff.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          value={d.followUpStatus}
                          onValueChange={(v) => update(d.patientId, { followUpStatus: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={notes[d.patientId] ?? ""}
                          placeholder="Outcome of home visit…"
                          className="h-9"
                          onChange={(e) =>
                            setNotes((n) => ({ ...n, [d.patientId]: e.target.value }))
                          }
                          onBlur={() => {
                            if ((notes[d.patientId] ?? "") !== (d.followUpNote ?? "")) {
                              update(d.patientId, { followUpNote: notes[d.patientId] ?? "" });
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
