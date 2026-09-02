"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthUiError, checkPlayerIdAvailability, getAuthErrorMessage, signUpWithEmail } from "@/lib/auth/actions";
import { normalizePlayerId, playerIdSchema, type SignupFormValues, signupSchema } from "@/lib/auth/validation";

const inputClass = "h-11 border-[#aa9159]/35 bg-[#06110d]/70 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]";
const takenPlayerIdMessage = "This User ID is already taken. Choose another one.";
type AvailabilityState = "empty" | "typing" | "checking" | "available" | "taken" | "unavailable";

function CompactPlayerIdError() {
  const { error, formMessageId } = useFormField();
  if (!error) return null;

  return (
    <p id={formMessageId} role="alert" className="flex items-start gap-1.5 text-[11px] leading-4 text-[#ff9285]">
      <CircleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{String(error.message)}</span>
    </p>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const submissionPending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>("empty");
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { playerId: "", email: "", password: "", confirmPassword: "" },
  });
  const playerIdValue = form.watch("playerId");

  useEffect(() => {
    const normalized = normalizePlayerId(playerIdValue);
    if (!normalized) {
      setAvailability("empty");
      return;
    }
    if (!playerIdSchema.safeParse(normalized).success) {
      setAvailability("typing");
      return;
    }

    let active = true;
    setAvailability("typing");
    const timer = window.setTimeout(async () => {
      setAvailability("checking");
      try {
        const available = await checkPlayerIdAvailability(normalized);
        if (!active) return;
        setAvailability(available ? "available" : "taken");
        if (available) form.clearErrors("playerId");
        else form.setError("playerId", { type: "manual", message: takenPlayerIdMessage });
      } catch {
        if (active) setAvailability("unavailable");
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form, playerIdValue]);

  async function onSubmit(rawValues: SignupFormValues) {
    if (submissionPending.current) return;
    submissionPending.current = true;
    setError(null);
    try {
      const result = await signUpWithEmail(signupSchema.parse(rawValues));
      if (result.session) {
        router.push("/home");
      } else {
        setConfirmationEmail(result.email);
      }
    } catch (caught) {
      const message = getAuthErrorMessage(caught, "Unable to create your account. Please try again.");
      if (caught instanceof AuthUiError && caught.code === "player_id_exists") {
        setAvailability("taken");
        form.setError("playerId", { type: "server", message: takenPlayerIdMessage });
      } else if (caught instanceof AuthUiError && caught.code === "email_exists") {
        form.setError("email", { type: "server", message });
      } else {
        setError(message);
      }
    } finally {
      submissionPending.current = false;
    }
  }

  if (confirmationEmail) {
    return (
      <div role="status" className="rounded-sm border border-[#b89b58]/35 bg-[#06110d]/55 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-[#d2b66e]" />
        <h2 className="mt-3 font-serif text-xl text-[#fff7df]">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-[#d8d1bf]/70">We sent a confirmation link to <span className="font-semibold text-[#eee4cb]">{confirmationEmail}</span>.</p>
        <Button asChild variant="ghost" className="mt-4 text-[#e2c77f] hover:bg-[#d0b36d]/10 hover:text-[#fff4d6]"><Link href="/login">Back to sign in</Link></Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField control={form.control} name="playerId" render={({ field, fieldState }) => (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-[#eee4cb]">User ID</FormLabel>
            <FormControl><Input autoComplete="username" placeholder="kyra123" className={inputClass} {...field} /></FormControl>
            <CompactPlayerIdError />
            {!fieldState.error && availability === "checking" && (
              <p id="player-id-availability" aria-live="polite" className="flex items-center gap-1.5 text-[11px] leading-4 text-[#d8d1bf]/60">
                <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />Checking…
              </p>
            )}
            {!fieldState.error && availability === "available" && (
              <p id="player-id-availability" aria-live="polite" className="flex items-center gap-1.5 text-[11px] leading-4 text-emerald-200/80">
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />User ID is available.
              </p>
            )}
            {!fieldState.error && availability === "unavailable" && (
              <p id="player-id-availability" aria-live="polite" className="flex items-center gap-1.5 text-[11px] leading-4 text-[#d8d1bf]/55">
                <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />Availability could not be checked yet.
              </p>
            )}
            <FormDescription className="flex items-start gap-1.5 text-[11px] leading-4 text-[#d8c58f]/65">
              <CheckCircle2 aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 text-[#c6a354]/75" />
              <span>3–20 letters, numbers, or underscores. Your User ID is unique and cannot be changed later.</span>
            </FormDescription>
          </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[#eee4cb]">Email</FormLabel>
            <FormControl><Input type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} {...field} /></FormControl>
            <FormMessage className="text-[#ffb4a7]" />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[#eee4cb]">Password</FormLabel>
            <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
            <FormMessage className="text-[#ffb4a7]" />
          </FormItem>
        )} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[#eee4cb]">Confirm password</FormLabel>
            <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
            <FormMessage className="text-[#ffb4a7]" />
          </FormItem>
        )} />
        {error && <p role="alert" className="rounded-sm border border-red-300/25 bg-red-950/35 px-3 py-2.5 text-sm text-[#ffb4a7]">{error}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-sm bg-[#c6a354] font-bold tracking-[0.12em] text-[#102018] hover:bg-[#d8ba70]">
          {form.formState.isSubmitting ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "CREATE ACCOUNT"}
        </Button>
      </form>
    </Form>
  );
}
