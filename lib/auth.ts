import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@/lib/roles";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

// Token Payload Interface
export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  role: Role;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export async function generateToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secretKey);

  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Extract auth token from cookies
export function getTokenFromCookies(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;

  const authCookie = cookieHeader
    .split(";")
    .find((cookie) => cookie.trim().startsWith("auth-token="));

  if (!authCookie) return null;

  return authCookie.split("=")[1];
}
