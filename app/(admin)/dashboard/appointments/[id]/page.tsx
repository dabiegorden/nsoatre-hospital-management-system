"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Clock,
  MapPin,
  PhoneCall,
  Loader2,
  History,
  Eye,
  User,
  FileText,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallHistory } from "@/components/call-history";
import { IvrTestCall } from "@/components/ivr-test-call";
import {
  ReminderTimeline,
  type ReminderFields,
} from "@/components/reminder-timeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Appointment extends ReminderFields {
  _id: string;
  patientName: string;
  patientPhoneNumber: string;
  relativePhoneNumber?: string;
  appointmentLocation: string;
  appointmentDate: Date;
  appointmentTime: string;
  appointmentDateTime: Date;
  status: "scheduled" | "completed" | "missed" | "rescheduled" | "cancelled";
  notes?: string;
  patient: {
    _id: string;
    fullName: string;
    age: number;
    phoneNumber: string;
  } | null;
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAllAppointments, setLoadingAllAppointments] = useState(true);
  const [callsRefreshKey, setCallsRefreshKey] = useState(0);
  const appointmentId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const appointmentResponse = await fetch(
          `/api/appointments/${appointmentId}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );
        if (!appointmentResponse.ok) {
          throw new Error("Failed to fetch appointment");
        }
        const appointmentData = await appointmentResponse.json();
        const apt = appointmentData.data;
        setAppointment(apt);

        setLoadingAllAppointments(true);
        const allAppointmentsResponse = await fetch(
          `/api/appointments?limit=100`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (allAppointmentsResponse.ok) {
          const allAppointmentsData = await allAppointmentsResponse.json();

          const patientAppointments = allAppointmentsData.data
            .filter(
              (a: Appointment) =>
                a.patient?._id != null &&
                a.patient._id === apt.patient?._id &&
                a._id !== appointmentId
            )
            .sort(
              (a: Appointment, b: Appointment) =>
                new Date(b.appointmentDateTime).getTime() -
                new Date(a.appointmentDateTime).getTime()
            );
          setAllAppointments(patientAppointments);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
      } finally {
        setLoading(false);
        setLoadingAllAppointments(false);
      }
    };

    fetchData();
  }, [appointmentId]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500 text-white hover:bg-emerald-600";
      case "missed":
        return "bg-red-500 text-white hover:bg-red-600";
      case "rescheduled":
        return "bg-amber-500 text-white hover:bg-amber-600";
      case "cancelled":
        return "bg-gray-500 text-white hover:bg-gray-600";
      default:
        return "bg-blue-500 text-white hover:bg-blue-600";
    }
  };

  const generatePDF = () => {
    if (!appointment) return;

    try {
      const content = `
APPOINTMENT DETAILS REPORT

===========================================
PATIENT INFORMATION
===========================================
Patient Name: ${appointment.patient?.fullName ?? appointment.patientName}
Phone Number: ${appointment.patient?.phoneNumber ?? appointment.patientPhoneNumber}
Age: ${appointment.patient ? `${appointment.patient.age} years` : "N/A"}

===========================================
APPOINTMENT DETAILS
===========================================
Appointment Date: ${new Date(
        appointment.appointmentDateTime
      ).toLocaleDateString()}
Appointment Time: ${appointment.appointmentTime}
Location: ${appointment.appointmentLocation}
Status: ${appointment.status.toUpperCase()}

===========================================
CONTACT INFORMATION
===========================================
Patient Phone: ${appointment.patientPhoneNumber}
${
  appointment.relativePhoneNumber
    ? `Relative Phone: ${appointment.relativePhoneNumber}`
    : ""
}

===========================================
APPOINTMENT NOTES
===========================================
${appointment.notes || "No notes recorded"}

===========================================
RECORD INFORMATION
===========================================
Recorded By: ${appointment.createdBy?.name || "N/A"} (${
        appointment.createdBy?.email || "N/A"
      })
Created: ${new Date(appointment.createdAt).toLocaleString()}
Updated: ${new Date(appointment.updatedAt).toLocaleString()}
Report Generated: ${new Date().toLocaleString()}
      `;

      const element = document.createElement("a");
      const file = new Blob([content], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `appointment-details-${appointment.patient?._id ?? appointment._id}-${
        new Date(appointment.appointmentDateTime).toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Appointment details downloaded successfully");
    } catch (error) {
      toast.error("Failed to download appointment details");
    }
  };

  const handlePrint = () => {
    if (!appointment) return;

    try {
      const printWindow = window.open("", "", "height=600,width=800");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Appointment Details - ${appointment.patient?.fullName ?? appointment.patientName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h1 { text-align: center; color: #059669; margin-bottom: 10px; }
              h2 { color: #059669; margin-top: 20px; padding-bottom: 8px; border-bottom: 2px solid #059669; }
              .row { display: flex; justify-content: space-between; margin: 8px 0; padding: 6px 0; }
              .label { font-weight: bold; min-width: 200px; }
              .value { flex: 1; }
              .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
              .info-box { background-color: #f0fdf4; padding: 12px; border-left: 4px solid #059669; margin: 15px 0; }
              .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>APPOINTMENT DETAILS</h1>
            
            <div class="info-box">
              <h2 style="margin-top: 0;">Patient Information</h2>
              <div class="row"><span class="label">Name:</span> <span class="value">${
                appointment.patient?.fullName ?? appointment.patientName
              }</span></div>
              <div class="row"><span class="label">Phone:</span> <span class="value">${
                appointment.patient?.phoneNumber ?? appointment.patientPhoneNumber
              }</span></div>
              <div class="row"><span class="label">Age:</span> <span class="value">${
                appointment.patient?.age ?? "N/A"
              } years</span></div>
            </div>
            
            <h2>Appointment Details</h2>
            <div class="row"><span class="label">Date:</span> <span class="value">${new Date(
              appointment.appointmentDateTime
            ).toLocaleDateString()}</span></div>
            <div class="row"><span class="label">Time:</span> <span class="value">${
              appointment.appointmentTime
            }</span></div>
            <div class="row"><span class="label">Location:</span> <span class="value">${
              appointment.appointmentLocation
            }</span></div>
            <div class="row"><span class="label">Status:</span> <span class="value status-badge">${appointment.status.toUpperCase()}</span></div>
            
            <h2>Contact Information</h2>
            <div class="row"><span class="label">Patient Phone:</span> <span class="value">${
              appointment.patientPhoneNumber
            }</span></div>
            ${
              appointment.relativePhoneNumber
                ? `<div class="row"><span class="label">Relative Phone:</span> <span class="value">${appointment.relativePhoneNumber}</span></div>`
                : ""
            }
            
            ${
              appointment.notes
                ? `<h2>Notes</h2>
            <p>${appointment.notes}</p>`
                : ""
            }
            
            <div class="footer">
              <p><strong>This is an official appointment details report</strong></p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      toast.error("Failed to print appointment details");
    }
  };

  const handleViewAppointment = (aptId: string) => {
    router.push(`/dashboard/appointments/${aptId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            Loading appointment details...
          </p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 hover:bg-slate-100 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                Appointment Details
              </h1>
              <p className="text-slate-600">
                View and manage appointment information
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generatePDF}
                variant="outline"
                className="border-slate-300 hover:bg-slate-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status and Date Card */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-linear-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-2">
                      Scheduled For
                    </p>
                    <h2 className="text-3xl font-bold mb-1">
                      {new Date(
                        appointment.appointmentDateTime
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h2>
                    <p className="text-emerald-100">
                      {new Date(
                        appointment.appointmentDateTime
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                      })}{" "}
                      at {appointment.appointmentTime}
                    </p>
                  </div>
                  <Badge
                    className={`${getStatusBadgeColor(appointment.status)} text-sm px-4 py-2`}
                  >
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                          Date
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {new Date(
                            appointment.appointmentDateTime
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                          Time
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {appointment.appointmentTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="text-base font-semibold text-slate-900">
                        {appointment.appointmentLocation}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            {appointment.notes && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      Appointment Notes
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {appointment.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointment History */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <History className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Appointment History
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Previous appointments for this patient
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {loadingAllAppointments ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                    <p className="text-slate-600 text-sm">Loading history...</p>
                  </div>
                ) : allAppointments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">
                      No previous appointments found
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Time</TableHead>
                          <TableHead className="font-semibold">
                            Location
                          </TableHead>
                          <TableHead className="font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="text-right font-semibold">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allAppointments.map((apt) => (
                          <TableRow
                            key={apt._id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              {new Date(
                                apt.appointmentDateTime
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {apt.appointmentTime}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {apt.appointmentLocation}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusBadgeColor(apt.status)}
                              >
                                {apt.status.charAt(0).toUpperCase() +
                                  apt.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAppointment(apt._id)}
                                className="hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call history with AI-extracted outcomes */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Call History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CallHistory appointmentId={appointment._id} refreshKey={callsRefreshKey} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Patient & Contact Info */}
          <div className="space-y-6">
            {/* Automatic reminder pipeline */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Automatic Reminders
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReminderTimeline appointment={appointment} />
                <IvrTestCall
                  appointmentId={appointment._id}
                  onFinished={() => setCallsRefreshKey((k) => k + 1)}
                />
              </CardContent>
            </Card>

            {/* Patient Information Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <User className="w-4 h-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Patient Information
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Full Name
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {appointment.patient?.fullName ?? appointment.patientName}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Age
                  </p>
                  <p className="text-base font-medium text-slate-700">
                    {appointment.patient ? `${appointment.patient.age} years old` : "Age unknown"}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Phone Number
                  </p>
                  <p className="text-base font-medium text-slate-700">
                    {appointment.patient?.phoneNumber ?? appointment.patientPhoneNumber}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Contact Details
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Patient Phone
                  </p>
                  <p className="text-base font-medium text-slate-700">
                    {appointment.patientPhoneNumber}
                  </p>
                </div>
                {appointment.relativePhoneNumber && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Relative Phone
                    </p>
                    <p className="text-base font-medium text-slate-700">
                      {appointment.relativePhoneNumber}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Record Information Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Info className="w-4 h-4 text-slate-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Record Info
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Created
                  </p>
                  <p className="text-slate-700">
                    {new Date(appointment.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Last Updated
                  </p>
                  <p className="text-slate-700">
                    {new Date(appointment.updatedAt).toLocaleString()}
                  </p>
                </div>
                {appointment.createdBy && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Recorded By
                    </p>
                    <p className="text-slate-700 font-medium">
                      {appointment.createdBy.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
