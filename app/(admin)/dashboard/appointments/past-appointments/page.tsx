"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PastAppointment {
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
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PastAppointmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [appointments, setAppointments] = useState<PastAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const appointmentsResponse = await fetch(
          `/api/appointments/past-appointments`
        );
        if (!appointmentsResponse.ok) {
          throw new Error("Failed to fetch past appointments");
        }
        const appointmentsData = await appointmentsResponse.json();
        setAppointments(appointmentsData.data || []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, router]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "missed":
        return "bg-red-100 text-red-800 border-red-300";
      case "rescheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getRowHighlightColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 hover:bg-green-100";
      case "missed":
        return "bg-red-50 hover:bg-red-100";
      case "rescheduled":
        return "bg-yellow-50 hover:bg-yellow-100";
      case "cancelled":
        return "bg-gray-50 hover:bg-gray-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  const generatePDF = (appointment: PastAppointment) => {
    try {
      const content = `
PAST APPOINTMENT RECORD

===========================================
APPOINTMENT DETAILS
===========================================
Patient Name: ${appointment.patientName}
Phone Number: ${appointment.patientPhoneNumber}
${
  appointment.relativePhoneNumber
    ? `Relative Phone: ${appointment.relativePhoneNumber}`
    : ""
}
Location: ${appointment.appointmentLocation}
Date: ${new Date(appointment.appointmentDateTime).toLocaleDateString()}
Time: ${appointment.appointmentTime}
Status: ${appointment.status.toUpperCase()}

===========================================
APPOINTMENT NOTES
===========================================
${appointment.notes || "No notes recorded"}

===========================================
RECORD INFORMATION
===========================================
Record Created: ${new Date(appointment.createdAt).toLocaleString()}
Record Updated: ${new Date(appointment.updatedAt).toLocaleString()}
Recorded By: ${appointment.createdBy?.name || "N/A"}
Generated: ${new Date().toLocaleString()}
      `;

      const element = document.createElement("a");
      const file = new Blob([content], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `appointment-${
        new Date(appointment.appointmentDateTime).toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Appointment record downloaded successfully");
    } catch (error) {
      toast.error("Failed to download record");
    }
  };

  const handlePrint = (appointment: PastAppointment) => {
    try {
      const printWindow = window.open("", "", "height=600,width=800");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Past Appointment Record - ${appointment.patientName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h1 { text-align: center; color: #059669; margin-bottom: 10px; }
              h2 { color: #059669; margin-top: 20px; padding-bottom: 8px; border-bottom: 2px solid #059669; }
              .section { margin-bottom: 15px; }
              .row { display: flex; justify-content: space-between; margin: 6px 0; padding: 4px 0; }
              .label { font-weight: bold; min-width: 200px; }
              .value { flex: 1; }
              hr { border: none; border-top: 1px solid #ddd; margin: 15px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
              .appointment-info { background-color: #f0fdf4; padding: 10px; border-left: 3px solid #059669; margin-bottom: 20px; }
              .status-badge { display: inline-block; padding: 3px 8px; margin: 2px 0; border-radius: 3px; font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>PAST APPOINTMENT RECORD</h1>
            <h2>Patient & Appointment Information</h2>
            
            <div class="appointment-info">
              <div class="row"><span class="label">Patient Name:</span> <span class="value">${
                appointment.patientName
              }</span></div>
              <div class="row"><span class="label">Phone:</span> <span class="value">${
                appointment.patientPhoneNumber
              }</span></div>
              ${
                appointment.relativePhoneNumber
                  ? `<div class="row"><span class="label">Relative Phone:</span> <span class="value">${appointment.relativePhoneNumber}</span></div>`
                  : ""
              }
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
            
            ${
              appointment.notes
                ? `<h2>Appointment Notes</h2>
            <p>${appointment.notes}</p>`
                : ""
            }
            
            <div class="footer">
              <hr>
              <p><strong>HISTORICAL RECORD - PAST APPOINTMENT</strong></p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      toast.error("Failed to print record");
    }
  };

  const handleViewDetails = (appointment: PastAppointment) => {
    router.push(`/dashboard/appointments/${appointment._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            Loading appointments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/appointments`)}
            className="mb-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Past Appointments
              </h1>
              <p className="text-gray-600 mt-1">
                View all past appointments and missed calls history
              </p>
              <p className="text-sm text-gray-500 mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Total Records: {appointments.length}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/dashboard/appointments`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>

        {appointments.length === 0 ? (
          <Card className="border-2 border-emerald-100 shadow-md">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Past Appointments
              </h3>
              <p className="text-gray-600 mb-6">
                No past appointments found. Appointments will appear here once
                they are completed or marked as missed.
              </p>
              <Button
                onClick={() => router.push(`/dashboard/appointments`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-emerald-100 shadow-md">
            <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <CardTitle className="text-lg font-semibold text-emerald-900">
                Appointment Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">
                        Patient Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Time
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Location
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Phone
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Notes
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow
                        key={appointment._id}
                        className={getRowHighlightColor(appointment.status)}
                      >
                        <TableCell className="font-medium">
                          {appointment.patientName}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            appointment.appointmentDateTime
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{appointment.appointmentTime}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {appointment.appointmentLocation}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {appointment.patientPhoneNumber}
                            </div>
                            {appointment.relativePhoneNumber && (
                              <div className="text-xs text-gray-500">
                                Rel: {appointment.relativePhoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusBadgeColor(appointment.status)}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          {appointment.notes ? (
                            <div className="text-sm text-gray-600 truncate">
                              {appointment.notes}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              No notes
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(appointment)}
                              className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => generatePDF(appointment)}
                              className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrint(appointment)}
                              className="h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
