"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Heart,
  Activity,
  User,
  Calendar,
  Phone,
  MapPin,
  Ruler,
  Weight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PublicHealthRecord {
  _id: string;
  registrationNumber: string;
  childName: string;
  motherName: string;
  vaccinationGiven: string;
  lastDateOfVisit: string;
  followUpDate: string;
  name: string;
  diagnosis: string;
  dateOfDischarge: string;
  phoneNumber: string;
  chpZone: string;
  recordDate: string;
  feedback?: string;
  homeVisit: boolean;
  physicalExamination: boolean;
  referralNote: boolean;
  bloodPressure?: string;
  age?: number;
  sex?: string;
  weight?: number;
  height?: number;
  muac?: number;
  wh?: number;
  nutritionStatus?: string;
  nutritionRecommendation?: string;
  address?: string;
  remarks?: string;
  dmHptStatus?: string;
  recordedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PublicHealthRecordDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<PublicHealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/public-health-records/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch record");
      }

      const result = await response.json();
      setRecord(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/public-health-records/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }
      toast.success("Record deleted successfully.");
      router.push("/dashboard/public-health-records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-emerald-700 font-medium">Loading record...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Record not found"}</AlertDescription>
          </Alert>
          <Link href="/dashboard/public-health-records">
            <Button
              variant="outline"
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/public-health-records">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-linear-to-br from-emerald-500 to-teal-600 p-3 rounded-lg shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {record.childName}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Reg. No:{" "}
                  <span className="font-semibold text-emerald-600">
                    {record.registrationNumber}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/public-health-records/${id}/edit`}>
              <Button
                variant="outline"
                className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
                size="sm"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 gap-2"
              onClick={() => setDeleteId(id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Child Welfare Clinic */}
        <Card className="border-emerald-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="pb-3 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <Heart className="h-5 w-5 text-emerald-600" />
              Child Welfare Clinic
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
            <DetailItem
              label="Child Name"
              value={record.childName}
              icon={<User className="h-4 w-4 text-emerald-600" />}
            />
            <DetailItem
              label="Mother Name"
              value={record.motherName}
              icon={<User className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Vaccination Given"
              value={record.vaccinationGiven}
              icon={<Activity className="h-4 w-4 text-emerald-600" />}
            />
            <DetailItem
              label="Last Date of Visit"
              value={new Date(record.lastDateOfVisit).toLocaleDateString()}
              icon={<Calendar className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Follow-up Date"
              value={new Date(record.followUpDate).toLocaleDateString()}
              icon={<Calendar className="h-4 w-4 text-emerald-600" />}
            />
          </CardContent>
        </Card>

        {/* Link to Care */}
        <Card className="border-teal-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="pb-3 bg-linear-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
            <CardTitle className="text-lg flex items-center gap-2 text-teal-900">
              <Activity className="h-5 w-5 text-teal-600" />
              Link to Care
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
            <DetailItem
              label="Name"
              value={record.name}
              icon={<User className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Diagnosis"
              value={record.diagnosis}
              icon={<FileText className="h-4 w-4 text-emerald-600" />}
            />
            <DetailItem
              label="Date of Discharge"
              value={new Date(record.dateOfDischarge).toLocaleDateString()}
              icon={<Calendar className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Phone Number"
              value={record.phoneNumber}
              icon={<Phone className="h-4 w-4 text-emerald-600" />}
            />
            <DetailItem
              label="CHP Zone"
              value={record.chpZone}
              icon={<MapPin className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Record Date"
              value={new Date(record.recordDate).toLocaleDateString()}
              icon={<Calendar className="h-4 w-4 text-emerald-600" />}
            />
            {record.feedback && (
              <DetailItem
                label="Feedback"
                value={record.feedback}
                className="md:col-span-2"
                icon={<FileText className="h-4 w-4 text-teal-600" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Additional Tracking */}
        <Card className="border-emerald-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="pb-3 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <Activity className="h-5 w-5 text-emerald-600" />
              Additional Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
            <StatusBadge label="Home Visit" active={record.homeVisit} />
            <StatusBadge
              label="Physical Examination"
              active={record.physicalExamination}
            />
            <StatusBadge label="Referral Note" active={record.referralNote} />
            {record.bloodPressure && (
              <DetailItem
                label="Blood Pressure"
                value={record.bloodPressure}
                icon={<Heart className="h-4 w-4 text-red-500" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Nutrition */}
        {(record.age || record.weight || record.height) && (
          <Card className="border-teal-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-linear-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
              <CardTitle className="text-lg flex items-center gap-2 text-teal-900">
                <Weight className="h-5 w-5 text-teal-600" />
                Nutrition
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
              {record.age && (
                <DetailItem
                  label="Age"
                  value={`${record.age} years`}
                  icon={<User className="h-4 w-4 text-teal-600" />}
                />
              )}
              {record.sex && (
                <DetailItem
                  label="Sex"
                  value={
                    record.sex.charAt(0).toUpperCase() + record.sex.slice(1)
                  }
                  icon={<User className="h-4 w-4 text-emerald-600" />}
                />
              )}
              {record.weight && (
                <DetailItem
                  label="Weight"
                  value={`${record.weight} kg`}
                  icon={<Weight className="h-4 w-4 text-teal-600" />}
                />
              )}
              {record.height && (
                <DetailItem
                  label="Height"
                  value={`${record.height} cm`}
                  icon={<Ruler className="h-4 w-4 text-emerald-600" />}
                />
              )}
              {record.muac && (
                <DetailItem
                  label="MUAC"
                  value={`${record.muac} cm`}
                  icon={<Ruler className="h-4 w-4 text-teal-600" />}
                />
              )}
              {record.wh && (
                <DetailItem
                  label="W/H Ratio"
                  value={`${record.wh}`}
                  icon={<Activity className="h-4 w-4 text-emerald-600" />}
                />
              )}
              {record.nutritionStatus && (
                <DetailItem
                  label="Nutrition Status"
                  value={record.nutritionStatus
                    .replace(/_/g, " ")
                    .toUpperCase()}
                  icon={<Heart className="h-4 w-4 text-teal-600" />}
                />
              )}
              {record.dmHptStatus && (
                <DetailItem
                  label="DM/HPT Status"
                  value={record.dmHptStatus}
                  icon={<Activity className="h-4 w-4 text-emerald-600" />}
                />
              )}
              {record.address && (
                <DetailItem
                  label="Address"
                  value={record.address}
                  className="md:col-span-2"
                  icon={<MapPin className="h-4 w-4 text-teal-600" />}
                />
              )}
              {record.nutritionRecommendation && (
                <DetailItem
                  label="Recommendation"
                  value={record.nutritionRecommendation}
                  className="md:col-span-2"
                  icon={<FileText className="h-4 w-4 text-emerald-600" />}
                />
              )}
              {record.remarks && (
                <DetailItem
                  label="Remarks"
                  value={record.remarks}
                  className="md:col-span-2"
                  icon={<FileText className="h-4 w-4 text-teal-600" />}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="border-emerald-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="pb-3 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <FileText className="h-5 w-5 text-emerald-600" />
              Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
            <DetailItem
              label="Recorded By"
              value={record.recordedBy.name}
              icon={<User className="h-4 w-4 text-emerald-600" />}
            />
            <DetailItem
              label="Created"
              value={new Date(record.createdAt).toLocaleString()}
              icon={<Calendar className="h-4 w-4 text-teal-600" />}
            />
            <DetailItem
              label="Updated"
              value={new Date(record.updatedAt).toLocaleString()}
              icon={<Calendar className="h-4 w-4 text-emerald-600" />}
            />
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent className="border-emerald-200">
            <DialogHeader>
              <DialogTitle className="text-emerald-900">
                Delete Record
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this record? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string | React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

function DetailItem({ label, value, className = "", icon }: DetailItemProps) {
  return (
    <div className={`${className} group`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm text-slate-600 font-medium">{label}</p>
      </div>
      <p className="text-slate-900 font-medium ml-6">{value}</p>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
}

function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {active ? "Yes" : "No"}
      </span>
    </div>
  );
}
