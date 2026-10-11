"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Languages,
  PhoneCall,
  PhoneIncoming,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CallRow, type CallLog } from "@/components/call-history";
import { useDebounce } from "@/hooks/use-debounce";

interface CallStats {
  total: number;
  answered: number;
  twi: number;
  english: number;
  dangerAlerts: number;
  answerRate: number | null;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dangerOnly, setDangerOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dangerOnly) params.set("danger", "true");
      const res = await fetch(`/api/calls?${params}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setCalls(json.data);
        setTotalPages(Math.max(1, json.pagination.totalPages));
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, dangerOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dangerOnly]);

  useEffect(() => {
    fetch("/api/analytics?months=1", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => json.data && setStats(json.data.calls))
      .catch(() => undefined);
  }, []);

  const statCards = [
    { label: "Calls this month", value: stats?.total, icon: PhoneCall, tone: "emerald" },
    {
      label: "Answered",
      value: stats ? `${stats.answered}${stats.answerRate !== null ? ` (${stats.answerRate}%)` : ""}` : undefined,
      icon: PhoneIncoming,
      tone: "teal",
    },
    { label: "Twi / English", value: stats ? `${stats.twi} / ${stats.english}` : undefined, icon: Languages, tone: "blue" },
    { label: "Danger alerts", value: stats?.dangerAlerts, icon: AlertTriangle, tone: "rose" },
  ] as const;

  const tones: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    teal: "bg-teal-100 text-teal-600",
    blue: "bg-blue-100 text-blue-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-emerald-50/30 via-white to-green-50/20 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-2">
          Calls & Outcomes
        </h1>
        <p className="text-gray-600">
          Every follow-up call, the language the patient chose, and what the AI nurse learned.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value ?? "—"}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tones[s.tone]}`}>
                <s.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600">
          <CardTitle className="text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search patient name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Button
              variant={dangerOnly ? "default" : "outline"}
              onClick={() => setDangerOnly((v) => !v)}
              className={`h-11 gap-2 ${dangerOnly ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
            >
              <AlertTriangle className="w-4 h-4" />
              Danger signs only
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No calls found.</p>
          ) : (
            <div className="space-y-3">
              {calls.map((log) => (
                <CallRow key={log._id} log={log} showPatient />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
