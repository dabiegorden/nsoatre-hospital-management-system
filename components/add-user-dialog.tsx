"use client";

import { useState } from "react";
import { Loader2, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/utils";
import type { Role } from "@/lib/roles";

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  role: "staff" as Role,
};

const inputClass =
  "h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500";

/** Lets an admin create a staff or admin account that can log in right away. */
export function AddUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: CreatedUser) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const close = (next: boolean) => {
    if (!next) setForm(EMPTY_FORM);
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create user");

      onCreated(data.user);
      toast.success(
        `${data.user.name} can now log in as ${form.role === "admin" ? "an admin" : "staff"}`
      );
      close(false);
    } catch (error) {
      toast.error(errorMessage(error) || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl">Add User</DialogTitle>
            <DialogDescription>
              Create an account for a staff member or another admin. Share the
              email and password with them so they can log in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="new-user-name" className="text-sm font-semibold text-gray-700 mb-2 block">
                Full Name
              </label>
              <Input id="new-user-name" required value={form.name} onChange={set("name")} className={inputClass} />
            </div>
            <div>
              <label htmlFor="new-user-email" className="text-sm font-semibold text-gray-700 mb-2 block">
                Email
              </label>
              <Input
                id="new-user-email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={set("email")}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-user-phone" className="text-sm font-semibold text-gray-700 mb-2 block">
                Phone Number
              </label>
              <Input
                id="new-user-phone"
                type="tel"
                required
                placeholder="e.g. 0244123456"
                value={form.phoneNumber}
                onChange={set("phoneNumber")}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-user-password" className="text-sm font-semibold text-gray-700 mb-2 block">
                Password
              </label>
              <Input
                id="new-user-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Role</label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm((f) => ({ ...f, role: role as Role }))}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-emerald-600" />
                      <span>Staff</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {form.role === "admin"
                  ? "Admins can do everything, including deleting records and managing users."
                  : "Staff can view, add and edit records, but cannot delete or manage users."}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => close(false)} className="border-gray-300">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
