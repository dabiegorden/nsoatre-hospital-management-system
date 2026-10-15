import "server-only";

const VAPI_BASE_URL = "https://api.vapi.ai";

export class VapiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(
      `Vapi API error ${status}: ${
        typeof body === "object" && body && "message" in body
          ? JSON.stringify((body as { message: unknown }).message)
          : JSON.stringify(body)
      }`
    );
    this.name = "VapiError";
  }
}

export function isVapiConfigured() {
  return Boolean(process.env.VAPI_PRIVATE_API_KEY);
}

/** Minimal REST client for the Vapi API (server-side only). */
export async function vapiRequest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const key = process.env.VAPI_PRIVATE_API_KEY;
  if (!key) throw new Error("VAPI_PRIVATE_API_KEY is not configured");

  const res = await fetch(VAPI_BASE_URL + path, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new VapiError(res.status, data);
  return data as T;
}

/** The subset of Vapi's call object this app reads. */
export interface VapiCall {
  id: string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
  artifact?: {
    transcript?: string;
    recordingUrl?: string;
    recording?: { mono?: { combinedUrl?: string } };
    messages?: unknown[];
    structuredOutputs?: Record<string, { name?: string; result?: unknown }>;
  };
  messages?: unknown[];
}
