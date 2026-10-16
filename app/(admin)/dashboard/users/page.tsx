"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Loader2,
  Trash2,
  Search,
  Edit2,
  Users,
  UserPlus,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AddUserDialog, type CreatedUser } from "@/components/add-user-dialog";
import { ROLE_LABELS } from "@/lib/roles";
import { errorMessage } from "@/lib/utils";

type User = CreatedUser;

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(dateString));
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "delete">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber ?? "").includes(searchTerm)
  );

  const adminCount = users.filter((u) => u.role === "admin").length;
  const adminsWithoutPhone = users.filter((u) => u.role === "admin" && !u.phoneNumber);
  const staffCount = users.filter((u) => u.role === "staff").length;

  const handleOpenDialog = (user: User, mode: "edit" | "delete") => {
    setSelectedUser(user);
    setDialogMode(mode);
    setSelectedRole(user.role);
    setPhoneInput(user.phoneNumber ?? "");
    setDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole, phoneNumber: phoneInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, ...data.user } : u)));
      toast.success("User updated successfully");
      setDialogOpen(false);
    } catch (error) {
      console.error("Update user error:", error);
      toast.error((error as Error).message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers(users.filter((u) => u.id !== selectedUser.id));
      toast.success("User deleted successfully");
      setDialogOpen(false);
    } catch (error) {
      console.error("Delete user error:", error);
      toast.error(errorMessage(error) || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-700 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                User Management
              </h1>
              <p className="text-gray-600 text-base">
                Manage hospital system users and their access permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setAddOpen(true)}
                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.length}
                  </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Administrators
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {adminCount}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Staff
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {staffCount}
                  </p>
                </div>
                <div className="bg-teal-100 p-3 rounded-lg">
                  <UserPlus className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {adminsWithoutPhone.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm">
              <strong>
                {adminsWithoutPhone.map((u) => u.name).join(", ")}
              </strong>{" "}
              {adminsWithoutPhone.length === 1 ? "has" : "have"} no phone number, so{" "}
              they will not receive missed-appointment,
              escalation or danger-sign alert SMS. Click the edit button to add one.
            </p>
          </div>
        )}

        {/* Search Section */}
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="text-xl text-gray-900">All Users</CardTitle>
            <CardDescription className="text-base">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
              found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredUsers.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                          Name
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                          Email
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                          Phone
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                          Role
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                          Created
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-gray-700 text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <tr
                          key={user.id}
                          className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                        >
                          <td className="py-4 px-6 font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {user.email}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {user.phoneNumber ?? (
                              <span className="text-gray-400 italic">Not set</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                user.role === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {user.role === "admin" && (
                                <Shield className="h-3 w-3 mr-1" />
                              )}
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(user, "edit")}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(user, "delete")}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {filteredUsers.map((user) => (
                    <Card
                      key={user.id}
                      className="border-emerald-100 shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-lg">
                                {user.name}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-2 ${
                                  user.role === "admin"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {user.role === "admin" && (
                                  <Shield className="h-3 w-3 mr-1" />
                                )}
                                {ROLE_LABELS[user.role]}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(user, "edit")}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(user, "delete")}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                Email
                              </p>
                              <p className="text-sm text-gray-900 break-all">
                                {user.email}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                Phone
                              </p>
                              <p className="text-sm text-gray-900">
                                {user.phoneNumber ?? (
                                  <span className="text-gray-400 italic">Not set</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                Created
                              </p>
                              <p className="text-sm text-gray-900 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(user.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No users found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {dialogMode === "edit" ? "Edit User" : "Delete User"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update the user's role and phone number"
                : "This action cannot be undone. They will no longer be able to log in."}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Name
                  </p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedUser.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Email
                  </p>
                  <p className="text-sm text-gray-900 break-all">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              {dialogMode === "edit" && (
                <div>
                  <label
                    htmlFor="user-phone"
                    className="text-sm font-semibold text-gray-700 mb-2 block"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="user-phone"
                    type="tel"
                    placeholder="e.g. 0244123456"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  {selectedRole === "admin" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Admins receive missed-appointment and danger-sign alert SMS on this number.
                    </p>
                  )}
                </div>
              )}

              {dialogMode === "edit" && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    User Role
                  </label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500">
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
                </div>
              )}

              {dialogMode === "delete" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete{" "}
                    <strong>{selectedUser.name}</strong>? Their account will be
                    removed; records they created are kept.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={
                dialogMode === "edit" ? handleEditUser : handleDeleteUser
              }
              disabled={isSubmitting}
              className={
                dialogMode === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dialogMode === "edit" ? "Updating..." : "Deleting..."}
                </>
              ) : (
                <>{dialogMode === "edit" ? "Save Changes" : "Delete User"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(user) => setUsers((prev) => [user, ...prev])}
      />
    </div>
  );
}
