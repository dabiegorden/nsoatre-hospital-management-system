import { getTableColumns, type Column, type Table } from "drizzle-orm";

/**
 * Thrown when request input can't be stored. `errors` is the list of
 * messages returned to the client.
 */
export class ValidationError extends Error {
  name = "ValidationError";
  constructor(public errors: string[]) {
    super(errors.join(", "));
  }
}

const SYSTEM_FIELDS = ["id", "_id", "createdAt", "updatedAt"];

/**
 * Turns an untrusted request body into values for `table`: unknown keys are
 * dropped, strings trimmed, dates and numbers cast, "" treated as empty, and
 * required columns enforced.
 */
export function pickInput<T extends Table>(
  table: T,
  body: Record<string, unknown> | null | undefined,
  omit: string[] = []
): Partial<T["$inferInsert"]> {
  const columns: Record<string, Column> = getTableColumns(table);
  const result: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, raw] of Object.entries(body ?? {})) {
    const column = columns[key];
    if (!column || raw === undefined) continue;
    if (SYSTEM_FIELDS.includes(key) || omit.includes(key)) continue;

    let value: unknown = typeof raw === "string" ? raw.trim() : raw;

    // "" only means something for free-text columns; elsewhere it's "no value".
    if (value === "" && (column.dataType !== "string" || column.enumValues)) {
      value = null;
    }

    if (value === null || value === "") {
      if (column.notNull && !column.hasDefault) {
        errors.push(`${key} is required`);
        continue;
      }
      if (value === null) {
        // Required columns fall back to their default; others are cleared.
        if (!column.notNull) result[key] = null;
        continue;
      }
    }

    switch (column.dataType) {
      case "date": {
        const date =
          value instanceof Date ? value : new Date(value as string | number);
        if (Number.isNaN(date.getTime())) errors.push(`${key} is not a valid date`);
        else result[key] = date;
        break;
      }
      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) errors.push(`${key} must be a number`);
        else result[key] = num;
        break;
      }
      case "boolean":
        result[key] = value === true || value === "true";
        break;
      case "string":
        if (column.enumValues && !column.enumValues.includes(String(value))) {
          errors.push(
            `${key} must be one of: ${column.enumValues.join(", ")}`
          );
        } else {
          result[key] = String(value);
        }
        break;
      default:
        result[key] = value;
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return result as Partial<T["$inferInsert"]>;
}

// Foreign-key columns and the field name the API has always exposed them as.
const REFERENCE_FIELDS: Record<string, string> = {
  registeredById: "registeredBy",
  createdById: "createdBy",
  recordedById: "recordedBy",
  patientId: "patient",
};

// jsonb columns holding stored payloads; returned exactly as saved.
const JSON_FIELDS = new Set(["response", "sentBy"]);

/**
 * Shapes a row into the response format the frontend expects: `id` becomes
 * `_id`, and a reference is either the loaded related object or the bare id.
 */
/** A row in the API's response shape (`_id` instead of `id`). */
export type ApiRecord = Record<string, unknown>;

export function toApi<T>(row: T[]): ApiRecord[];
export function toApi<T>(row: T): ApiRecord;
export function toApi(row: unknown): unknown {
  if (Array.isArray(row)) return row.map(toApi);
  if (row === null || typeof row !== "object" || row instanceof Date) {
    return row;
  }

  const out: ApiRecord = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") {
      out._id = value;
    } else if (key === "password") {
      continue;
    } else if (key in REFERENCE_FIELDS) {
      const field = REFERENCE_FIELDS[key];
      if (!(field in row)) out[field] = value;
    } else if (JSON_FIELDS.has(key)) {
      out[key] = value;
    } else {
      out[key] = toApi(value);
    }
  }
  return out;
}

/** Columns exposed when a user is embedded in another record. */
export const userSummary = { columns: { id: true, name: true, email: true } };

/** Escapes LIKE wildcards so user search text is matched literally. */
export function likePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.max(
    1,
    Number.parseInt(searchParams.get("limit") || "10") || 10
  );
  return { page, limit, offset: (page - 1) * limit };
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_unique: "Email already exists",
  pregnant_women_folder_number_unique: "Folder number already exists",
  pregnant_women_phone_number_unique:
    "A record with this phone number already exists",
  public_health_records_registration_number_unique:
    "Registration number already exists",
  sms_templates_name_unique: "A template with this name already exists",
};

/**
 * Maps validation and Postgres constraint errors to a 400 response body.
 * Returns null for anything else (connection failures, bugs, ...).
 */
/** The fields we read from a Postgres driver error. */
type PgError = { code?: string; constraint?: string; column?: string; message?: string };

/** The Postgres error behind `error` (drizzle puts it on `cause`), if any. */
function pgErrorOf(error: unknown): PgError | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && error.code) return error as PgError;
  const cause = "cause" in error ? error.cause : undefined;
  return cause && typeof cause === "object" && "code" in cause
    ? (cause as PgError)
    : undefined;
}

export function describeDbError(
  error: unknown
): { message: string; errors: string[] } | null {
  if (error instanceof ValidationError) {
    return { message: "Validation error", errors: error.errors };
  }

  const pgError = pgErrorOf(error);
  const code = pgError?.code;
  if (!pgError || !code) return null;

  const detail = (msg: string) => ({ message: msg, errors: [msg] });

  switch (code) {
    case "23505": // unique_violation
      return detail(
        (pgError.constraint && CONSTRAINT_MESSAGES[pgError.constraint]) ||
          "Record already exists"
      );
    case "23502": // not_null_violation
      return detail(
        `${
          pgError.column
            ? pgError.column.replace(/_([a-z])/g, (_: string, c: string) =>
                c.toUpperCase()
              )
            : "A required field"
        } is required`
      );
    case "23514": // check_violation
      return detail(
        `Value out of allowed range (${pgError.constraint || "check"})`
      );
    case "23503": // foreign_key_violation
      return detail("Referenced record not found");
    case "22P02": // invalid_text_representation (bad enum value etc.)
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
      return detail(pgError.message || "Invalid value");
    default:
      return null;
  }
}

export function isUniqueViolation(error: unknown) {
  return pgErrorOf(error)?.code === "23505";
}

/**
 * Relational-query `extras` adding each patient's missed-appointment count
 * (used for the risk score). Pass as `extras: missedAppointmentsExtra`.
 */
export const missedAppointmentsExtra = (
  table: { id: unknown },
  { sql }: { sql: typeof import("drizzle-orm").sql }
) => ({
  missedAppointments:
    sql<number>`(select count(*)::int from appointments a where a.patient_id = ${table.id} and a.status = 'missed')`.as(
      "missed_appointments"
    ),
});
