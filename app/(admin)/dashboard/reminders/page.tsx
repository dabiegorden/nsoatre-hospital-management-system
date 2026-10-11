"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  _id: string;
  appointmentId: string;
  patientName: string;
  patientPhoneNumber: string;
  reminderType: "sms" | "voice";
  status: "pending" | "sent" | "failed";
  message?: string;
  sentBy: {
    name: string;
    email: string;
  };
  sentAt?: string;
  error?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function RemindersPage() {
  const [user, setUser] = useState<any>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reminderType, setReminderType] = useState("all");
  const [status, setStatus] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          router.push("/");
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("[v0] Failed to fetch user:", error);
        router.push("/");
      }
    };

    fetchUser();
  }, [router]);

  const fetchReminders = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(reminderType !== "all" && { reminderType }),
        ...(status !== "all" && { status }),
      });

      const response = await fetch(`/api/reminders?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reminders");
      }

      const data = await response.json();
      setReminders(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("[v0] Fetch reminders error:", error);
      toast.error("Failed to load reminders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders(1);
  }, []);

  const handleFilter = () => {
    fetchReminders(1);
  };

  const handleReset = () => {
    setSearch("");
    setReminderType("all");
    setStatus("all");
    fetchReminders(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "failed":
        return "bg-red-100 text-red-800 border border-red-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-emerald-900 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with linear background */}
        <div className="mb-8 bg-linear-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Reminder Logs
            </h1>
          </div>
          <p className="text-emerald-50 text-lg ml-15">
            Track and manage all patient communication reminders
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Reminders
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {pagination.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Successfully Sent
                  </p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">
                    {reminders.filter((r) => r.status === "sent").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Failed/Pending
                  </p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {reminders.filter((r) => r.status !== "sent").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 border-0 shadow-lg bg-white">
          <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Search
                </label>
                <Input
                  placeholder="Phone, email, name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {/* Reminder Type Filter */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Type
                </label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="voice">Voice Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 items-end">
                <Button
                  onClick={handleFilter}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-11 shadow-md"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 h-11 border-gray-300 hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reminders Table Card */}
        <Card className="border-0 shadow-lg overflow-hidden bg-white">
          <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600">
            <CardTitle className="text-white">Reminders List</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">
                  Loading reminders...
                </p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-lg">
                  No reminders found
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-emerald-100 bg-emerald-50/50">
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Type
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Patient Name
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Phone Number
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Sent By
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Sent At
                        </th>
                        <th className="px-4 py-4 text-left font-bold text-gray-700">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reminders.map((reminder, index) => (
                        <tr
                          key={reminder._id}
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                  reminder.reminderType === "sms"
                                    ? "bg-blue-100"
                                    : "bg-emerald-100"
                                }`}
                              >
                                {reminder.reminderType === "sms" ? (
                                  <MessageSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Phone className="w-5 h-5 text-emerald-600" />
                                )}
                              </div>
                              <span className="font-semibold capitalize text-gray-800">
                                {reminder.reminderType}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {reminder.patientName || "N/A"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {reminder.patientPhoneNumber}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(reminder.status)}
                              <span
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${getStatusColor(
                                  reminder.status
                                )}`}
                              >
                                {reminder.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <p className="font-semibold text-gray-900">
                                {reminder.sentBy.name}
                              </p>
                              <p className="text-gray-600 text-xs mt-0.5">
                                {reminder.sentBy.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {reminder.sentAt ? (
                              new Date(reminder.sentAt).toLocaleString()
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                            <div className="truncate">
                              {reminder.message || reminder.error || (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t-2 border-gray-100 gap-4">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing{" "}
                    <span className="font-bold text-gray-900">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-gray-900">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-gray-900">
                      {pagination.total}
                    </span>{" "}
                    reminders
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => fetchReminders(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      variant="outline"
                      className="gap-2 border-gray-300 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(pagination.pages, 5) },
                        (_, i) => {
                          let page;
                          if (pagination.pages <= 5) {
                            page = i + 1;
                          } else if (pagination.page <= 3) {
                            page = i + 1;
                          } else if (pagination.page >= pagination.pages - 2) {
                            page = pagination.pages - 4 + i;
                          } else {
                            page = pagination.page - 2 + i;
                          }
                          return (
                            <Button
                              key={page}
                              onClick={() => fetchReminders(page)}
                              variant={
                                pagination.page === page ? "default" : "outline"
                              }
                              className={`w-10 h-10 p-0 ${
                                pagination.page === page
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                  : "border-gray-300 hover:bg-emerald-50"
                              }`}
                            >
                              {page}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      onClick={() => fetchReminders(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      variant="outline"
                      className="gap-2 border-gray-300 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
