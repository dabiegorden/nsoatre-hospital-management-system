"use client";

import { User2, ChevronUp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";

import { AdminSidebarMenu } from "@/constants";
import { canManageUsers } from "@/lib/roles";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface userInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

const AdminSidebar = () => {
  const pathname = usePathname();
  const { setOpenMobile, isMobile, state } = useSidebar();
  const [user, setUser] = useState<userInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // const response = await fetch("/api/auth/me");
        // if (response.ok) {
        //   const data = await response.json();
        //   setUser(data.user);
        // }
        // toast.success("User info fetched successfully.");
        const controller = new AbortController();
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
        return () => controller.abort(); // if you add cleanup
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast.error("Error fetching user info");
      }
    };
    fetchUser();
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
        const msg = await response.text().catch(() => "");
        toast.error(msg || "Error logging out");
        return;
      }
      const data = await response.json().catch(() => ({}));
      toast.success(data.message || "Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error logging out", error);
      toast.error("Error logging out!");
    }
  };

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      // collapsible="icon"
      className="border-r border-emerald-200/50 bg-white shadow-sm overflow-hidden"
    >
      <SidebarHeader className="py-4 md:py-6 px-3 md:px-4 bg-linear-to-br from-emerald-600 via-emerald-500 to-teal-500 shadow-md">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-white/10 text-white font-semibold text-sm md:text-base transition-all duration-200 h-12 md:h-auto"
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-2 md:gap-3"
                onClick={handleLinkClick}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/95 flex items-center justify-center shadow-lg shrink-0">
                  <Image
                    src="/assets/pregnant2.png"
                    alt="logo"
                    width={24}
                    height={24}
                    className="rounded-md md:rounded-lg"
                    priority
                  />
                </div>
                <span className="text-white font-bold tracking-tight">
                  {user?.name || "N/A"}
                </span>
              </Link>
            </SidebarMenuButton>
            <span className="text-slate-100 text-sm">
              Nsoatre Government Hospital.
            </span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-linear-to-r from-emerald-200 via-emerald-300 to-emerald-200" />

      <SidebarContent className="py-3 md:py-4 bg-linear-to-b from-emerald-50/50 via-white to-teal-50/30">
        <SidebarGroup>
          <SidebarGroupLabel className="text-emerald-800 font-bold text-[10px] md:text-xs uppercase tracking-wider px-3 md:px-4 mb-2 opacity-90">
            Nsoatre Hospital
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 md:space-y-1 px-2">
              {AdminSidebarMenu.filter(
                (item) => !("adminOnly" in item) || canManageUsers(user?.role)
              ).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      className={`
                        hover:bg-emerald-100 hover:text-emerald-700 
                        rounded-lg transition-all duration-200 group
                        ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700 shadow-sm"
                            : "text-gray-700"
                        }
                        h-10 md:h-auto
                      `}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5"
                        onClick={handleLinkClick}
                      >
                        <div
                          className={`
                          ${isActive ? "text-emerald-700" : "text-emerald-600"} 
                          group-hover:text-emerald-700 
                          group-hover:scale-110 
                          transition-transform
                          shrink-0
                        `}
                        >
                          <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <span
                          className={`
                          font-medium 
                          ${
                            isActive
                              ? "text-emerald-800 font-semibold"
                              : "text-gray-700"
                          } 
                          group-hover:text-emerald-800
                          text-sm md:text-[0.9rem]
                          truncate
                        `}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* <SidebarFooter className="p-3 md:p-4 border-t border-emerald-200/50 bg-linear-to-br from-emerald-50/80 via-white to-teal-50/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="hover:bg-emerald-100 rounded-lg transition-all duration-200 p-2 md:p-3 h-12 md:h-auto"
                  suppressHydrationWarning
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                    <User2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-800 text-sm md:text-base truncate">
                    {user?.name || "N/A"}
                  </span>
                  <ChevronUp className="ml-auto text-emerald-600 w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 md:w-48 border-emerald-200/50 shadow-xl bg-white/95 backdrop-blur-sm"
                suppressHydrationWarning
              >
                <DropdownMenuItem className="hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 text-sm md:text-base">
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 text-sm md:text-base">
                  Setting
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-red-50 hover:text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600 text-sm md:text-base">
                  <span onClick={handleLogout} className="text-red-600">
                    Logout
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter> */}
    </Sidebar>
  );
};

export default AdminSidebar;
