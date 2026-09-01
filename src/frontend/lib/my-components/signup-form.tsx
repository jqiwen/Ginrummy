"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthUiError, checkPlayerIdAvailability, getAuthErrorMessage, signUpWithEmail } from "@/lib/auth/actions";
import { normalizePlayerId, playerIdSchema, type SignupFormValues, signupSchema } from "@/lib/auth/validation";

const inputClass = "h-11 border-[#aa9159]/35 bg-[#06110d]/70 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]";
type AvailabilityState = "empty" | "typing" | "checking" | "available" | "taken" | "unavailable";

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
        else form.setError("playerId", { type: "manual", message: "This User ID is already taken." });
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
        form.setError("playerId", { type: "server", message });
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
        <FormField control={form.control} name="playerId" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[#eee4cb]">User ID</FormLabel>
            <FormControl><Input autoComplete="username" placeholder="kyra123" className={inputClass} aria-describedby="player-id-help player-id-availability" {...field} /></FormControl>
            <FormDescription id="player-id-help" className="rounded-sm border-l-2 border-[#c6a354]/60 bg-[#c6a354]/8 px-3 py-2 text-[#e5d4a4]/75">
              3–20 letters, numbers, or underscores. Your User ID is unique and cannot be changed later.
            </FormDescription>
            <div id="player-id-availability" aria-live="polite" className="min-h-4 text-xs">
              {availability === "checking" && <span className="inline-flex items-center text-[#d8d1bf]/60"><LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" />Checking…</span>}
              {availability === "available" && <span className="text-emerald-200/80">User ID is available.</span>}
              {availability === "unavailable" && <span className="text-[#d8d1bf]/55">Availability could not be checked yet.</span>}
            </div>
            <FormMessage className="text-[#ffb4a7]" />
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
