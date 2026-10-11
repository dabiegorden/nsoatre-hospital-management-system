"use client";

import type React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Eye, EyeOff, Heart, Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RegisterPage({ className }: { className?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate all fields
    if (!email || !password || !name || !phoneNumber) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }

    if (!secretKey) {
      setError("Admin Secret Key is required");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          phoneNumber,
          secretKey,
          role: "admin", // Always set role to admin
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast.success("Registration successful!");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 min-h-screen items-center justify-center p-4 bg-linear-to-br from-emerald-50 via-teal-50 to-green-100",
        className
      )}
    >
      <Card className="overflow-hidden w-full max-w-4xl shadow-xl border-emerald-100">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white overflow-y-auto max-h-screen md:max-h-none">
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-3 text-center mb-8">
                  <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                    <Heart className="w-8 h-8 text-white" fill="white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-gray-800">
                    Create Admin Account
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 text-balance flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Admin Portal - Nsoatre Hospital
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Field>
                  <FieldLabel
                    htmlFor="name"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Full Name
                  </FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="email"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Email Address
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@nsoatrehospital.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="phoneNumber"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Phone Number
                  </FieldLabel>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="password"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Password
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base pr-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="secretKey"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Admin Secret Key
                  </FieldLabel>
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="Enter admin secret key"
                    required
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    disabled={isLoading}
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 sm:h-12 text-sm sm:text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? "Creating Account..." : "Create Admin Account"}
                  </Button>
                  <p className="text-sm text-center text-gray-600">
                    Already have an account?{" "}
                    <Link
                      href="/"
                      className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                    >
                      Login here
                    </Link>
                  </p>
                </Field>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Secure access to hospital management system
                </p>
              </FieldGroup>
            </form>
          </div>

          <div className="relative hidden md:block min-h-[400px] overflow-hidden">
            <Image
              width={5734}
              height={5734}
              src="/assets/pregnant2.png"
              alt="Hospital Care"
              className="absolute rounded-br-md rounded-tr-md inset-0 h-full w-full object-cover"
              priority
            />
            {/* Gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-linear-to-br from-emerald-900/40 via-teal-900/30 to-emerald-800/40" />

            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-md">
                <h2 className="text-4xl text-white font-bold">
                  Nsoatre Hospital
                </h2>

                <p
                  className="text-2xl font-bold text-white drop-shadow-lg"
                  style={{
                    textShadow:
                      "1px 1px 4px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.5)",
                  }}
                >
                  Compassionate Care, Professional Excellence
                </p>

                <div
                  className="flex items-center justify-center gap-3 text-lg font-semibold text-emerald-50"
                  style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.6)" }}
                >
                  <Heart
                    className="w-6 h-6 drop-shadow-lg"
                    fill="currentColor"
                  />
                  <span>Serving our community with dedication</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
