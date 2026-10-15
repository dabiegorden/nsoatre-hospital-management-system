"use client";

import type React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Phone,
  Calendar,
  Loader2,
  History,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/date-formatter";
import { AppointmentReminderButtons } from "@/components/appointment-reminder-buttons";
import { useDebounce } from "@/hooks/use-debounce";
import { isAbortError, errorMessage } from "@/lib/utils";

interface Appointment {
  _id: string;
  patientName: string;
  patientPhoneNumber: string;
  relativePhoneNumber?: string;
  appointmentLocation: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentDateTime: string;
  status: "scheduled" | "completed" | "missed" | "cancelled" | "rescheduled";
  patient: {
    _id: string;
    fullName: string;
    age: number;
    phoneNumber: string;
  } | null;
  createdBy: {
    name: string;
    email: string;
  };
  notes?: string;
  voiceCallAttempts: number;
  missedNotificationSent: boolean;
  lastCallAttempt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PregnantWoman {
  _id: string;
  fullName: string;
  age: number;
  phoneNumber: string;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  rescheduled: "bg-yellow-100 text-yellow-800",
};

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [pregnantWomen, setPregnantWomen] = useState<PregnantWoman[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    patient: "",
    patientName: "",
    patientPhoneNumber: "",
    relativePhoneNumber: "",
    appointmentLocation: "",
    appointmentDate: "",
    appointmentTime: "",
    status: "scheduled",
    notes: "",
  });

  const fetchAppointments = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(showTodayOnly && { today: "true" }),
      });

      const response = await fetch(`/api/appointments?${params}`, {
        cache: "no-store",
        signal: abortControllerRef.current.signal,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();
      setAppointments(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      if (!isAbortError(error)) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPregnantWomen = async () => {
    try {
      const response = await fetch("/api/pregnant-women?limit=100", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch pregnant women");

      const data = await response.json();
      setPregnantWomen(data.data);
    } catch (error) {
      console.error("Error fetching pregnant women:", error);
      toast.error("Failed to load pregnant women");
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, limit, debouncedSearch, statusFilter, showTodayOnly]);

  useEffect(() => {
    if (editingAppointment) {
      const date = new Date(editingAppointment.appointmentDate);
      setFormData({
        patient: editingAppointment.patient?._id ?? "",
        patientName: editingAppointment.patientName,
        patientPhoneNumber: editingAppointment.patientPhoneNumber,
        relativePhoneNumber: editingAppointment.relativePhoneNumber || "",
        appointmentLocation: editingAppointment.appointmentLocation,
        appointmentDate: date.toISOString().split("T")[0],
        appointmentTime: editingAppointment.appointmentTime,
        status: editingAppointment.status,
        notes: editingAppointment.notes || "",
      });
    } else {
      setFormData({
        patient: "",
        patientName: "",
        patientPhoneNumber: "",
        relativePhoneNumber: "",
        appointmentLocation: "",
        appointmentDate: "",
        appointmentTime: "",
        status: "scheduled",
        notes: "",
      });
    }
  }, [editingAppointment, isDialogOpen]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchPregnantWomen();
    }
  }, [isDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.patient ||
      !formData.patientName ||
      !formData.appointmentDate ||
      !formData.appointmentTime ||
      !formData.appointmentLocation
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setFormLoading(true);

      const url = editingAppointment
        ? `/api/appointments/${editingAppointment._id}`
        : "/api/appointments";
      const method = editingAppointment ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save appointment");
      }

      toast.success(
        editingAppointment
          ? "Appointment updated successfully"
          : "Appointment created successfully"
      );
      handleDialogClose();
      fetchAppointments();
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error(errorMessage(error) || "Failed to save appointment");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete appointment");

      toast.success("Appointment deleted successfully");
      fetchAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Failed to delete appointment");
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleView = (appointment: Appointment) => {
    router.push(`/dashboard/appointments/${appointment._id}`);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setShowTodayOnly(false);
    setPage(1);
  };

  const hasActiveFilters =
    searchInput !== "" || statusFilter !== "all" || showTodayOnly;

  const getDisplayStatus = (appointment: Appointment) => {
    if (
      appointment.status === "scheduled" &&
      new Date(appointment.appointmentDateTime) < new Date()
    ) {
      return "missed";
    }
    return appointment.status;
  };

  const getRowStyle = (appointment: Appointment) => {
    const displayStatus = getDisplayStatus(appointment);

    if (displayStatus === "missed") {
      return "bg-red-50 hover:bg-red-100";
    }
    if (displayStatus === "completed") {
      return "bg-green-50 hover:bg-green-100";
    }
    if (displayStatus === "rescheduled") {
      return "bg-yellow-50 hover:bg-yellow-100";
    }
    return "";
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Appointments
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-0.5">
                Manage antenatal care appointments
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => {
                  const patientId = searchParams?.get("patientId");
                  if (patientId) {
                    window.location.href = `/dashboard/appointments/past-appointments?id=${patientId}`;
                  } else {
                    window.location.href =
                      "/dashboard/appointments/past-appointments";
                  }
                }}
                variant="outline"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <History className="h-4 w-4" />
                Past Appointments
              </Button>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-emerald-100 shadow-md mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-gray-700 font-medium">
                  Search Appointments
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by patient name or phone number..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 border-emerald-200 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="status-filter"
                    className="text-gray-700 font-medium"
                  >
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                      id="status-filter"
                      className="border-emerald-200 focus:border-emerald-500"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Today Only Toggle */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Filter</Label>
                  <Button
                    onClick={() => setShowTodayOnly(!showTodayOnly)}
                    variant={showTodayOnly ? "default" : "outline"}
                    className={`w-full ${
                      showTodayOnly
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {showTodayOnly ? "✓ Today Only" : "Today Only"}
                  </Button>
                </div>

                {/* Clear Filters Button */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Actions</Label>
                  <Button
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                    variant="outline"
                    className="w-full border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm text-emerald-900 font-medium mb-2">
                    Active Filters:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchInput && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-200 text-emerald-900"
                      >
                        Search: "{searchInput}"
                      </Badge>
                    )}
                    {statusFilter !== "all" && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-200 text-emerald-900"
                      >
                        Status: {statusFilter}
                      </Badge>
                    )}
                    {showTodayOnly && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-200 text-emerald-900"
                      >
                        Today Only
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-emerald-900">
              Appointment Records
            </CardTitle>
            <CardDescription>
              Total: {total} appointments
              {showTodayOnly && " (Today only)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 sm:py-20">
                <Loader2 className="w-14 h-14 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">
                  Loading appointments...
                </p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16 sm:py-20 px-4">
                <div className="w-20 h-20 bg-linear-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-emerald-600" />
                </div>
                <p className="text-gray-700 text-xl font-semibold mb-2">
                  No appointments found
                </p>
                <p className="text-gray-500 text-base">
                  {searchInput || statusFilter !== "all" || showTodayOnly
                    ? "Try adjusting your search or filter criteria"
                    : "Click 'New Appointment' to create your first entry"}
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
                          Patient Name
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Phone
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Date & Time
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Status
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Call Status
                        </TableHead>
                        <TableHead className="text-emerald-900 font-bold py-4">
                          Created By
                        </TableHead>
                        <TableHead className="text-right text-emerald-900 font-bold py-4">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment, index) => {
                        const displayStatus = getDisplayStatus(appointment);
                        return (
                          <TableRow
                            key={appointment._id}
                            className={`hover:bg-emerald-50/50 border-b border-gray-100 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            } ${getRowStyle(appointment)}`}
                          >
                            <TableCell className="font-medium py-4">
                              {appointment.patientName}
                            </TableCell>
                            <TableCell className="py-4">
                              {appointment.patientPhoneNumber}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1">
                                <span>
                                  {formatDate(
                                    appointment.appointmentDate,
                                    "short"
                                  )}{" "}
                                  at {appointment.appointmentTime}
                                </span>
                                {displayStatus === "missed" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs w-fit bg-red-100 text-red-800 border-red-300"
                                  >
                                    Missed
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className={statusColors[displayStatus]}>
                                {displayStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1 text-xs">
                                {appointment.missedNotificationSent && (
                                  <Badge
                                    variant="secondary"
                                    className="w-fit bg-emerald-100 text-emerald-800"
                                  >
                                    SMS Sent
                                  </Badge>
                                )}
                                {appointment.voiceCallAttempts > 0 && (
                                  <div className="flex items-center gap-1 text-emerald-700">
                                    <Phone className="h-3 w-3" />
                                    <span>
                                      {appointment.voiceCallAttempts} call
                                      {appointment.voiceCallAttempts !== 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  </div>
                                )}
                                {!appointment.missedNotificationSent &&
                                  appointment.voiceCallAttempts === 0 && (
                                    <span className="text-gray-500">-</span>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {appointment?.createdBy?.name}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex justify-end gap-2">
                                <AppointmentReminderButtons
                                  appointmentId={appointment._id}
                                  patientName={appointment.patientName}
                                  patientPhone={appointment.patientPhoneNumber}
                                  appointmentDateTime={
                                    appointment.appointmentDateTime
                                  }
                                  isMissedNotificationSent={
                                    appointment.missedNotificationSent
                                  }
                                  voiceCallAttempts={
                                    appointment.voiceCallAttempts
                                  }
                                />

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(appointment)}
                                  title="View details"
                                  className="hover:bg-emerald-50"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(appointment)}
                                  title="Edit appointment"
                                  className="hover:bg-emerald-50"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(appointment._id)}
                                  title="Delete appointment"
                                  className="hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {appointments.map((appointment) => {
                    const displayStatus = getDisplayStatus(appointment);
                    return (
                      <div
                        key={appointment._id}
                        className={`p-4 transition-colors ${getRowStyle(appointment)}`}
                      >
                        <div className="space-y-3">
                          {/* Patient Info */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 wrap-break-word">
                                {appointment.patientName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                <p className="text-sm text-gray-600">
                                  {appointment.patientPhoneNumber}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Date & Status */}
                          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs font-medium mb-1">
                                Date & Time
                              </p>
                              <p className="text-gray-900 font-medium">
                                {formatDate(
                                  appointment.appointmentDate,
                                  "short"
                                )}
                              </p>
                              <p className="text-gray-700 text-xs">
                                {appointment.appointmentTime}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs font-medium mb-1">
                                Status
                              </p>
                              <Badge className={statusColors[displayStatus]}>
                                {displayStatus}
                              </Badge>
                            </div>
                          </div>

                          {/* Call Status */}
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-500 text-xs font-medium mb-2">
                              Call Status
                            </p>
                            <div className="flex flex-col gap-1 text-xs">
                              {appointment.missedNotificationSent && (
                                <Badge
                                  variant="secondary"
                                  className="w-fit bg-emerald-100 text-emerald-800"
                                >
                                  SMS Sent
                                </Badge>
                              )}
                              {appointment.voiceCallAttempts > 0 && (
                                <div className="flex items-center gap-1 text-emerald-700">
                                  <Phone className="h-3 w-3" />
                                  <span>
                                    {appointment.voiceCallAttempts} call
                                    {appointment.voiceCallAttempts !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                </div>
                              )}
                              {!appointment.missedNotificationSent &&
                                appointment.voiceCallAttempts === 0 && (
                                  <span className="text-gray-500">-</span>
                                )}
                            </div>
                          </div>

                          {/* Created By */}
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Created By
                            </p>
                            <p className="text-gray-900 text-sm">
                              {appointment?.createdBy?.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {formatDateTime(appointment.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated: {formatDateTime(appointment.updatedAt)}
                            </p>
                          </div>

                          {/* Reminder Buttons */}
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-500 text-xs font-medium mb-2">
                              Reminders
                            </p>
                            <AppointmentReminderButtons
                              appointmentId={appointment._id}
                              patientName={appointment.patientName}
                              patientPhone={appointment.patientPhoneNumber}
                              appointmentDateTime={
                                appointment.appointmentDateTime
                              }
                              isMissedNotificationSent={
                                appointment.missedNotificationSent
                              }
                              voiceCallAttempts={appointment.voiceCallAttempts}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(appointment)}
                              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(appointment)}
                              className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(appointment._id)}
                              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t-2 border-gray-100 space-y-4">
                    <p className="text-sm text-gray-600 text-center">
                      Page{" "}
                      <span className="font-semibold text-emerald-700">
                        {page}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-emerald-700">
                        {totalPages}
                      </span>
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0">
            <div className="sticky top-0 z-10 bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-5 rounded-t-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {editingAppointment ? "Edit Appointment" : "New Appointment"}
                </DialogTitle>
                <DialogDescription className="text-emerald-50">
                  {editingAppointment
                    ? "Update appointment details"
                    : "Create a new antenatal care appointment"}
                </DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Pregnant Woman Selection */}
              <div className="space-y-2">
                <Label htmlFor="pregnantWoman">Pregnant Woman *</Label>
                <Select
                  value={formData.patient}
                  onValueChange={(value) => {
                    const selected = pregnantWomen.find((w) => w._id === value);
                    setFormData({
                      ...formData,
                      patient: value,
                      patientName: selected?.fullName || "",
                      patientPhoneNumber: selected?.phoneNumber || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pregnant woman" />
                  </SelectTrigger>
                  <SelectContent>
                    {pregnantWomen.map((woman) => (
                      <SelectItem key={woman._id} value={woman._id}>
                        {woman.fullName} ({woman.phoneNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Patient Name */}
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName}
                    onChange={(e) =>
                      setFormData({ ...formData, patientName: e.target.value })
                    }
                    placeholder="Patient name"
                    disabled
                  />
                </div>

                {/* Patient Phone */}
                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Phone Number *</Label>
                  <Input
                    id="patientPhone"
                    value={formData.patientPhoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        patientPhoneNumber: e.target.value,
                      })
                    }
                    placeholder="Phone number"
                    disabled
                  />
                </div>

                {/* Relative Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="relativePhone">Relative Phone Number</Label>
                  <Input
                    id="relativePhone"
                    type="tel"
                    value={formData.relativePhoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relativePhoneNumber: e.target.value,
                      })
                    }
                    placeholder="Relative phone number (optional)"
                  />
                </div>

                {/* Appointment Location */}
                <div className="space-y-2">
                  <Label htmlFor="appointmentLocation">
                    Appointment Location *
                  </Label>
                  <Input
                    id="appointmentLocation"
                    value={formData.appointmentLocation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointmentLocation: e.target.value,
                      })
                    }
                    placeholder="e.g., Clinic, Hospital, Home visit"
                    required
                  />
                </div>

                {/* Appointment Date */}
                <div className="space-y-2">
                  <Label htmlFor="appointmentDate">Appointment Date *</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointmentDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Appointment Time */}
                <div className="space-y-2">
                  <Label htmlFor="appointmentTime">Appointment Time *</Label>
                  <Input
                    id="appointmentTime"
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointmentTime: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-gray-200 -mx-6 px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {formLoading ? "Saving..." : "Save Appointment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
