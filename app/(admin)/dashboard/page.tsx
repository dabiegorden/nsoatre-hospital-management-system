"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Phone,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  BellRing,
  UserCheck,
  PhoneCall,
  Archive,
  FileText,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AutomationStatus } from "@/components/automation-status";

interface userInfo {
  name: string;
  phoneNumber?: string | null;
  email: string;
  role: string;
}

interface DashboardStats {
  totalPregnantWomen: number;
  appointmentsToday: number;
  smsSent: number;
  callsMade: number;
  callsAnswered?: number;
  smsFailed?: number;
  completedAppointments: number;
  totalAppointments: number;
  totalUsers: number;
  pastAppointments: number;
  pastRecords: number;
  publicHealthRecords: number;
}

const DashboardPage = () => {
  const [user, setUser] = useState<userInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Wait until user is known (auth initialized)
        const userRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        if (!userRes.ok) throw new Error("Failed to get user");
        const userData = await userRes.json();
        setUser(userData.user);

        // Only then fetch the rest
        const [statsRes, todayRes] = await Promise.all([
          fetch("/api/dashboard/stats", {
            method: "GET",
            credentials: "include",
          }),
          fetch("/api/appointments?today=true&limit=5", {
            method: "GET",
            credentials: "include",
          }),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        }
        if (todayRes.ok) {
          const todayData = await todayRes.json();
          setTodayAppointments(todayData.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Error fetching dashboard data!");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statsCards = [
    {
      id: 1,
      title: "Total Pregnant Women",
      value: stats?.totalPregnantWomen ?? "—",
      change: stats?.completedAppointments
        ? `${stats.completedAppointments} completed`
        : "—",
      trend: "up",
      icon: Users,
      color: "emerald",
      bgGradient: "from-emerald-500 to-emerald-600",
    },
    {
      id: 2,
      title: "Appointments Today",
      value: stats?.appointmentsToday ?? "—",
      change: stats?.totalAppointments
        ? `${stats.totalAppointments} total`
        : "—",
      trend: "neutral",
      icon: Calendar,
      color: "teal",
      bgGradient: "from-teal-500 to-teal-600",
    },
    {
      id: 3,
      title: "SMS Sent",
      value: stats?.smsSent ?? "—",
      change: stats?.smsSent ? `${stats.smsSent} messages` : "—",
      trend: "up",
      icon: MessageSquare,
      color: "green",
      bgGradient: "from-green-500 to-green-600",
    },
    {
      id: 4,
      title: "Calls Made",
      value: stats?.callsMade ?? "—",
      change: stats?.callsMade ? `${stats.callsMade} calls` : "—",
      trend: "up",
      icon: PhoneCall,
      color: "lime",
      bgGradient: "from-lime-500 to-lime-600",
    },
    {
      id: 5,
      title: "Total Users",
      value: stats?.totalUsers ?? "—",
      change: stats?.totalUsers ? `${stats.totalUsers} registered` : "—",
      trend: "up",
      icon: UserCheck,
      color: "blue",
      bgGradient: "from-blue-500 to-blue-600",
    },
    {
      id: 6,
      title: "Past Appointments",
      value: stats?.pastAppointments ?? "—",
      change: stats?.pastAppointments
        ? `${stats.pastAppointments} completed/missed`
        : "—",
      trend: "neutral",
      icon: Archive,
      color: "purple",
      bgGradient: "from-purple-500 to-purple-600",
    },
    {
      id: 7,
      title: "Medical Records",
      value: stats?.pastRecords ?? "—",
      change: stats?.pastRecords ? `${stats.pastRecords} records` : "—",
      trend: "up",
      icon: FileText,
      color: "rose",
      bgGradient: "from-rose-500 to-rose-600",
    },
    {
      id: 8,
      title: "Public Health Records",
      value: stats?.publicHealthRecords ?? "—",
      change: stats?.publicHealthRecords
        ? `${stats.publicHealthRecords} records`
        : "—",
      trend: "up",
      icon: Clipboard,
      color: "indigo",
      bgGradient: "from-indigo-500 to-indigo-600",
    },
  ];

  const rate = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  const communicationStats = [
    {
      id: 1,
      channel: "Reminder calls placed · answer rate",
      count: stats?.callsMade ?? 0,
      icon: Phone,
      success: rate(stats?.callsAnswered ?? 0, stats?.callsMade ?? 0),
    },
    {
      id: 2,
      channel: "SMS sent · delivery rate",
      count: stats?.smsSent ?? 0,
      icon: MessageSquare,
      success: rate(stats?.smsSent ?? 0, (stats?.smsSent ?? 0) + (stats?.smsFailed ?? 0)),
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-emerald-50/30 via-white to-green-50/20 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-2">
          Nsoatre Antenatal Care Dashboard
        </h1>
        <p className="text-gray-600">
          {`Welcome back! ${
            (user?.name && user.name.slice(0, 5)) || "Admin"
          } Here's what's happening with your patients today.`}
        </p>
      </div>

      <AutomationStatus defaultPhone={user?.phoneNumber ?? ""} />

      {/* Stats Grid - Updated to display 8 cards with responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-xl bg-linear-to-br ${stat.bgGradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.trend === "up" && (
                  <span className="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? (
                  <span className="text-emerald-600 text-xl">Loading...</span>
                ) : (
                  stat.value
                )}
              </p>
              {stat.trend === "neutral" && (
                <p className="text-xs text-gray-500">{stat.change}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Today's Appointments
            </h2>
            <Link
              href="/dashboard/appointments"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All
            </Link>
          </div>
          <Link href="/dashboard/appointments">
            <div className="space-y-3">
              {todayAppointments.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No appointments scheduled for today.
                </p>
              ) : (
                todayAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center justify-between p-4 bg-linear-to-r from-emerald-50/50 to-transparent rounded-xl border border-emerald-100 hover:shadow-md transition-all duration-200 hover:border-emerald-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                        {appointment.patientName?.split(" ")[0][0] || "P"}
                        {appointment.patientName?.split(" ")[1]?.[0] || ""}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {appointment.patientName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {appointment.notes || "Routine Checkup"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">
                          {appointment.appointmentTime}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            appointment.status === "confirmed" ||
                            appointment.status === "scheduled"
                              ? "bg-emerald-100 text-emerald-700"
                              : appointment.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : appointment.status === "missed"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Communication Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BellRing className="w-5 h-5 text-emerald-600" />
          Communication Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {communicationStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="p-5 bg-linear-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5 text-emerald-600" />
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.channel}</p>
                <p className="text-xl font-bold text-emerald-500 mb-2">
                  {loading ? "—" : stat.count}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 to-emerald-600 rounded-full"
                      style={{ width: `${stat.success}%` }}
                    />
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {stat.success}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/appointments"
          className="p-6 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <Calendar className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-lg mb-1">Schedule Appointment</h3>
          <p className="text-emerald-100 text-sm">Book a new patient visit</p>
        </Link>

        <Link
          href="/dashboard/pregnant-women"
          className="p-6 bg-linear-to-br from-green-500 to-green-600 rounded-2xl text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <UserCheck className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-lg mb-1">Patient Records</h3>
          <p className="text-green-100 text-sm">View and manage records</p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
