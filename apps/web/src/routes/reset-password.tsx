import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({
    token: z.string().optional(),
    error: z.string().optional(),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [succeeded, setSucceeded] = useState(false);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (!token) return;

      await authClient.resetPassword(
        {
          newPassword: value.password,
          token,
        },
        {
          onSuccess: () => {
            setSucceeded(true);
            toast.success("Password updated successfully");
          },
          onError: (ctx: { error: { message?: string } }) => {
            toast.error(ctx.error.message || "Failed to reset password. The link may have expired.");
          },
        },
      );
    },
    validators: {
      onSubmit: z
        .object({
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
    },
  });

  // Token missing or invalid from URL
  if (!token || searchError === "INVALID_TOKEN") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-semibold tracking-widest uppercase text-foreground"
          >
            BHVR
          </Link>
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            Request new link
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="flex items-center justify-center">
              <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="size-7 text-destructive" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">Link expired or invalid</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This password reset link is no longer valid. Links expire after 1 hour for security.
              </p>
            </div>

            <Link to="/forgot-password">
              <Button className="w-full" size="lg">
                Request a new link
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-foreground underline-offset-4 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (succeeded) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border px-6 py-4">
          <Link
            to="/"
            className="text-sm font-semibold tracking-widest uppercase text-foreground"
          >
            BHVR
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="flex items-center justify-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="size-7 text-foreground" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been changed successfully. You can now sign in with your new
                password.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate({ to: "/login" })}
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main reset form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold tracking-widest uppercase text-foreground">
          BHVR
        </Link>
        <Link
          to="/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3" />
          Back to login
        </Link>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-center mb-6">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="size-5 text-muted-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center tracking-tight">Set new password</h1>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Choose a strong password you haven't used before.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            <form.Field name="password">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>New password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Confirm new password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!state.canSubmit || state.isSubmitting}
                >
                  {state.isSubmitting ? "Updating..." : "Update password"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {/* Password hint */}
          <div className="border border-border p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password requirements
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>At least 8 characters long</li>
              <li>Mix of letters and numbers recommended</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
