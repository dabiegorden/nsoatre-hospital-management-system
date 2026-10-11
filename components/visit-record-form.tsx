"use client";

import type React from "react";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Loader2 } from "lucide-react";

interface VisitRecordFormProps {
  pregnantWomanId: string;
  onSuccess?: () => void;
}

interface VisitFormData {
  gestationalAge: string;
  bloodPressure: string;
  hb: string;
  sfh: string;
  rbs: string;
  weight: string;
  urineProtein: string;
  complaint: string;
  visitDate: string;
}

const initialFormData: VisitFormData = {
  gestationalAge: "",
  bloodPressure: "",
  hb: "",
  sfh: "",
  rbs: "",
  weight: "",
  urineProtein: "",
  complaint: "",
  visitDate: new Date().toISOString().split("T")[0],
};

export default function VisitRecordForm({
  pregnantWomanId,
  onSuccess,
}: VisitRecordFormProps) {
  const [formData, setFormData] = useState<VisitFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.gestationalAge.trim()) {
      toast.error("Gestational age is required");
      return false;
    }
    const ga = Number(formData.gestationalAge);
    if (!Number.isFinite(ga) || ga < 0 || ga > 42) {
      toast.error("Please enter a valid gestational age (0-42 weeks)");
      return false;
    }

    if (!formData.bloodPressure.trim()) {
      toast.error("Blood pressure is required");
      return false;
    }

    if (!formData.weight.trim()) {
      toast.error("Weight is required");
      return false;
    }
    const weight = Number(formData.weight);
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
      toast.error("Please enter a valid weight (20-300 kg)");
      return false;
    }

    if (!formData.visitDate) {
      toast.error("Visit date is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const apiData = {
        gestationalAge: Number(formData.gestationalAge),
        bloodPressure: formData.bloodPressure,
        hb: formData.hb || "",
        sfh: formData.sfh || "",
        rbs: formData.rbs || "",
        weight: Number(formData.weight),
        urineProtein: formData.urineProtein || "",
        complaint: formData.complaint || "",
        visitDate: formData.visitDate,
      };

      const response = await fetch(
        `/api/pregnant-women/${pregnantWomanId}/visits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save visit record");
      }

      toast.success("Visit record created successfully!");
      setFormData(initialFormData);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save visit record"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-emerald-100 shadow-md overflow-hidden">
      <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Add Monthly Visit Record
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label
                htmlFor="visitDate"
                className="text-sm font-medium text-gray-700 flex items-center gap-1"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                Visit Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="visitDate"
                name="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={handleInputChange}
                required
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="gestationalAge"
                className="text-sm font-medium text-gray-700"
              >
                Gestational Age (weeks) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gestationalAge"
                name="gestationalAge"
                type="number"
                value={formData.gestationalAge}
                onChange={handleInputChange}
                placeholder="e.g., 24"
                required
                min="0"
                max="42"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="bloodPressure"
                className="text-sm font-medium text-gray-700"
              >
                Blood Pressure <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bloodPressure"
                name="bloodPressure"
                value={formData.bloodPressure}
                onChange={handleInputChange}
                placeholder="e.g., 120/80"
                required
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="weight"
                className="text-sm font-medium text-gray-700"
              >
                Weight (kg) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="e.g., 65.5"
                required
                min="20"
                max="300"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hb" className="text-sm font-medium text-gray-700">
                Hb (Hemoglobin)
              </Label>
              <Input
                id="hb"
                name="hb"
                value={formData.hb}
                onChange={handleInputChange}
                placeholder="e.g., 11.5 g/dL"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="sfh"
                className="text-sm font-medium text-gray-700"
              >
                SFH (Symphysis-Fundus Height)
              </Label>
              <Input
                id="sfh"
                name="sfh"
                value={formData.sfh}
                onChange={handleInputChange}
                placeholder="e.g., 24 cm"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rbs"
                className="text-sm font-medium text-gray-700"
              >
                RBS (Random Blood Sugar)
              </Label>
              <Input
                id="rbs"
                name="rbs"
                value={formData.rbs}
                onChange={handleInputChange}
                placeholder="e.g., 95 mg/dL"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="urineProtein"
                className="text-sm font-medium text-gray-700"
              >
                Urine Protein
              </Label>
              <Input
                id="urineProtein"
                name="urineProtein"
                value={formData.urineProtein}
                onChange={handleInputChange}
                placeholder="e.g., Negative, Trace, 1+, 2+, 3+, 4+"
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label
              htmlFor="complaint"
              className="text-sm font-medium text-gray-700"
            >
              Patient Complaint / Notes
            </Label>
            <Textarea
              id="complaint"
              name="complaint"
              value={formData.complaint}
              onChange={handleTextareaChange}
              placeholder="Document any complaints or additional notes from this visit..."
              rows={4}
              className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Visit Record
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
