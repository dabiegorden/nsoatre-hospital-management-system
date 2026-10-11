"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Heart, Shield, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage({
  className,
}: {
  className?: string;
}) {
  const [step, setStep] = useState<"email" | "verify" | "reset">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Request password reset
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset code");
      }

      toast.success("Reset token sent to your email!");
      setStep("verify");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset code"
      );
      toast.error(
        err instanceof Error ? err.message : "Failed to send reset code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify token and transition to password reset
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid or expired token");
      }

      toast.success("Token verified!");
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid token");
      toast.error(err instanceof Error ? err.message : "Invalid token");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      toast.success("Password reset successful!");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
      toast.error(
        err instanceof Error ? err.message : "Failed to reset password"
      );
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
      <Card className="overflow-hidden w-full max-w-2xl shadow-xl border-emerald-100">
        <CardContent className="p-6 sm:p-8 md:p-10 bg-white">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <div className="flex flex-col items-center gap-3 text-center mb-8">
            <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-2">
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Reset Your Password
            </h1>
            <p className="text-sm sm:text-base text-gray-600 text-balance flex items-center gap-2 justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
              Secure your account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <FieldGroup>
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
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the email address associated with your account
                  </p>
                </Field>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending Token..." : "Send Reset Token"}
                </Button>
              </FieldGroup>
            </form>
          )}

          {/* Step 2: Verify Token */}
          {step === "verify" && (
            <form onSubmit={handleVerifyToken}>
              <FieldGroup>
                <Field>
                  <FieldLabel
                    htmlFor="token"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Reset Token
                  </FieldLabel>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Enter the random characters from your email"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    disabled={isLoading}
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Check your email for the reset token (random characters)
                  </p>
                </Field>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify Token"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("email");
                    setResetToken("");
                  }}
                  className="w-full text-emerald-600 hover:text-emerald-700"
                >
                  Use different email
                </Button>
              </FieldGroup>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword}>
              <FieldGroup>
                <Field>
                  <FieldLabel
                    htmlFor="newPassword"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    New Password
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password (min 8 characters)"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base pr-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="confirmPassword"
                    className="text-sm sm:text-base text-gray-700 font-medium"
                  >
                    Confirm Password
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base pr-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("email");
                    setEmail("");
                    setResetToken("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-emerald-600 hover:text-emerald-700"
                >
                  Start over
                </Button>
              </FieldGroup>
            </form>
          )}

          <p className="text-xs text-center text-gray-500 mt-6">
            Secure access to hospital management system
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
