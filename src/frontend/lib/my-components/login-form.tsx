"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth/actions";
import { returnPathFromLocation } from "@/lib/auth/returnPath";
import { initializeAuthenticatedSession } from "@/lib/auth/session-initialization";
import { type LoginFormValues, loginSchema } from "@/lib/auth/validation";
import type { AppDispatch } from "@shared-store/index";

const inputClass = "h-11 border-[#aa9159]/35 bg-[#06110d]/70 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]";

export function LogInForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const submissionPending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "signing-in" | "preparing">("idle");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    setEmailConfirmed(new URLSearchParams(window.location.search).get("confirmed") === "1");
  }, []);

  async function onSubmit(rawValues: LoginFormValues) {
    if (submissionPending.current) return;
    let preparingSocket = false;
    submissionPending.current = true;
    setStage("signing-in");
    setError(null);
    try {
      const destination = returnPathFromLocation();
      const session = await signInWithEmail(loginSchema.parse(rawValues));
      preparingSocket = true;
      setStage("preparing");
      await initializeAuthenticatedSession(session, dispatch, {
        connectSocket: destination === "/pvp",
      });
      router.push(destination);
    } catch (caught) {
      setError(getAuthErrorMessage(
        caught,
        preparingSocket
          ? "You are signed in, but the game service is unavailable. Please try again."
          : "Unable to sign in. Please try again.",
      ));
    } finally {
      submissionPending.current = false;
      setStage("idle");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {emailConfirmed && <p role="status" className="flex items-center gap-2 rounded-sm border border-emerald-300/25 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4 shrink-0" />Email confirmed. You can sign in now.</p>}
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
            <FormControl><PasswordInput autoComplete="current-password" {...field} /></FormControl>
            <FormMessage className="text-[#ffb4a7]" />
          </FormItem>
        )} />
        {error && <p role="alert" className="rounded-sm border border-red-300/25 bg-red-950/35 px-3 py-2.5 text-sm text-[#ffb4a7]">{error}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-sm bg-[#c6a354] font-bold tracking-[0.12em] text-[#102018] hover:bg-[#d8ba70]">
          {form.formState.isSubmitting ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{stage === "preparing" ? "Preparing table…" : "Signing in…"}</> : "SIGN IN"}
        </Button>
      </form>
    </Form>
  );
}
