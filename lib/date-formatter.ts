// Utility functions for date formatting using JavaScript Intl API

export function formatDate(
  date: Date | string,
  format: "short" | "long" = "short"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (format === "short") {
    // Format: "MMM dd, yyyy" (e.g., "Jan 15, 2024")
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(dateObj);
  }

  // Format: "MMMM dd, yyyy" (e.g., "January 15, 2024")
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(dateObj);
}

export function formatDateTime(date: Date | string): string {
  // Format: "MMM dd, yyyy HH:mm" (e.g., "Jan 15, 2024 14:30")
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dateObj);
}
