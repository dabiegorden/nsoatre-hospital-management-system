"use client";

import { LogOut, Mail, Menu, Phone, Shield } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { isAbortError } from "@/lib/utils";

interface userInfo {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
}

const AdminNavbar = () => {
  const { toggleSidebar } = useSidebar();
  const [user, setUser] = useState<userInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          toast.error("Not authenticated");
        }
      } catch (error) {
        if (isAbortError(error)) return;
        console.error("Error fetching user info:", error);
        toast.error("Error fetching user info");
      }
    };
    fetchUser();
    return () => controller.abort();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle logout function
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        credentials: "include",
        method: "POST",
      });
      if (!response.ok) {
        toast.error("Error logging out!");
      }
      const data = await response.json();
      toast.success(data.message);
      router.push("/");
    } catch (error) {
      console.error("Error logging out", error);
      toast.error("Error logging out!");
    }
  };

  return (
    <nav className="p-4 flex items-center justify-between sticky top-0 bg-linear-to-r-to-r from-white via-emerald-50/30 to-white backdrop-blur-sm z-10 border-b border-emerald-100 shadow-sm shrink-0">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="icon"
          className="cursor-pointer border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200 rounded-lg shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden sm:block truncate">
          <h2 className="text-lg font-semibold bg-linear-to-r-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
            Dashboard
          </h2>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none group">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white font-semibold flex items-center justify-center text-sm ring-2 ring-emerald-200 group-hover:ring-emerald-400">
                {user?.name ? getInitials(user?.name) : "-"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role || "Admin"}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            sideOffset={10}
            align="end"
            className="w-56 border-emerald-200 shadow-lg"
          >
            <DropdownMenuLabel className="text-emerald-700 font-semibold">
              {user?.name || "-"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-emerald-100" />

            <DropdownMenuItem className="hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors duration-150 rounded-md my-1">
              <Mail className="h-4 w-4 mr-2 text-emerald-600" />
              <span>{user?.email || "-"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors duration-150 rounded-md my-1">
              <Phone className="h-4 w-4 mr-2 text-emerald-600" />
              <span>{user?.phoneNumber || "-"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors duration-150 rounded-md my-1">
              <Shield className="h-4 w-4 mr-2 text-emerald-600" />
              <span>{user?.role || "-"}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-emerald-100" />

            <DropdownMenuItem className="hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors duration-150 rounded-md my-1">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="text-red-600" onClick={handleLogout}>
                Logout
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default AdminNavbar;
