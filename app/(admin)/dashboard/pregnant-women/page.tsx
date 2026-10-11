"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Phone,
  MapPin,
  User,
  Activity,
  FileText,
  X,
  Eye,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useRouter } from "next/navigation";

interface PregnantWoman {
  _id: string;
  fullName: string;
  residentialAddress: string;
  location: string;
  phoneNumber: string;
  age: number;
  parity: string;
  bloodPressure: string;
  height: number;
  weight: number;
  gestationalAge: number;
  expectedDeliveryDate: string;
  folderNumber: string;
  maritalStatus: string;
  urineProtein: string;
  hb: string;
  rbs: string;
  sfh: string;
  folicAcidSupplements: boolean;
  ironSupplements: boolean;
  hbsAgResult: "positive" | "negative" | "pending";
  g6pdStatus: "normal" | "deficient" | "pending";
  bloodGroup: "A" | "B" | "AB" | "O";
  rhFactor: "positive" | "negative";
  sicklingStatus: "positive" | "negative" | "pending";
  itnDistributed: boolean;
  itnDistributionDate?: string;
  syphilisScreeningStatus: "positive" | "negative" | "pending";
  syphilisTreatment: boolean;
  knownHivPositiveBeforePregnancy: boolean;
  artTreatmentBeforePregnancy: boolean;
  hivStatusAtRegistration: "positive" | "negative" | "pending";
  artTreatmentAfterRegistration: boolean;
  hivRetestAt34Weeks: "positive" | "negative" | "pending" | "not_done";
  artTreatmentAfterRetest: boolean;
  tbScreeningCoughOver2Weeks: boolean;
  tbStatus: "positive" | "negative" | "pending";
  tbTreatment: boolean;
  registeredBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  fullName: string;
  residentialAddress: string;
  phoneNumber: string;
  age: string;
  parity: string;
  bloodPressure: string;
  height: string;
  weight: string;
  gestationalAge: string;
  expectedDeliveryDate: string;
  folderNumber: string;
  maritalStatus: string;
  location: string;
  urineProtein: string;
  hb: string;
  rbs: string;
  sfh: string;
  folicAcidSupplements: boolean;
  ironSupplements: boolean;
  hbsAgResult: string;
  g6pdStatus: string;
  bloodGroup: string;
  rhFactor: string;
  sicklingStatus: string;
  itnDistributed: boolean;
  itnDistributionDate: string;
  syphilisScreeningStatus: string;
  syphilisTreatment: boolean;
  knownHivPositiveBeforePregnancy: boolean;
  artTreatmentBeforePregnancy: boolean;
  hivStatusAtRegistration: string;
  artTreatmentAfterRegistration: boolean;
  hivRetestAt34Weeks: string;
  artTreatmentAfterRetest: boolean;
  tbScreeningCoughOver2Weeks: boolean;
  tbStatus: string;
  tbTreatment: boolean;
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const initialFormData: FormData = {
  fullName: "",
  residentialAddress: "",
  phoneNumber: "",
  age: "",
  parity: "",
  bloodPressure: "",
  height: "",
  weight: "",
  gestationalAge: "",
  expectedDeliveryDate: "",
  folderNumber: "",
  maritalStatus: "single",
  location: "",
  urineProtein: "",
  hb: "",
  rbs: "",
  sfh: "",
  folicAcidSupplements: false,
  ironSupplements: false,
  hbsAgResult: "pending",
  g6pdStatus: "pending",
  bloodGroup: "",
  rhFactor: "",
  sicklingStatus: "pending",
  itnDistributed: false,
  itnDistributionDate: "",
  syphilisScreeningStatus: "pending",
  syphilisTreatment: false,
  knownHivPositiveBeforePregnancy: false,
  artTreatmentBeforePregnancy: false,
  hivStatusAtRegistration: "pending",
  artTreatmentAfterRegistration: false,
  hivRetestAt34Weeks: "not_done",
  artTreatmentAfterRetest: false,
  tbScreeningCoughOver2Weeks: false,
  tbStatus: "pending",
  tbTreatment: false,
};

export default function PregnantWomenPage() {
  const [women, setWomen] = useState<PregnantWoman[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const fetchWomen = async (page = 1, search = "") => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/pregnant-women?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid server response. Please try again.");
      }

      if (!response.ok || data.success === false) {
        const type = data.type || "UNKNOWN_ERROR";
        const message = data.message || "Failed to fetch records";

        switch (type) {
          case "AUTH_ERROR":
            toast.error("Authentication failed. Please log in again.");
            break;
          case "DB_ERROR":
            toast.error("Database error: " + message);
            break;
          case "VALIDATION_ERROR":
            if (data.details && typeof data.details === "object") {
              Object.entries(data.details).forEach(([field, msg]) => {
                toast.error(`${field}: ${String(msg)}`);
              });
            } else {
              toast.error(message);
            }
            break;
          case "DUPLICATE_ERROR":
            toast.error("Duplicate record detected: " + message);
            break;
          case "SERVER_ERROR":
            toast.error("Server error: " + message);
            break;
          default:
            toast.error(message);
        }

        return;
      }

      setWomen(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error: any) {
      if (error.name === "AbortError") return;

      if (error.message === "Failed to fetch") {
        toast.error("Network error — please check your connection.");
      } else {
        toast.error(error.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWomen(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!formData.residentialAddress.trim()) {
      toast.error("Residential address is required");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!/^\+233\d{9}$/.test(formData.phoneNumber)) {
      toast.error("Enter a valid Ghana phone number (e.g., +233241234567)");
      return false;
    }

    if (!formData.folderNumber.trim()) {
      toast.error("Folder number is required");
      return false;
    }
    const age = Number(formData.age);
    if (!Number.isFinite(age) || age < 10 || age > 60) {
      toast.error("Please enter a valid age (10-60)");
      return false;
    }
    if (!formData.parity.trim()) {
      toast.error("Parity is required");
      return false;
    }
    if (!formData.bloodPressure.trim()) {
      toast.error("Blood pressure is required");
      return false;
    }
    const height = Number(formData.height);
    if (!Number.isFinite(height) || height < 50 || height > 250) {
      toast.error("Please enter a valid height (50-250 cm)");
      return false;
    }
    const weight = Number(formData.weight);
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
      toast.error("Please enter a valid weight (20-300 kg)");
      return false;
    }
    const ga = Number(formData.gestationalAge);
    if (!Number.isFinite(ga) || ga < 0 || ga > 42) {
      toast.error("Please enter a valid gestational age (0-42 weeks)");
      return false;
    }
    if (!formData.expectedDeliveryDate) {
      toast.error("Expected delivery date is required");
      return false;
    }
    if (!formData.bloodGroup) {
      toast.error("Blood group is required");
      return false;
    }
    if (!formData.rhFactor) {
      toast.error("Rh factor is required");
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
        fullName: formData.fullName,
        residentialAddress: formData.residentialAddress,
        phoneNumber: formData.phoneNumber,
        age: Number.parseInt(formData.age),
        parity: formData.parity,
        bloodPressure: formData.bloodPressure,
        height: Number.parseFloat(formData.height),
        weight: Number.parseFloat(formData.weight),
        gestationalAge: Number.parseInt(formData.gestationalAge),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        folderNumber: formData.folderNumber,
        maritalStatus: formData.maritalStatus,
        location: formData.location,
        urineProtein: formData.urineProtein,
        hb: formData.hb,
        rbs: formData.rbs,
        sfh: formData.sfh,
        folicAcidSupplements: formData.folicAcidSupplements,
        ironSupplements: formData.ironSupplements,
        hbsAgResult: formData.hbsAgResult,
        g6pdStatus: formData.g6pdStatus,
        bloodGroup: formData.bloodGroup,
        rhFactor: formData.rhFactor,
        sicklingStatus: formData.sicklingStatus,
        itnDistributed: formData.itnDistributed,
        itnDistributionDate: formData.itnDistributionDate || undefined,
        syphilisScreeningStatus: formData.syphilisScreeningStatus,
        syphilisTreatment: formData.syphilisTreatment,
        knownHivPositiveBeforePregnancy:
          formData.knownHivPositiveBeforePregnancy,
        artTreatmentBeforePregnancy: formData.artTreatmentBeforePregnancy,
        hivStatusAtRegistration: formData.hivStatusAtRegistration,
        artTreatmentAfterRegistration: formData.artTreatmentAfterRegistration,
        hivRetestAt34Weeks: formData.hivRetestAt34Weeks,
        artTreatmentAfterRetest: formData.artTreatmentAfterRetest,
        tbScreeningCoughOver2Weeks: formData.tbScreeningCoughOver2Weeks,
        tbStatus: formData.tbStatus,
        tbTreatment: formData.tbTreatment,
      };

      const url = editingId
        ? `/api/pregnant-women/${editingId}`
        : "/api/pregnant-women";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save record");
      }

      toast.success(
        editingId
          ? "Record updated successfully!"
          : "Record created successfully!"
      );
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
      setCurrentPage(1);
      fetchWomen(1, searchTerm);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save record"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toInputDate = (d?: string) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const tz = dt.getTimezoneOffset();
    const local = new Date(dt.getTime() - tz * 60000);
    return local.toISOString().split("T")[0];
  };

  const handleEdit = (woman: PregnantWoman) => {
    setEditingId(woman._id);
    setFormData({
      fullName: woman.fullName,
      residentialAddress: woman.residentialAddress,
      phoneNumber: woman.phoneNumber,
      age: woman.age.toString(),
      parity: woman.parity,
      bloodPressure: woman.bloodPressure,
      height: woman.height.toString(),
      weight: woman.weight.toString(),
      gestationalAge: woman.gestationalAge.toString(),
      expectedDeliveryDate: toInputDate(woman.expectedDeliveryDate),
      folderNumber: woman.folderNumber,
      maritalStatus: woman.maritalStatus,
      location: woman.location || "",
      urineProtein: woman.urineProtein || "",
      hb: woman.hb || "",
      rbs: woman.rbs || "",
      sfh: woman.sfh || "",
      folicAcidSupplements: woman.folicAcidSupplements,
      ironSupplements: woman.ironSupplements,
      hbsAgResult: woman.hbsAgResult,
      g6pdStatus: woman.g6pdStatus,
      bloodGroup: woman.bloodGroup,
      rhFactor: woman.rhFactor,
      sicklingStatus: woman.sicklingStatus,
      itnDistributed: woman.itnDistributed,
      itnDistributionDate: toInputDate(woman.itnDistributionDate),
      syphilisScreeningStatus: woman.syphilisScreeningStatus,
      syphilisTreatment: woman.syphilisTreatment,
      knownHivPositiveBeforePregnancy: woman.knownHivPositiveBeforePregnancy,
      artTreatmentBeforePregnancy: woman.artTreatmentBeforePregnancy,
      hivStatusAtRegistration: woman.hivStatusAtRegistration,
      artTreatmentAfterRegistration: woman.artTreatmentAfterRegistration,
      hivRetestAt34Weeks: woman.hivRetestAt34Weeks,
      artTreatmentAfterRetest: woman.artTreatmentAfterRetest,
      tbScreeningCoughOver2Weeks: woman.tbScreeningCoughOver2Weeks,
      tbStatus: woman.tbStatus,
      tbTreatment: woman.tbTreatment,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/pregnant-women/${deletingId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete record");
      }

      toast.success("Record deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      setCurrentPage(1);
      fetchWomen(1, searchTerm);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete record"
      );
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
  };

  const paginatedWomen = women;
  const totalPages = pagination.totalPages;

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/pregnant-women/${id}`);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setCurrentPage(1);
      setSearchTerm(inputValue);
    }
  };

  const handleClearSearch = () => {
    setInputValue("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                  <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                    Pregnant Women Records
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-0.5">
                    Manage and track Antenatal health records
                  </p>
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setFormData(initialFormData);
                  }}
                  size="lg"
                  className="w-full sm:w-auto bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Record
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
                <div className="sticky top-0 z-10 bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-5 rounded-t-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                      {editingId ? (
                        <>
                          <Pencil className="w-6 h-6" />
                          Edit Record
                        </>
                      ) : (
                        <>
                          <Plus className="w-6 h-6" />
                          Add New Record
                        </>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-emerald-50">
                      {editingId
                        ? "Update the pregnant woman's health record"
                        : "Fill in the details to create a new health record"}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-600" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="fullName"
                          className="text-sm font-medium text-gray-700 flex items-center gap-1"
                        >
                          <User className="w-4 h-4 text-emerald-600" />
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                          required
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="folderNumber"
                          className="text-sm font-medium text-gray-700 flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          Folder Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="folderNumber"
                          name="folderNumber"
                          value={formData.folderNumber}
                          onChange={handleInputChange}
                          placeholder="e.g., PREG-2024-001"
                          required
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="residentialAddress"
                          className="text-sm font-medium text-gray-700 flex items-center gap-1"
                        >
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          Residential Address{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="residentialAddress"
                          name="residentialAddress"
                          value={formData.residentialAddress}
                          onChange={handleInputChange}
                          placeholder="Enter residential address"
                          required
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="location"
                          className="text-sm font-medium text-gray-700"
                        >
                          Location
                        </Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="e.g., District/Region"
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="maritalStatus"
                          className="text-sm font-medium text-gray-700"
                        >
                          Marital Status <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.maritalStatus}
                          onValueChange={(value) =>
                            handleSelectChange("maritalStatus", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center border rounded-md overflow-hidden">
                        <span className="px-3 bg-gray-100 border-r font-medium text-gray-600">
                          +233
                        </span>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber.replace("+233", "")}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 9); // Only 9 digits allowed
                            setFormData((prev) => ({
                              ...prev,
                              phoneNumber: `+233${value}`,
                            }));
                          }}
                          placeholder="24 123 4567"
                          className="flex-1 p-2 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="age"
                          className="text-sm font-medium text-gray-700"
                        >
                          Age (years) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          value={formData.age}
                          onChange={handleInputChange}
                          placeholder="Enter age"
                          min="10"
                          max="60"
                          required
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Vital Signs & Measurements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="parity"
                          className="text-sm font-medium text-gray-700"
                        >
                          Parity <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="parity"
                          name="parity"
                          value={formData.parity}
                          onChange={handleInputChange}
                          placeholder="e.g., G3P2"
                          required
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
                          htmlFor="height"
                          className="text-sm font-medium text-gray-700"
                        >
                          Height (cm) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="height"
                          name="height"
                          type="number"
                          step="0.1"
                          value={formData.height}
                          onChange={handleInputChange}
                          placeholder="e.g., 165.5"
                          required
                          min="50"
                          max="250"
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
                        <Label
                          htmlFor="gestationalAge"
                          className="text-sm font-medium text-gray-700"
                        >
                          Gestational Age (weeks){" "}
                          <span className="text-red-500">*</span>
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
                          htmlFor="expectedDeliveryDate"
                          className="text-sm font-medium text-gray-700 flex items-center gap-1"
                        >
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          Expected Delivery Date{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="expectedDeliveryDate"
                          name="expectedDeliveryDate"
                          type="date"
                          value={formData.expectedDeliveryDate}
                          onChange={handleInputChange}
                          required
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Additional Health Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-2">
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
                          placeholder="e.g., Negative, Trace, 1+"
                          className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="hb"
                          className="text-sm font-medium text-gray-700"
                        >
                          Hemoglobin (Hb)
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
                          htmlFor="rbs"
                          className="text-sm font-medium text-gray-700"
                        >
                          Random Blood Sugar (RBS)
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

                      <div className="space-y-2">
                        <Label
                          htmlFor="sfh"
                          className="text-sm font-medium text-gray-700"
                        >
                          Symphysis-Fundus Height (SFH)
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
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Laboratory Test Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="hbsAgResult"
                          className="text-sm font-medium text-gray-700"
                        >
                          HBsAg Result
                        </Label>
                        <Select
                          value={formData.hbsAgResult}
                          onValueChange={(value) =>
                            handleSelectChange("hbsAgResult", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="g6pdStatus"
                          className="text-sm font-medium text-gray-700"
                        >
                          G6PD Status
                        </Label>
                        <Select
                          value={formData.g6pdStatus}
                          onValueChange={(value) =>
                            handleSelectChange("g6pdStatus", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="deficient">Deficient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="bloodGroup"
                          className="text-sm font-medium text-gray-700"
                        >
                          Blood Group <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.bloodGroup}
                          onValueChange={(value) =>
                            handleSelectChange("bloodGroup", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="AB">AB</SelectItem>
                            <SelectItem value="O">O</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="rhFactor"
                          className="text-sm font-medium text-gray-700"
                        >
                          Rh Factor <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.rhFactor}
                          onValueChange={(value) =>
                            handleSelectChange("rhFactor", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue placeholder="Select Rh factor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="positive">
                              Positive (+)
                            </SelectItem>
                            <SelectItem value="negative">
                              Negative (-)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="sicklingStatus"
                          className="text-sm font-medium text-gray-700"
                        >
                          Sickling Status
                        </Label>
                        <Select
                          value={formData.sicklingStatus}
                          onValueChange={(value) =>
                            handleSelectChange("sicklingStatus", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="syphilisScreeningStatus"
                          className="text-sm font-medium text-gray-700"
                        >
                          Syphilis Screening
                        </Label>
                        <Select
                          value={formData.syphilisScreeningStatus}
                          onValueChange={(value) =>
                            handleSelectChange("syphilisScreeningStatus", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="tbStatus"
                          className="text-sm font-medium text-gray-700"
                        >
                          TB Status
                        </Label>
                        <Select
                          value={formData.tbStatus}
                          onValueChange={(value) =>
                            handleSelectChange("tbStatus", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900">
                        HIV Status & ART Treatment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="knownHivPositiveBeforePregnancy"
                            checked={formData.knownHivPositiveBeforePregnancy}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "knownHivPositiveBeforePregnancy",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="knownHivPositiveBeforePregnancy"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            Known HIV+ Before Pregnancy
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="artTreatmentBeforePregnancy"
                            checked={formData.artTreatmentBeforePregnancy}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "artTreatmentBeforePregnancy",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="artTreatmentBeforePregnancy"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            ART Treatment Before Pregnancy
                          </Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label
                            htmlFor="hivStatusAtRegistration"
                            className="text-sm font-medium text-gray-700"
                          >
                            HIV Status at Registration
                          </Label>
                          <Select
                            value={formData.hivStatusAtRegistration}
                            onValueChange={(value) =>
                              handleSelectChange(
                                "hivStatusAtRegistration",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="negative">Negative</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2 pt-7">
                          <Checkbox
                            id="artTreatmentAfterRegistration"
                            checked={formData.artTreatmentAfterRegistration}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "artTreatmentAfterRegistration",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="artTreatmentAfterRegistration"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            ART Treatment After Registration
                          </Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label
                            htmlFor="hivRetestAt34Weeks"
                            className="text-sm font-medium text-gray-700"
                          >
                            HIV Retest at 34 Weeks
                          </Label>
                          <Select
                            value={formData.hivRetestAt34Weeks}
                            onValueChange={(value) =>
                              handleSelectChange("hivRetestAt34Weeks", value)
                            }
                          >
                            <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_done">Not Done</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="negative">Negative</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2 pt-7">
                          <Checkbox
                            id="artTreatmentAfterRetest"
                            checked={formData.artTreatmentAfterRetest}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "artTreatmentAfterRetest",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="artTreatmentAfterRetest"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            ART Treatment After Retest
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900">
                        TB Screening & Treatment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tbScreeningCoughOver2Weeks"
                          checked={formData.tbScreeningCoughOver2Weeks}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              "tbScreeningCoughOver2Weeks",
                              checked as boolean
                            )
                          }
                        />
                        <Label
                          htmlFor="tbScreeningCoughOver2Weeks"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Cough Over 2 Weeks
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tbTreatment"
                          checked={formData.tbTreatment}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              "tbTreatment",
                              checked as boolean
                            )
                          }
                        />
                        <Label
                          htmlFor="tbTreatment"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          TB Treatment
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-emerald-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-lg font-semibold text-emerald-900">
                        Supplements & Interventions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="folicAcidSupplements"
                            checked={formData.folicAcidSupplements}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "folicAcidSupplements",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="folicAcidSupplements"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            Folic Acid Supplements
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ironSupplements"
                            checked={formData.ironSupplements}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "ironSupplements",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="ironSupplements"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            Iron Supplements
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="itnDistributed"
                            checked={formData.itnDistributed}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "itnDistributed",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="itnDistributed"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            ITN Distributed
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="syphilisTreatment"
                            checked={formData.syphilisTreatment}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "syphilisTreatment",
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor="syphilisTreatment"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            Syphilis Treatment
                          </Label>
                        </div>
                      </div>

                      {formData.itnDistributed && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="itnDistributionDate"
                            className="text-sm font-medium text-gray-700"
                          >
                            ITN Distribution Date
                          </Label>
                          <Input
                            id="itnDistributionDate"
                            name="itnDistributionDate"
                            type="date"
                            value={formData.itnDistributionDate}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Form Actions */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 sticky bottom-0 bg-white py-4 border-t border-gray-200 -mx-6 px-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting
                        ? "Saving..."
                        : editingId
                          ? "Update Record"
                          : "Create Record"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-2 border-emerald-100 shadow-md mb-6">
          <CardContent className="p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-600 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, address or phone number... (Press Enter to search)"
                value={inputValue}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-12 pr-4 h-12 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-base"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="border-2 border-emerald-100 shadow-md overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 sm:py-20">
                <Loader2 className="w-14 h-14 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">
                  Loading records...
                </p>
                <p className="text-gray-400 text-sm mt-1">Please wait</p>
              </div>
            ) : paginatedWomen.length === 0 ? (
              <div className="text-center py-16 sm:py-20 px-4">
                <div className="w-20 h-20 bg-linear-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-10 h-10 text-emerald-600" />
                </div>
                <p className="text-gray-700 text-xl font-semibold mb-2">
                  No records found
                </p>
                <p className="text-gray-500 text-base">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Click 'Add New Record' to create your first entry"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-linear-to-r from-emerald-50 to-teal-50 hover:from-emerald-50 hover:to-teal-50 border-b-2 border-emerald-100">
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Name
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Folder #
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Phone
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Age
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Marital Status
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Gest. Age
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Blood Group
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedWomen.map((woman, index) => (
                        <TableRow
                          key={woman._id}
                          className={`hover:bg-emerald-50/50 transition-colors border-b border-gray-100 cursor-pointer ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                          onClick={() => handleViewDetails(woman._id)}
                        >
                          <TableCell className="font-medium py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-gray-900">
                                {woman.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
                              {woman.folderNumber}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-gray-700">
                                {woman.phoneNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-gray-700">
                              {woman.age} years
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-medium capitalize">
                              {woman.maritalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-gray-700">
                              {woman.gestationalAge}w
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-medium">
                              {woman.bloodGroup}
                              {woman.rhFactor === "positive" ? "+" : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-right py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(woman._id)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/pregnant-women/past-records?id=${woman._id}`
                                  )
                                }
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(woman)}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDeleteDialog(woman._id)}
                                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {paginatedWomen.map((woman) => (
                    <div
                      key={woman._id}
                      className="p-4 hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <User className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 wrap-break-word">
                                {woman.fullName}
                              </p>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium text-xs mt-1">
                                {woman.folderNumber}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Age
                            </p>
                            <p className="text-gray-900 font-medium">
                              {woman.age} years
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Marital Status
                            </p>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-medium text-xs capitalize">
                              {woman.maritalStatus}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Blood Group
                            </p>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-medium text-xs">
                              {woman.bloodGroup}
                              {woman.rhFactor === "positive" ? "+" : "-"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Gest. Age
                            </p>
                            <p className="text-gray-900 font-medium">
                              {woman.gestationalAge}w
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-emerald-600" />
                            <span className="text-gray-700">
                              {woman.phoneNumber}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(woman._id)}
                            className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/dashboard/pregnant-women/past-records?id=${woman._id}`
                              )
                            }
                            className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <History className="w-3 h-3 mr-1" />
                            History
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(woman)}
                            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(woman._id)}
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t-2 border-gray-100 space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Showing{" "}
                    <span className="font-semibold text-emerald-700">
                      {(currentPage - 1) * pagination.limit + 1}-
                      {Math.min(
                        currentPage * pagination.limit,
                        pagination.total
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-emerald-700">
                      {pagination.total}
                    </span>{" "}
                    records
                  </p>

                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1)
                                setCurrentPage(currentPage - 1);
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {currentPage > 2 && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(1);
                              }}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {currentPage > 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(currentPage - 1);
                              }}
                              className="cursor-pointer"
                            >
                              {currentPage - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive
                            className="cursor-default"
                          >
                            {currentPage}
                          </PaginationLink>
                        </PaginationItem>

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(currentPage + 1);
                              }}
                              className="cursor-pointer"
                            >
                              {currentPage + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {currentPage < totalPages - 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {currentPage < totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(totalPages);
                              }}
                              className="cursor-pointer"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages)
                                setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <span>Delete Record?</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-gray-600 pt-2">
                This action cannot be undone. This will permanently delete the
                pregnant woman's health record from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-500/25"
              >
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
