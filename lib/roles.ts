// Who may do what. Safe to import from client components.
//
// admin: everything, including deleting records and managing user accounts.
// staff: view, add and edit records; cannot delete or manage users.

export const ROLES = ["admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  staff: "Staff",
};

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Deleting any record is reserved for admins. */
export const canDelete = (role: string | null | undefined) => role === "admin";

/** Creating, editing and deleting user accounts is reserved for admins. */
export const canManageUsers = (role: string | null | undefined) =>
  role === "admin";
