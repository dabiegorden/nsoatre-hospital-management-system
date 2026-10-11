"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Activity,
  FileText,
  Heart,
  Shield,
  Pill,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisitRecordForm from "@/components/visit-record-form";
import VisitHistory from "@/components/visit-history";
import { CareInsights } from "@/components/care-insights";
import { CallHistory } from "@/components/call-history";

interface PregnantWoman {
  _id: string;
  missedAppointments?: number;
  preferredLanguage?: "twi" | "english" | null;
  followUpStatus?: "none" | "assigned" | "visited" | "returned";
  fullName: string;
  residentialAddress: string;
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
  location: string;
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

export default function PregnantWomanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [woman, setWoman] = useState<PregnantWoman | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitRefreshTrigger, setVisitRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchWoman = async () => {
      try {
        const id = typeof params.id === "string" ? params.id : params?.id?.[0];

        if (!id) {
          throw new Error("Pregnant woman ID is required");
        }

        setLoading(true);
        const response = await fetch(`/api/pregnant-women/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch record");
        }

        setWoman(data.data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch record"
        );
        router.push("/dashboard/pregnant-women");
      } finally {
        setLoading(false);
      }
    };

    fetchWoman();
  }, [params, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "positive":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Positive
          </Badge>
        );
      case "negative":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Negative
          </Badge>
        );
      case "normal":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Normal
          </Badge>
        );
      case "deficient":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Deficient
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pending
          </Badge>
        );
      case "not_done":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            Not Done
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            {status}
          </Badge>
        );
    }
  };

  const getBooleanBadge = (value: boolean) => {
    return value ? (
      <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 w-fit">
        <CheckCircle className="w-3 h-3" />
        Yes
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300 flex items-center gap-1 w-fit">
        <AlertCircle className="w-3 h-3" />
        No
      </Badge>
    );
  };

  const downloadRecordAsPDF = () => {
    if (!woman) return;

    try {
      const content = `
PREGNANT WOMAN HEALTH RECORD

===========================================
PATIENT INFORMATION
===========================================
Full Name: ${woman.fullName}
Folder Number: ${woman.folderNumber}
Phone Number: ${woman.phoneNumber}
Age: ${woman.age} years
Marital Status: ${woman.maritalStatus}
Residential Address: ${woman.residentialAddress}

===========================================
VITAL SIGNS & MEASUREMENTS
===========================================
Parity: ${woman.parity}
Blood Pressure: ${woman.bloodPressure}
Height: ${woman.height} cm
Weight: ${woman.weight} kg
Gestational Age: ${woman.gestationalAge} weeks
Expected Delivery Date: ${new Date(woman.expectedDeliveryDate).toLocaleDateString()}

===========================================
ADDITIONAL HEALTH INFORMATION
===========================================
Location: ${woman.location || "N/A"}
Hemoglobin (Hb): ${woman.hb || "N/A"}
Random Blood Sugar (RBS): ${woman.rbs || "N/A"}
Symphysis-Fundus Height (SFH): ${woman.sfh || "N/A"}
Urine Protein: ${woman.urineProtein || "N/A"}

===========================================
LABORATORY TEST RESULTS
===========================================
HBsAg Result: ${woman.hbsAgResult}
G6PD Status: ${woman.g6pdStatus}
Blood Group: ${woman.bloodGroup}${woman.rhFactor === "positive" ? "+" : "-"}
Sickling Status: ${woman.sicklingStatus}
Syphilis Screening: ${woman.syphilisScreeningStatus}
TB Status: ${woman.tbStatus}

===========================================
HIV STATUS & ART TREATMENT
===========================================
Known HIV+ Before Pregnancy: ${woman.knownHivPositiveBeforePregnancy ? "Yes" : "No"}
ART Treatment Before Pregnancy: ${woman.artTreatmentBeforePregnancy ? "Yes" : "No"}
HIV Status at Registration: ${woman.hivStatusAtRegistration}
ART Treatment After Registration: ${woman.artTreatmentAfterRegistration ? "Yes" : "No"}
HIV Retest at 34 Weeks: ${woman.hivRetestAt34Weeks}
ART Treatment After Retest: ${woman.artTreatmentAfterRetest ? "Yes" : "No"}

===========================================
TB SCREENING & TREATMENT
===========================================
Cough Over 2 Weeks: ${woman.tbScreeningCoughOver2Weeks ? "Yes" : "No"}
TB Treatment: ${woman.tbTreatment ? "Yes" : "No"}

===========================================
SUPPLEMENTS & INTERVENTIONS
===========================================
Folic Acid Supplements: ${woman.folicAcidSupplements ? "Yes" : "No"}
Iron Supplements: ${woman.ironSupplements ? "Yes" : "No"}
ITN Distributed: ${woman.itnDistributed ? "Yes" : "No"}
Syphilis Treatment: ${woman.syphilisTreatment ? "Yes" : "No"}
${
  woman.itnDistributed && woman.itnDistributionDate
    ? `ITN Distribution Date: ${new Date(woman.itnDistributionDate).toLocaleDateString()}`
    : ""
}

===========================================
RECORD INFORMATION
===========================================
Registered By: ${woman.registeredBy?.name || "N/A"} (${woman.registeredBy?.email || "N/A"})
Created At: ${new Date(woman.createdAt).toLocaleString()}
Last Updated: ${new Date(woman.updatedAt).toLocaleString()}

Generated: ${new Date().toLocaleString()}
      `;

      const element = document.createElement("a");
      const file = new Blob([content], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `record-${woman.folderNumber}-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Record downloaded successfully");
    } catch (error) {
      toast.error("Failed to download record");
    }
  };

  const printRecord = () => {
    if (!woman) return;

    try {
      const printWindow = window.open("", "", "height=600,width=800");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Pregnant Woman Health Record - ${woman.fullName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h1 { text-align: center; color: #059669; margin-bottom: 20px; }
              h2 { color: #059669; margin-top: 20px; padding-bottom: 10px; border-bottom: 2px solid #059669; }
              .section { margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; }
              .label { font-weight: bold; min-width: 200px; }
              .value { flex: 1; }
              hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>PREGNANT WOMAN HEALTH RECORD</h1>
            
            <h2>PATIENT INFORMATION</h2>
            <div class="row"><span class="label">Full Name:</span> <span class="value">${woman.fullName}</span></div>
            <div class="row"><span class="label">Folder Number:</span> <span class="value">${
              woman.folderNumber
            }</span></div>
            <div class="row"><span class="label">Phone Number:</span> <span class="value">${
              woman.phoneNumber
            }</span></div>
            <div class="row"><span class="label">Age:</span> <span class="value">${woman.age} years</span></div>
            <div class="row"><span class="label">Marital Status:</span> <span class="value">${
              woman.maritalStatus
            }</span></div>
            <div class="row"><span class="label">Residential Address:</span> <span class="value">${
              woman.residentialAddress
            }</span></div>
            
            <h2>VITAL SIGNS & MEASUREMENTS</h2>
            <div class="row"><span class="label">Parity:</span> <span class="value">${woman.parity}</span></div>
            <div class="row"><span class="label">Blood Pressure:</span> <span class="value">${
              woman.bloodPressure
            }</span></div>
            <div class="row"><span class="label">Height:</span> <span class="value">${woman.height} cm</span></div>
            <div class="row"><span class="label">Weight:</span> <span class="value">${woman.weight} kg</span></div>
            <div class="row"><span class="label">Gestational Age:</span> <span class="value">${
              woman.gestationalAge
            } weeks</span></div>
            <div class="row"><span class="label">Expected Delivery Date:</span> <span class="value">${new Date(
              woman.expectedDeliveryDate
            ).toLocaleDateString()}</span></div>
            
            <h2>LABORATORY TEST RESULTS</h2>
            <div class="row"><span class="label">HBsAg Result:</span> <span class="value">${
              woman.hbsAgResult
            }</span></div>
            <div class="row"><span class="label">G6PD Status:</span> <span class="value">${
              woman.g6pdStatus
            }</span></div>
            <div class="row"><span class="label">Blood Group:</span> <span class="value">${
              woman.bloodGroup
            }${woman.rhFactor === "positive" ? "+" : "-"}</span></div>
            <div class="row"><span class="label">Sickling Status:</span> <span class="value">${
              woman.sicklingStatus
            }</span></div>
            <div class="row"><span class="label">Syphilis Screening:</span> <span class="value">${
              woman.syphilisScreeningStatus
            }</span></div>
            <div class="row"><span class="label">TB Status:</span> <span class="value">${woman.tbStatus}</span></div>
            
            <h2>HIV STATUS & ART TREATMENT</h2>
            <div class="row"><span class="label">HIV Status at Registration:</span> <span class="value">${
              woman.hivStatusAtRegistration
            }</span></div>
            <div class="row"><span class="label">HIV Retest at 34 Weeks:</span> <span class="value">${
              woman.hivRetestAt34Weeks
            }</span></div>
            
            <h2>RECORD INFORMATION</h2>
            <div class="row"><span class="label">Created:</span> <span class="value">${new Date(
              woman.createdAt
            ).toLocaleString()}</span></div>
            <div class="row"><span class="label">Last Updated:</span> <span class="value">${new Date(
              woman.updatedAt
            ).toLocaleString()}</span></div>
            
            <div class="footer">
              <hr>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading record...</p>
        </div>
      </div>
    );
  }

  if (!woman) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/pregnant-women")}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={downloadRecordAsPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={printRecord}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                {woman.fullName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm sm:text-base text-gray-600">
                  Folder #: {woman.folderNumber}
                </p>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 capitalize">
                  {woman.maritalStatus}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-emerald-100 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="visits"
              className="data-[state=active]:bg-white"
            >
              Monthly Visits
            </TabsTrigger>
            <TabsTrigger
              value="calls"
              className="data-[state=active]:bg-white"
            >
              Reminder Calls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <CareInsights woman={woman} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card className="border-2 border-emerald-100 shadow-md">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">
                        Folder Number
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {woman.folderNumber}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">
                        Full Name
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {woman.fullName}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">
                        Residential Address
                      </p>
                      <p className="text-base text-gray-900">
                        {woman.residentialAddress}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">
                        Phone Number
                      </p>
                      <p className="text-base text-gray-900">
                        {woman.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">Age</p>
                      <p className="text-base text-gray-900">
                        {woman.age} years
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 capitalize mt-0.5">
                      {woman.maritalStatus}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">
                        Marital Status
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    Vital Signs & Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Parity
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {woman.parity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Blood Pressure
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {woman.bloodPressure}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Height
                      </p>
                      <p className="text-base text-gray-900">
                        {woman.height} cm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Weight
                      </p>
                      <p className="text-base text-gray-900">
                        {woman.weight} kg
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Gestational Age
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {woman.gestationalAge} weeks
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Expected Delivery Date
                      </p>
                      <p className="text-base text-gray-900 font-semibold">
                        {new Date(
                          woman.expectedDeliveryDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md lg:col-span-2">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    Additional Health Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {woman.location || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Hemoglobin (Hb)
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {woman.hb || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        RBS
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {woman.rbs || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        SFH
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {woman.sfh || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Urine Protein
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {woman.urineProtein || "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md lg:col-span-2">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Laboratory Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        HBsAg Result
                      </p>
                      {getStatusBadge(woman.hbsAgResult)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        G6PD Status
                      </p>
                      {getStatusBadge(woman.g6pdStatus)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Blood Group
                      </p>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                        {woman.bloodGroup}
                        {woman.rhFactor === "positive" ? "+" : "-"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Sickling Status
                      </p>
                      {getStatusBadge(woman.sicklingStatus)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Syphilis Screening
                      </p>
                      {getStatusBadge(woman.syphilisScreeningStatus)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        TB Status
                      </p>
                      {getStatusBadge(woman.tbStatus)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md lg:col-span-2">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    HIV Status & ART Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Known HIV+ Before Pregnancy
                      </p>
                      {getBooleanBadge(woman.knownHivPositiveBeforePregnancy)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        ART Treatment Before Pregnancy
                      </p>
                      {getBooleanBadge(woman.artTreatmentBeforePregnancy)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        HIV Status at Registration
                      </p>
                      {getStatusBadge(woman.hivStatusAtRegistration)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        ART Treatment After Registration
                      </p>
                      {getBooleanBadge(woman.artTreatmentAfterRegistration)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        HIV Retest at 34 Weeks
                      </p>
                      {getStatusBadge(woman.hivRetestAt34Weeks)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        ART Treatment After Retest
                      </p>
                      {getBooleanBadge(woman.artTreatmentAfterRetest)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-600" />
                    TB Screening & Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">
                      Cough Over 2 Weeks
                    </p>
                    {getBooleanBadge(woman.tbScreeningCoughOver2Weeks)}
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">
                      TB Treatment
                    </p>
                    {getBooleanBadge(woman.tbTreatment)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-emerald-600" />
                    Supplements & Interventions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Folic Acid Supplements
                      </p>
                      {getBooleanBadge(woman.folicAcidSupplements)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Iron Supplements
                      </p>
                      {getBooleanBadge(woman.ironSupplements)}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        ITN Distributed
                      </p>
                      {getBooleanBadge(woman.itnDistributed)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">
                        Syphilis Treatment
                      </p>
                      {getBooleanBadge(woman.syphilisTreatment)}
                    </div>
                  </div>

                  {woman.itnDistributed && woman.itnDistributionDate && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500 font-medium mb-2">
                          ITN Distribution Date
                        </p>
                        <p className="text-base text-gray-900 font-semibold">
                          {new Date(
                            woman.itnDistributionDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-100 shadow-md lg:col-span-2">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Record Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {woman.registeredBy && (
                      <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">
                          Registered By
                        </p>
                        <p className="text-base text-gray-900 font-semibold">
                          {woman.registeredBy.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {woman.registeredBy.email}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">
                        Created At
                      </p>
                      <p className="text-base text-gray-900">
                        {new Date(woman.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">
                        Last Updated
                      </p>
                      <p className="text-base text-gray-900">
                        {new Date(woman.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="visits" className="space-y-6">
            <div className="space-y-6">
              <VisitRecordForm
                pregnantWomanId={woman._id}
                onSuccess={() => setVisitRefreshTrigger((prev) => prev + 1)}
              />

              <VisitHistory
                pregnantWomanId={woman._id}
                triggerRefresh={visitRefreshTrigger}
              />
            </div>
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Reminder calls and outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CallHistory patientId={woman._id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
