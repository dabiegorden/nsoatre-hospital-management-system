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
    title: "Calls/SMS Remindes",
    href: "/dashboard/reminders",
    icon: PhoneCall,
  },
];
