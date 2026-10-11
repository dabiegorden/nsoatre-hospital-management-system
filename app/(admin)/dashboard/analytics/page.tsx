"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  BarChart3,
  Download,
  PhoneIncoming,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Shield,
  TrendingUp,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { dangerLabel, reasonLabel } from "@/lib/labels";

interface Analytics {
  monthly: { month: string; completed: number; missed: number; attendanceRate: number | null }[];
  totals: { completed: number; missed: number; attendanceRate: number | null };
  calls: {
    total: number;
    answered: number;
    twi: number;
    english: number;
    arkeselFallback: number;
    dangerAlerts: number;
    answerRate: number | null;
  };
  sms: { sent: number; failed: number };
  effectiveness: {
    reachedMissed: number;
    unreachedMissed: number;
    reachedReturnRate: number | null;
    unreachedReturnRate: number | null;
  };
  reasons: { category: string; count: number }[];
  dangerSigns: { sign: string; count: number }[];
  risk: { low: number; moderate: number; high: number };
  defaulters: number;
}

const chartConfig = {
  attendanceRate: { label: "Attendance rate", color: "var(--color-emerald-600, #059669)" },
} satisfies ChartConfig;

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`);

/** Single-hue horizontal bars with direct value labels. */
function BarList({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-gray-500 py-6 text-center">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-emerald-600"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState("6");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?months=${months}`, { credentials: "include" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.message);
        setData(json.data);
      })
      .catch((e) => toast.error(e.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [months]);

  const downloadReport = async () => {
    const res = await fetch(`/api/reports/monthly?month=${reportMonth}`, { credentials: "include" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.message || "Failed to generate report");
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `anc-report-${reportMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const riskTotal = data ? data.risk.low + data.risk.moderate + data.risk.high : 0;
  const tiles = data
    ? [
        {
          label: "Attendance rate",
          value: fmtPct(data.totals.attendanceRate),
          sub: `${data.totals.completed} attended · ${data.totals.missed} missed`,
          icon: TrendingUp,
        },
        {
          label: "Call answer rate",
          value: fmtPct(data.calls.answerRate),
          sub: `${data.calls.answered} of ${data.calls.total - data.calls.arkeselFallback} IVR calls`,
          icon: PhoneIncoming,
        },
        {
          label: "Danger-sign alerts",
          value: String(data.calls.dangerAlerts),
          sub: "raised by the AI nurse",
          icon: ShieldAlert,
        },
        {
          label: "Defaulters",
          value: String(data.defaulters),
          sub: "need a home visit",
          icon: UserX,
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-emerald-50/30 via-white to-green-50/20 min-h-screen print:bg-white">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-2">
            Analytics & Reports
          </h1>
          <p className="text-gray-600">
            Is the reminder system working? Attendance, call outcomes and patient risk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="h-10 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="h-10 w-40"
            aria-label="Report month"
          />
          <Button onClick={downloadReport} className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Download className="w-4 h-4" />
            Monthly CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="h-10 gap-2">
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-24">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <Card key={t.label} className="border-0 shadow-lg bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-600">{t.label}</p>
                    <t.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{t.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-white xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  Attendance rate by month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.monthly.length === 0 ? (
                  <p className="text-sm text-gray-500 py-16 text-center">No attended or missed visits yet.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <LineChart data={data.monthly} margin={{ left: 0, right: 12, top: 8 }}>
                      <CartesianGrid vertical={false} strokeOpacity={0.4} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const row = payload?.[0]?.payload;
                              return row
                                ? `${monthLabel(row.month)}: ${row.completed} attended, ${row.missed} missed`
                                : "";
                            }}
                            formatter={(value) => [`${value}%`, " Attendance rate"]}
                          />
                        }
                      />
                      <Line
                        dataKey="attendanceRate"
                        type="monotone"
                        stroke="var(--color-attendanceRate)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Does reaching the patient help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Share of missed visits followed by an attended visit within 21 days.
                </p>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-800">Patient reached by the call</p>
                  <p className="text-3xl font-bold text-emerald-900">
                    {fmtPct(data.effectiveness.reachedReturnRate)}
                  </p>
                  <p className="text-xs text-emerald-700">of {data.effectiveness.reachedMissed} missed visits</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-700">Not reached</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtPct(data.effectiveness.unreachedReturnRate)}
                  </p>
                  <p className="text-xs text-gray-500">of {data.effectiveness.unreachedMissed} missed visits</p>
                </div>
                <div className="text-sm text-gray-600 border-t pt-3 space-y-1">
                  <p>SMS sent: <strong>{data.sms.sent}</strong> ({data.sms.failed} failed)</p>
                  <p>
                    Calls answered in Twi: <strong>{data.calls.twi}</strong> · English:{" "}
                    <strong>{data.calls.english}</strong>
                  </p>
                  <p>Twi voice messages (fallback): <strong>{data.calls.arkeselFallback}</strong></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Why patients missed visits</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList
                  items={data.reasons.map((r) => ({
                    label: reasonLabel(r.category),
                    value: r.count,
                  }))}
                  empty="No reasons collected yet. They come from English follow-up calls."
                />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Danger signs reported</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList
                  items={data.dangerSigns.map((d) => ({
                    label: dangerLabel(d.sign),
                    value: d.count,
                  }))}
                  empty="No danger signs reported."
                />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Active pregnancies by risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "High risk", value: data.risk.high, Icon: ShieldAlert, bar: "bg-rose-600", text: "text-rose-700" },
                  { label: "Moderate risk", value: data.risk.moderate, Icon: Shield, bar: "bg-amber-500", text: "text-amber-700" },
                  { label: "Low risk", value: data.risk.low, Icon: ShieldCheck, bar: "bg-emerald-600", text: "text-emerald-700" },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`flex items-center gap-1.5 font-medium ${r.text}`}>
                        <r.Icon className="w-4 h-4" />
                        {r.label}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {r.value}
                        {riskTotal > 0 && (
                          <span className="text-gray-500 font-normal"> ({Math.round((r.value / riskTotal) * 100)}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${r.bar}`}
                        style={{ width: riskTotal ? `${(r.value / riskTotal) * 100}%` : 0 }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 pt-2">
                  Scored from blood pressure, Hb, age, infections, gestation and missed visits. High-risk
                  patients get three follow-up calls, five minutes apart.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
