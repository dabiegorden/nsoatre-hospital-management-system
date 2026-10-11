"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  FileText,
  Users,
  TrendingUp,
  Filter,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "viewer" | "user";
}

interface PublicHealthRecord {
  _id: string;
  registrationNumber: string;
  childName: string;
  motherName: string;
  name: string;
  diagnosis: string;
  recordDate: string;
  recordedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function PublicHealthRecordsPage() {
  const [records, setRecords] = useState<PublicHealthRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentUser(result.user);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  const fetchRecords = async (page = 1, searchQuery = "") => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/public-health-records?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch records");
      }

      const result = await response.json();
      setRecords(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/public-health-records/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }

      setRecords(records.filter((r) => r._id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchRecords(1, "");
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchRecords(1, value);
  };

  const handlePageChange = (newPage: number) => {
    fetchRecords(newPage, search);
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Public Health Records
              </h1>
              <p className="text-slate-600">
                Manage and track child welfare and health records
              </p>
            </div>
            {isAdmin && (
              <Link href="/dashboard/public-health-records/create">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Record
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    Total Records
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {pagination.total}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    All time entries
                  </p>
                </div>
                <div className="p-4 bg-emerald-100 rounded-xl">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    Active Page
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {pagination.page}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    of {pagination.totalPages} pages
                  </p>
                </div>
                <div className="p-4 bg-blue-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    Your Role
                  </p>
                  <p className="text-3xl font-bold text-slate-900 capitalize">
                    {currentUser?.role || "..."}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Access level</p>
                </div>
                <div className="p-4 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg mb-6 bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search by registration number, child name, or mother name..."
                  className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-200 bg-red-50"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Records Table */}
        <Card className="border-0 shadow-lg overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">
                      Registration #
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Child Name
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Mother Name
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Diagnosis
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Record Date
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                          <p className="text-sm font-medium">
                            Loading records...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 bg-slate-100 rounded-full">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              No records found
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {search
                                ? "Try adjusting your search"
                                : "Add your first record to get started"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record, index) => (
                      <TableRow
                        key={record._id}
                        className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <TableCell className="font-semibold text-emerald-600">
                          {record.registrationNumber}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {record.childName}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {record.motherName}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-600">
                          {record.diagnosis}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {new Date(record.recordDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/dashboard/public-health-records/${record._id}`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {isAdmin && (
                              <>
                                <Link
                                  href={`/dashboard/public-health-records/${record._id}/edit`}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                                    title="Edit Record"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Record"
                                  onClick={() => setDeleteId(record._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md border-0 p-4">
            <p className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {pagination.total}
              </span>{" "}
              records
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return pageNum;
                  }
                ).map((page) => (
                  <Button
                    key={page}
                    variant={page === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={
                      page === pagination.page
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white min-w-10"
                        : "border-slate-200 hover:bg-slate-50 min-w-10"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent className="border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                Delete Health Record
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">
                    This action cannot be undone
                  </p>
                  <p className="text-sm text-red-700">
                    Are you sure you want to permanently delete this health
                    record?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Record"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
