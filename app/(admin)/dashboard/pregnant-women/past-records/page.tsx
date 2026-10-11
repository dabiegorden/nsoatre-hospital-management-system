"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Activity,
  FileText,
  Shield,
  Loader2,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PastRecord {
  _id: string;
  pregnantWomanId: string;
  bloodPressure: string;
  height: number;
  weight: number;
  gestationalAge: number;
  folicAcidSupplements: boolean;
  ironSupplements: boolean;
  hbsAgResult: "positive" | "negative" | "pending";
  g6pdStatus: "normal" | "deficient" | "pending";
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
  visitNotes?: string;
  visitDate: string;
  recordedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface PregnantWoman {
  _id: string;
  fullName: string;
  phoneNumber: string;
  folderNumber: string;
  maritalStatus: string;
  age: number;
}

export default function PastRecordsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [woman, setWoman] = useState<PregnantWoman | null>(null);
  const [records, setRecords] = useState<PastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PastRecord | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const id = searchParams.get("id");

        if (!id) {
          toast.error("Pregnant woman ID is required");
          router.push("/dashboard/pregnant-women");
          return;
        }

        setLoading(true);

        // Fetch pregnant woman details
        const womanResponse = await fetch(`/api/pregnant-women/${id}`);
        if (!womanResponse.ok) {
          throw new Error("Failed to fetch woman details");
        }
        const womanData = await womanResponse.json();
        setWoman(womanData.data);

        // Fetch past records with correct parameter name
        const recordsResponse = await fetch(
          `/api/pregnant-women/past-records?pregnantWomanId=${id}`
        );
        if (!recordsResponse.ok) {
          throw new Error("Failed to fetch past records");
        }
        const recordsData = await recordsResponse.json();
        setRecords(recordsData.data || []);
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
      <Badge className="bg-green-100 text-green-800 border-green-300">
        Yes
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300">No</Badge>
    );
  };

  const generatePDF = () => {
    if (!woman || !selectedRecord) {
      toast.error("Please select a record to download");
      return;
    }

    try {
      const content = `
PAST MEDICAL RECORD - VISIT HISTORY

===========================================
PATIENT INFORMATION
===========================================
Full Name: ${woman.fullName}
Folder Number: ${woman.folderNumber}
Phone Number: ${woman.phoneNumber}
Age: ${woman.age} years
Marital Status: ${woman.maritalStatus}

===========================================
VISIT DETAILS
===========================================
Visit Date: ${new Date(
        selectedRecord.visitDate
      ).toLocaleDateString()} ${new Date(
        selectedRecord.visitDate
      ).toLocaleTimeString()}
Recorded By: ${selectedRecord.recordedBy?.name || "N/A"} (${
        selectedRecord.recordedBy?.email || "N/A"
      })
Record Created: ${new Date(selectedRecord.createdAt).toLocaleString()}

===========================================
VITAL SIGNS & MEASUREMENTS
===========================================
Blood Pressure: ${selectedRecord.bloodPressure}
Height: ${selectedRecord.height} cm
Weight: ${selectedRecord.weight} kg
Gestational Age: ${selectedRecord.gestationalAge} weeks

===========================================
SUPPLEMENTS & INTERVENTIONS
===========================================
Folic Acid Supplements: ${selectedRecord.folicAcidSupplements ? "Yes" : "No"}
Iron Supplements: ${selectedRecord.ironSupplements ? "Yes" : "No"}
ITN Distributed: ${selectedRecord.itnDistributed ? "Yes" : "No"}
${
  selectedRecord.itnDistributionDate
    ? `ITN Distribution Date: ${new Date(
        selectedRecord.itnDistributionDate
      ).toLocaleDateString()}`
    : ""
}
Syphilis Treatment: ${selectedRecord.syphilisTreatment ? "Yes" : "No"}

===========================================
LABORATORY TEST RESULTS
===========================================
HBsAg Result: ${selectedRecord.hbsAgResult}
G6PD Status: ${selectedRecord.g6pdStatus}
Sickling Status: ${selectedRecord.sicklingStatus}
Syphilis Screening Status: ${selectedRecord.syphilisScreeningStatus}
TB Status: ${selectedRecord.tbStatus}

===========================================
HIV STATUS & ART TREATMENT
===========================================
Known HIV+ Before Pregnancy: ${
        selectedRecord.knownHivPositiveBeforePregnancy ? "Yes" : "No"
      }
ART Treatment Before Pregnancy: ${
        selectedRecord.artTreatmentBeforePregnancy ? "Yes" : "No"
      }
HIV Status at Registration: ${selectedRecord.hivStatusAtRegistration}
ART Treatment After Registration: ${
        selectedRecord.artTreatmentAfterRegistration ? "Yes" : "No"
      }
HIV Retest at 34 Weeks: ${selectedRecord.hivRetestAt34Weeks}
ART Treatment After Retest: ${
        selectedRecord.artTreatmentAfterRetest ? "Yes" : "No"
      }

===========================================
TB SCREENING & TREATMENT
===========================================
Cough Over 2 Weeks: ${selectedRecord.tbScreeningCoughOver2Weeks ? "Yes" : "No"}
TB Treatment: ${selectedRecord.tbTreatment ? "Yes" : "No"}

===========================================
VISIT NOTES
===========================================
${selectedRecord.visitNotes || "No notes recorded"}

===========================================
DOCUMENT INFORMATION
===========================================
This is a historical record from a past visit.
Generated: ${new Date().toLocaleString()}
      `;

      const element = document.createElement("a");
      const file = new Blob([content], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `past-record-${woman.folderNumber}-${
        new Date(selectedRecord.visitDate).toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Record downloaded successfully");
    } catch (error) {
      toast.error("Failed to download record");
    }
  };

  const handlePrint = () => {
    if (!woman || !selectedRecord) {
      toast.error("Please select a record to print");
      return;
    }

    try {
      const printWindow = window.open("", "", "height=600,width=800");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Past Medical Record - ${woman.fullName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h1 { text-align: center; color: #059669; margin-bottom: 10px; }
              h2 { color: #059669; margin-top: 20px; padding-bottom: 8px; border-bottom: 2px solid #059669; }
              .section { margin-bottom: 15px; }
              .row { display: flex; justify-content: space-between; margin: 6px 0; padding: 4px 0; }
              .label { font-weight: bold; min-width: 220px; }
              .value { flex: 1; }
              hr { border: none; border-top: 1px solid #ddd; margin: 15px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
              .visit-info { background-color: #f0fdf4; padding: 10px; border-left: 3px solid #059669; margin-bottom: 20px; }
              .badge { display: inline-block; padding: 2px 8px; margin: 2px 0; border-radius: 3px; font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>PAST MEDICAL RECORD</h1>
            <h2>Patient Information</h2>
            
            <div class="visit-info">
              <div class="row"><span class="label">Patient Name:</span> <span class="value">${
                woman.fullName
              }</span></div>
              <div class="row"><span class="label">Folder Number:</span> <span class="value">${
                woman.folderNumber
              }</span></div>
              <div class="row"><span class="label">Phone:</span> <span class="value">${
                woman.phoneNumber
              }</span></div>
              <div class="row"><span class="label">Age:</span> <span class="value">${
                woman.age
              } years</span></div>
              <div class="row"><span class="label">Marital Status:</span> <span class="value">${
                woman.maritalStatus
              }</span></div>
            </div>
            
            <h2>Visit Information</h2>
            <div class="row"><span class="label">Visit Date:</span> <span class="value">${new Date(
              selectedRecord.visitDate
            ).toLocaleDateString()} ${new Date(
        selectedRecord.visitDate
      ).toLocaleTimeString()}</span></div>
            <div class="row"><span class="label">Recorded By:</span> <span class="value">${
              selectedRecord.recordedBy?.name || "N/A"
            }</span></div>
            
            <h2>Vital Signs & Measurements</h2>
            <div class="row"><span class="label">Blood Pressure:</span> <span class="value">${
              selectedRecord.bloodPressure
            }</span></div>
            <div class="row"><span class="label">Height:</span> <span class="value">${
              selectedRecord.height
            } cm</span></div>
            <div class="row"><span class="label">Weight:</span> <span class="value">${
              selectedRecord.weight
            } kg</span></div>
            <div class="row"><span class="label">Gestational Age:</span> <span class="value">${
              selectedRecord.gestationalAge
            } weeks</span></div>
            
            <h2>Laboratory Test Results</h2>
            <div class="row"><span class="label">HBsAg Result:</span> <span class="value">${
              selectedRecord.hbsAgResult
            }</span></div>
            <div class="row"><span class="label">G6PD Status:</span> <span class="value">${
              selectedRecord.g6pdStatus
            }</span></div>
            <div class="row"><span class="label">Sickling Status:</span> <span class="value">${
              selectedRecord.sicklingStatus
            }</span></div>
            <div class="row"><span class="label">Syphilis Screening:</span> <span class="value">${
              selectedRecord.syphilisScreeningStatus
            }</span></div>
            <div class="row"><span class="label">TB Status:</span> <span class="value">${
              selectedRecord.tbStatus
            }</span></div>
            
            <h2>HIV Status & Treatment</h2>
            <div class="row"><span class="label">HIV Status at Registration:</span> <span class="value">${
              selectedRecord.hivStatusAtRegistration
            }</span></div>
            <div class="row"><span class="label">HIV Retest at 34 Weeks:</span> <span class="value">${
              selectedRecord.hivRetestAt34Weeks
            }</span></div>
            <div class="row"><span class="label">ART Treatment After Registration:</span> <span class="value">${
              selectedRecord.artTreatmentAfterRegistration ? "Yes" : "No"
            }</span></div>
            <div class="row"><span class="label">ART Treatment After Retest:</span> <span class="value">${
              selectedRecord.artTreatmentAfterRetest ? "Yes" : "No"
            }</span></div>
            
            <h2>Visit Notes</h2>
            <p>${
              selectedRecord.visitNotes || "No notes recorded for this visit"
            }</p>
            
            <div class="footer">
              <hr>
              <p><strong>HISTORICAL RECORD - PAST VISIT</strong></p>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>This document contains medical data from a previous patient visit.</p>
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
          <p className="text-gray-600 text-lg font-medium">
            Loading records...
          </p>
        </div>
      </div>
    );
  }

  if (!woman) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/dashboard/pregnant-women/${woman._id}`)
            }
            className="mb-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Records
          </Button>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Past Medical Records
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {woman.fullName} - Folder #: {woman.folderNumber}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Viewing historical visit data - Select a visit to view details,
                download or print
              </p>
            </div>
            <Button
              onClick={() =>
                router.push(`/dashboard/pregnant-women/${woman._id}`)
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Visit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records List */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-emerald-100 shadow-md">
              <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <CardTitle className="text-lg font-semibold text-emerald-900">
                  Visit History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {records.length === 0 ? (
                  <div className="py-6 text-center">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No past records found
                    </p>
                  </div>
                ) : (
                  records.map((record) => (
                    <button
                      key={record._id}
                      onClick={() => setSelectedRecord(record)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedRecord?._id === record._id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-200"
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-900">
                        {new Date(record.visitDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {record.gestationalAge}w gestation
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        BP: {record.bloodPressure}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Record Details */}
          <div className="lg:col-span-2">
            {records.length === 0 ? (
              <Card className="border-2 border-emerald-100 shadow-md">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Past Records Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    This patient doesn't have any past visit records yet.
                    Records will appear here after the first follow-up visit.
                  </p>
                  <Button
                    onClick={() =>
                      router.push(`/dashboard/pregnant-women/${woman._id}`)
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Visit Record
                  </Button>
                </CardContent>
              </Card>
            ) : selectedRecord ? (
              <>
                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={generatePDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 bg-transparent hover:bg-emerald-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>

                <Tabs defaultValue="vitals" className="space-y-4">
                  <TabsList className="bg-emerald-100">
                    <TabsTrigger value="vitals">Vitals</TabsTrigger>
                    <TabsTrigger value="tests">Tests</TabsTrigger>
                    <TabsTrigger value="hiv">HIV/TB</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="vitals">
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
                              Blood Pressure
                            </p>
                            <p className="text-base text-gray-900 font-semibold">
                              {selectedRecord.bloodPressure}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">
                              Gestational Age
                            </p>
                            <p className="text-base text-gray-900 font-semibold">
                              {selectedRecord.gestationalAge} weeks
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">
                              Height
                            </p>
                            <p className="text-base text-gray-900">
                              {selectedRecord.height} cm
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">
                              Weight
                            </p>
                            <p className="text-base text-gray-900">
                              {selectedRecord.weight} kg
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tests">
                    <Card className="border-2 border-emerald-100 shadow-md">
                      <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                        <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-600" />
                          Laboratory Test Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              HBsAg Result
                            </p>
                            {getStatusBadge(selectedRecord.hbsAgResult)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              G6PD Status
                            </p>
                            {getStatusBadge(selectedRecord.g6pdStatus)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              Sickling Status
                            </p>
                            {getStatusBadge(selectedRecord.sicklingStatus)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              Syphilis Screening
                            </p>
                            {getStatusBadge(
                              selectedRecord.syphilisScreeningStatus
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="hiv">
                    <Card className="border-2 border-emerald-100 shadow-md">
                      <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                        <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-600" />
                          HIV Status & TB Screening
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              HIV Status at Registration
                            </p>
                            {getStatusBadge(
                              selectedRecord.hivStatusAtRegistration
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              HIV Retest at 34 Weeks
                            </p>
                            {getStatusBadge(selectedRecord.hivRetestAt34Weeks)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              TB Status
                            </p>
                            {getStatusBadge(selectedRecord.tbStatus)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              TB Treatment
                            </p>
                            {getBooleanBadge(selectedRecord.tbTreatment)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes">
                    <Card className="border-2 border-emerald-100 shadow-md">
                      <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                        <CardTitle className="text-lg font-semibold text-emerald-900">
                          Visit Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedRecord.visitNotes ||
                            "No notes recorded for this visit"}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card className="border-2 border-emerald-100 shadow-md">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Select a record from the history to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
