import AdminNavbar from "@/components/AdminNavbar";
import AdminSidebar from "@/components/AdminSidebar";

export { AdminNavbar, AdminSidebar };

import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Phone,
  Settings,
  UserCog,
  History,
  CalendarRange,
  PhoneCall,
  User2,
  PhoneIncoming,
  UserX,
  BarChart3,
  MessageSquareText,
} from "lucide-react";

export const AdminSidebarMenu = [
  {
    id: 1,
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: 2,
    title: "Users",
    href: "/dashboard/users",
    icon: User2,
  },
  {
    id: 3,
    title: "Pregnant Women",
    href: "/dashboard/pregnant-women",
    icon: Users,
  },
  {
    id: 4,
    title: "Appointments",
    href: "/dashboard/appointments",
    icon: Calendar,
  },
  {
    id: 5,
    title: "Public Health Records",
    href: "/dashboard/public-health-records",
    icon: History,
  },
  {
    id: 6,
    title: "Past Appointments",
    href: "/dashboard/appointments/past-appointments",
    icon: CalendarRange,
  },
  {
    id: 7,
    title: "SMS & Call Log",
    href: "/dashboard/reminders",
    icon: PhoneCall,
  },
  {
    id: 8,
    title: "Calls & Outcomes",
    href: "/dashboard/calls",
    icon: PhoneIncoming,
  },
  {
    id: 9,
    title: "Defaulters",
    href: "/dashboard/defaulters",
    icon: UserX,
  },
  {
    id: 10,
    title: "Analytics & Reports",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    id: 11,
    title: "SMS Templates (Twi)",
    href: "/dashboard/sms-templates",
    icon: MessageSquareText,
  },
];
