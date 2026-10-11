"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";

interface VisitRecord {
  _id: string;
  pregnantWomanId: string;
  gestationalAge: number;
  bloodPressure: string;
  hb: string;
  sfh: string;
  rbs: string;
  weight: number;
  urineProtein: string;
  complaint: string;
  visitDate: string;
  recordedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface VisitHistoryProps {
  pregnantWomanId: string;
  triggerRefresh?: number;
}

export default function VisitHistory({
  pregnantWomanId,
  triggerRefresh,
}: VisitHistoryProps) {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisits();
  }, [pregnantWomanId, triggerRefresh]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/pregnant-women/${pregnantWomanId}/visits`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch visit records");
      }

      setVisits(data.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch visit records"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-emerald-100 shadow-md">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading visit records...</p>
        </CardContent>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card className="border-2 border-emerald-100 shadow-md">
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No visit records yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Add a monthly visit record above to start tracking
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-emerald-600" />
        Visit History ({visits.length})
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {visits.map((visit) => (
          <Card
            key={visit._id}
            className="border-2 border-emerald-100 shadow-md hover:shadow-lg transition-shadow"
          >
            <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold text-emerald-900">
                  {new Date(visit.visitDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  {visit.gestationalAge}w
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Blood Pressure
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.bloodPressure}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Weight
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.weight} kg
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hemoglobin (Hb)
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.hb || "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    SFH
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.sfh || "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    RBS
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.rbs || "—"}
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Urine Protein
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.urineProtein || "—"}
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Gestational Age (weeks)
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {visit.gestationalAge || "—"}
                  </p>
                </div>
              </div>

              {visit.complaint && (
                <div className="pt-3 border-t border-gray-200 space-y-2 bg-amber-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-amber-900 uppercase tracking-wide">
                    Patient Complaint / Notes
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {visit.complaint}
                  </p>
                </div>
              )}

              {visit.recordedBy && (
                <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
                  Recorded by {visit.recordedBy.name} on{" "}
                  {new Date(visit.createdAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
