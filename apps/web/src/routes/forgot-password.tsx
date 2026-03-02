import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: "/reset-password",
        },
        {
          onSuccess: () => {
            setSubmittedEmail(value.email);
            setSubmitted(true);
          },
          onError: (ctx: { error: { message?: string } }) => {
            toast.error(ctx.error.message || "Something went wrong. Please try again.");
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Please enter a valid email address"),
      }),
    },
  });

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
        <div className="w-full max-w-sm">
          {submitted ? (
            <SuccessState email={submittedEmail} />
          ) : (
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-center mb-6">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="size-5 text-muted-foreground" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-center tracking-tight">
                  Forgot your password?
                </h1>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  No worries. Enter your email address and we'll send you a link to reset your
                  password.
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
                <form.Field name="email">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor={field.name}>Email address</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
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

                <form.Subscribe>
                  {(state) => (
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={!state.canSubmit || state.isSubmitting}
                    >
                      {state.isSubmitting ? "Sending link..." : "Send reset link"}
                    </Button>
                  )}
                </form.Subscribe>
              </form>

              {/* Divider + hint */}
              <div className="space-y-3 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">or</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/login"
                    className="text-foreground underline-offset-4 hover:underline font-medium"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          )}
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

function SuccessState({ email }: { email: string }) {
  return (
    <div className="space-y-8 text-center">
      {/* Icon */}
      <div className="flex items-center justify-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <CheckCircle className="size-7 text-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">{email}</span>.{" "}
          The link expires in 1 hour.
        </p>
      </div>

      {/* Instructions */}
      <div className="border border-border p-4 text-left space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Didn't receive the email?
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email address</li>
          <li>Allow a few minutes for delivery</li>
        </ul>
      </div>

      {/* Actions */}
      <Link to="/login">
        <Button className="w-full" size="lg">
          Back to sign in
        </Button>
      </Link>
    </div>
  );
}
