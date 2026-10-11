import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminNavbar, AdminSidebar } from "@/constants";
import { cookies } from "next/headers";
import React from "react";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full">
        {/* LEFT: Sidebar */}
        <div className="flex-shrink-0 print:hidden">
          <AdminSidebar />
        </div>

        {/* RIGHT: Navbar + Content */}
        <main className="flex-1 w-full overflow-hidden">
          <div className="print:hidden">
            <AdminNavbar />
          </div>
          <div className="px-4">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
