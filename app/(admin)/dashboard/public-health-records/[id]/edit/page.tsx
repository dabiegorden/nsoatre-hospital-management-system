"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Heart,
  Activity,
  Weight,
  FileText,
  Edit,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
}

export default function EditPublicHealthRecordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<PublicHealthRecord | null>(null);

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
      const data = result.data;
      setFormData({
        ...data,
        lastDateOfVisit: new Date(data.lastDateOfVisit)
          .toISOString()
          .split("T")[0],
        followUpDate: new Date(data.followUpDate).toISOString().split("T")[0],
        dateOfDischarge: new Date(data.dateOfDischarge)
          .toISOString()
          .split("T")[0],
        recordDate: new Date(data.recordDate).toISOString().split("T")[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return;
    const { name, value, type } = e.target;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : value,
          }
        : null
    );
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [name]: checked } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        registrationNumber: formData.registrationNumber,
        childName: formData.childName,
        motherName: formData.motherName,
        vaccinationGiven: formData.vaccinationGiven,
        lastDateOfVisit: formData.lastDateOfVisit,
        followUpDate: formData.followUpDate,
        name: formData.name,
        diagnosis: formData.diagnosis,
        dateOfDischarge: formData.dateOfDischarge,
        phoneNumber: formData.phoneNumber,
        chpZone: formData.chpZone,
        recordDate: formData.recordDate,
        feedback: formData.feedback,
        homeVisit: formData.homeVisit,
        physicalExamination: formData.physicalExamination,
        referralNote: formData.referralNote,
        bloodPressure: formData.bloodPressure,
        age: formData.age ? Number(formData.age) : undefined,
        sex: formData.sex,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        muac: formData.muac ? Number(formData.muac) : undefined,
        wh: formData.wh ? Number(formData.wh) : undefined,
        nutritionStatus: formData.nutritionStatus,
        nutritionRecommendation: formData.nutritionRecommendation,
        address: formData.address,
        remarks: formData.remarks,
        dmHptStatus: formData.dmHptStatus,
      };

      const response = await fetch(`/api/public-health-records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update record");
      }

      toast.success("Record updated successfully");

      router.push(`/dashboard/public-health-records`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
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

  if (!formData) {
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
            <Link href={`/dashboard/public-health-records/${id}`}>
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
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Edit Record
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Update public health record details
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid gap-6">
          {/* Child Welfare Clinic Section */}
          <Card className="border-emerald-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
                <Heart className="h-5 w-5 text-emerald-600" />
                Child Welfare Clinic
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
              <div className="space-y-2">
                <Label
                  htmlFor="registrationNumber"
                  className="text-slate-700 font-medium"
                >
                  Registration Number
                </Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleInputChange}
                  disabled
                  className="bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="childName"
                  className="text-slate-700 font-medium"
                >
                  Child Name
                </Label>
                <Input
                  id="childName"
                  name="childName"
                  value={formData.childName}
                  onChange={handleInputChange}
                  required
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="motherName"
                  className="text-slate-700 font-medium"
                >
                  Mother Name
                </Label>
                <Input
                  id="motherName"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleInputChange}
                  required
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="vaccinationGiven"
                  className="text-slate-700 font-medium"
                >
                  Vaccination Given
                </Label>
                <Input
                  id="vaccinationGiven"
                  name="vaccinationGiven"
                  value={formData.vaccinationGiven}
                  onChange={handleInputChange}
                  required
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="lastDateOfVisit"
                  className="text-slate-700 font-medium"
                >
                  Last Date of Visit
                </Label>
                <Input
                  id="lastDateOfVisit"
                  name="lastDateOfVisit"
                  type="date"
                  value={formData.lastDateOfVisit}
                  onChange={handleInputChange}
                  required
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="followUpDate"
                  className="text-slate-700 font-medium"
                >
                  Follow-up Date
                </Label>
                <Input
                  id="followUpDate"
                  name="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={handleInputChange}
                  required
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Link to Care Section */}
          <Card className="border-teal-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-linear-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
              <CardTitle className="text-lg flex items-center gap-2 text-teal-900">
                <Activity className="h-5 w-5 text-teal-600" />
                Link to Care
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="diagnosis"
                  className="text-slate-700 font-medium"
                >
                  Diagnosis
                </Label>
                <Input
                  id="diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="dateOfDischarge"
                  className="text-slate-700 font-medium"
                >
                  Date of Discharge
                </Label>
                <Input
                  id="dateOfDischarge"
                  name="dateOfDischarge"
                  type="date"
                  value={formData.dateOfDischarge}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="phoneNumber"
                  className="text-slate-700 font-medium"
                >
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chpZone" className="text-slate-700 font-medium">
                  CHP Zone
                </Label>
                <Input
                  id="chpZone"
                  name="chpZone"
                  value={formData.chpZone}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="recordDate"
                  className="text-slate-700 font-medium"
                >
                  Record Date
                </Label>
                <Input
                  id="recordDate"
                  name="recordDate"
                  type="date"
                  value={formData.recordDate}
                  onChange={handleInputChange}
                  required
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label
                  htmlFor="feedback"
                  className="text-slate-700 font-medium"
                >
                  Feedback
                </Label>
                <Textarea
                  id="feedback"
                  name="feedback"
                  value={formData.feedback || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Tracking Section */}
          <Card className="border-emerald-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
                <Activity className="h-5 w-5 text-emerald-600" />
                Additional Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/30">
                <Checkbox
                  id="homeVisit"
                  checked={formData.homeVisit}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("homeVisit", checked as boolean)
                  }
                  className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                />
                <Label
                  htmlFor="homeVisit"
                  className="font-medium cursor-pointer text-slate-700"
                >
                  Home Visit
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-teal-200 bg-teal-50/30">
                <Checkbox
                  id="physicalExamination"
                  checked={formData.physicalExamination}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(
                      "physicalExamination",
                      checked as boolean
                    )
                  }
                  className="border-teal-400 data-[state=checked]:bg-teal-600"
                />
                <Label
                  htmlFor="physicalExamination"
                  className="font-medium cursor-pointer text-slate-700"
                >
                  Physical Examination
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/30">
                <Checkbox
                  id="referralNote"
                  checked={formData.referralNote}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("referralNote", checked as boolean)
                  }
                  className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                />
                <Label
                  htmlFor="referralNote"
                  className="font-medium cursor-pointer text-slate-700"
                >
                  Referral Note
                </Label>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="bloodPressure"
                  className="text-slate-700 font-medium"
                >
                  Blood Pressure
                </Label>
                <Input
                  id="bloodPressure"
                  name="bloodPressure"
                  value={formData.bloodPressure || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., 120/80"
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Section */}
          <Card className="border-teal-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-linear-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
              <CardTitle className="text-lg flex items-center gap-2 text-teal-900">
                <Weight className="h-5 w-5 text-teal-600" />
                Nutrition
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-slate-700 font-medium">
                  Age
                </Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age || ""}
                  onChange={handleInputChange}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex" className="text-slate-700 font-medium">
                  Sex
                </Label>
                <Select
                  value={formData.sex || "none"}
                  onValueChange={(value) => handleSelectChange("sex", value)}
                >
                  <SelectTrigger className="border-teal-200 focus:border-teal-400 focus:ring-teal-400">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-slate-700 font-medium">
                  Weight (kg)
                </Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight || ""}
                  onChange={handleInputChange}
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-slate-700 font-medium">
                  Height (cm)
                </Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  step="0.1"
                  value={formData.height || ""}
                  onChange={handleInputChange}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="muac" className="text-slate-700 font-medium">
                  MUAC (cm)
                </Label>
                <Input
                  id="muac"
                  name="muac"
                  type="number"
                  step="0.1"
                  value={formData.muac || ""}
                  onChange={handleInputChange}
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh" className="text-slate-700 font-medium">
                  W/H Ratio
                </Label>
                <Input
                  id="wh"
                  name="wh"
                  type="number"
                  step="0.1"
                  value={formData.wh || ""}
                  onChange={handleInputChange}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="nutritionStatus"
                  className="text-slate-700 font-medium"
                >
                  Nutrition Status
                </Label>
                <Select
                  value={formData.nutritionStatus || "none"}
                  onValueChange={(value) =>
                    handleSelectChange("nutritionStatus", value)
                  }
                >
                  <SelectTrigger className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="moderate_underweight">
                      Moderate Underweight
                    </SelectItem>
                    <SelectItem value="stunted">Stunted</SelectItem>
                    <SelectItem value="severe_underweight">
                      Severe Underweight
                    </SelectItem>
                    <SelectItem value="severe_stunted">
                      Severe Stunted
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="dmHptStatus"
                  className="text-slate-700 font-medium"
                >
                  DM/HPT Status
                </Label>
                <Input
                  id="dmHptStatus"
                  name="dmHptStatus"
                  value={formData.dmHptStatus || ""}
                  onChange={handleInputChange}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address" className="text-slate-700 font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleInputChange}
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label
                  htmlFor="nutritionRecommendation"
                  className="text-slate-700 font-medium"
                >
                  Nutrition Recommendation
                </Label>
                <Textarea
                  id="nutritionRecommendation"
                  name="nutritionRecommendation"
                  value={formData.nutritionRecommendation || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="border-teal-200 focus:border-teal-400 focus:ring-teal-400"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="remarks" className="text-slate-700 font-medium">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
            <Link href={`/dashboard/public-health-records/${id}`}>
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
            >
              {submitting ? "Updating..." : "Update Record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
