"use client";

import type React from "react";
import { useState } from "react";
import { ArrowLeft, FileText, Heart, Utensils, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreatePublicHealthRecordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("child-welfare");
  const router = useRouter();
  const [formData, setFormData] = useState({
    registrationNumber: "",
    childName: "",
    motherName: "",
    vaccinationGiven: "",
    lastDateOfVisit: "",
    followUpDate: "",
    name: "",
    diagnosis: "",
    dateOfDischarge: "",
    phoneNumber: "",
    chpZone: "",
    recordDate: "",
    feedback: "",
    homeVisit: false,
    physicalExamination: false,
    referralNote: false,
    bloodPressure: "",
    age: "",
    sex: "",
    weight: "",
    height: "",
    muac: "",
    wh: "",
    nutritionStatus: "",
    nutritionRecommendation: "",
    address: "",
    remarks: "",
    dmHptStatus: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        muac: formData.muac ? Number(formData.muac) : undefined,
        wh: formData.wh ? Number(formData.wh) : undefined,
      };

      const response = await fetch("/api/public-health-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create record");
      }

      setError("");
      toast.success("Record created successfully");
      router.push("/dashboard/public-health-records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "child-welfare", label: "Child Welfare", icon: Heart },
    { id: "link-care", label: "Link to Care", icon: FileText },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-emerald-100 rounded-lg transition-colors group">
              <ArrowLeft className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Create New Health Record
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Comprehensive patient health information system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 bg-white rounded-xl p-2 shadow-sm border border-emerald-100">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                    : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Child Welfare Clinic Section */}
          {activeTab === "child-welfare" && (
            <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="md:col-span-2 bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <Heart className="w-7 h-7" />
                  <div>
                    <h2 className="text-2xl font-bold">Child Welfare Clinic</h2>
                    <p className="text-emerald-100 text-sm">
                      Vaccination and growth monitoring records
                    </p>
                  </div>
                </div>
              </div>

              {[
                {
                  label: "Registration Number",
                  name: "registrationNumber",
                  type: "text",
                },
                { label: "Child Name", name: "childName", type: "text" },
                { label: "Mother Name", name: "motherName", type: "text" },
                {
                  label: "Vaccination Given",
                  name: "vaccinationGiven",
                  type: "text",
                },
                {
                  label: "Last Date of Visit",
                  name: "lastDateOfVisit",
                  type: "date",
                },
                { label: "Follow-up Date", name: "followUpDate", type: "date" },
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={String(
                      formData[field.name as keyof typeof formData] || ""
                    )}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    required
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Link to Care Section */}
          {activeTab === "link-care" && (
            <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="md:col-span-2 bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-7 h-7" />
                  <div>
                    <h2 className="text-2xl font-bold">Link to Care</h2>
                    <p className="text-emerald-100 text-sm">
                      Patient discharge and follow-up information
                    </p>
                  </div>
                </div>
              </div>

              {[
                { label: "Name", name: "name", type: "text" },
                { label: "Diagnosis", name: "diagnosis", type: "text" },
                {
                  label: "Date of Discharge",
                  name: "dateOfDischarge",
                  type: "date",
                },
                { label: "Phone Number", name: "phoneNumber", type: "text" },
                { label: "CHP Zone", name: "chpZone", type: "text" },
                { label: "Record Date", name: "recordDate", type: "date" },
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={String(
                      formData[field.name as keyof typeof formData] || ""
                    )}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    required
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Feedback
                </label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleInputChange}
                  placeholder="Enter feedback"
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Additional Tracking */}
              <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  Additional Tracking
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: "homeVisit", label: "Home Visit" },
                    {
                      name: "physicalExamination",
                      label: "Physical Examination",
                    },
                    { name: "referralNote", label: "Referral Note" },
                  ].map((check) => (
                    <label
                      key={check.name}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          formData[check.name as keyof typeof formData]
                        )}
                        onChange={(e) =>
                          handleCheckboxChange(check.name, e.target.checked)
                        }
                        className="w-5 h-5 rounded border-emerald-300 text-emerald-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {check.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    name="bloodPressure"
                    value={formData.bloodPressure}
                    onChange={handleInputChange}
                    placeholder="e.g., 120/80"
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nutrition Section */}
          {activeTab === "nutrition" && (
            <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="md:col-span-2 bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <Utensils className="w-7 h-7" />
                  <div>
                    <h2 className="text-2xl font-bold">Nutrition Assessment</h2>
                    <p className="text-emerald-100 text-sm">
                      Comprehensive nutritional status and recommendations
                    </p>
                  </div>
                </div>
              </div>

              {[
                { label: "Age", name: "age", type: "number" },
                { label: "Weight (kg)", name: "weight", type: "number" },
                { label: "Height (cm)", name: "height", type: "number" },
                { label: "MUAC (cm)", name: "muac", type: "number" },
                { label: "W/H Ratio", name: "wh", type: "number" },
                { label: "DM/HPT Status", name: "dmHptStatus", type: "text" },
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={String(
                      formData[field.name as keyof typeof formData] || ""
                    )}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    step={field.type === "number" ? "0.1" : undefined}
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Sex
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => handleSelectChange("sex", e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nutrition Status
                </label>
                <select
                  value={formData.nutritionStatus}
                  onChange={(e) =>
                    handleSelectChange("nutritionStatus", e.target.value)
                  }
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select status</option>
                  <option value="normal">Normal</option>
                  <option value="moderate_underweight">
                    Moderate Underweight
                  </option>
                  <option value="stunted">Stunted</option>
                  <option value="severe_underweight">Severe Underweight</option>
                  <option value="severe_stunted">Severe Stunted</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nutrition Recommendation
                </label>
                <textarea
                  name="nutritionRecommendation"
                  value={formData.nutritionRecommendation}
                  onChange={handleInputChange}
                  placeholder="Enter nutrition recommendations"
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Enter additional remarks"
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-8 border-t border-emerald-100">
            <button
              type="button"
              className="px-6 py-3 bg-white border border-emerald-200 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-linear-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {loading ? "Creating..." : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
