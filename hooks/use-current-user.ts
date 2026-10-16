"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/roles";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  role: Role;
}

// One /api/auth/me request shared by every component on the page.
let pending: Promise<CurrentUser | null> | null = null;

function loadCurrentUser() {
  pending ??= fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()).user as CurrentUser) : null))
    .catch(() => null)
    .finally(() => {
      // Refetch on the next mount so a role change shows up after navigation.
      setTimeout(() => (pending = null), 0);
    });
  return pending;
}

/** The signed-in user, or null while loading / when signed out. */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  useEffect(() => {
    let active = true;
    loadCurrentUser().then((u) => active && setUser(u));
    return () => {
      active = false;
    };
  }, []);
  return user;
}
