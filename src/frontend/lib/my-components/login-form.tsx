"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth/actions";
import { returnPathFromLocation } from "@/lib/auth/returnPath";
import { type LoginFormValues, loginSchema } from "@/lib/auth/validation";

const inputClass = "h-11 border-[#aa9159]/35 bg-[#06110d]/70 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]";

export function LogInForm() {
  const router = useRouter();
  const submissionPending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(rawValues: LoginFormValues) {
    if (submissionPending.current) return;
    submissionPending.current = true;
    setError(null);
    try {
      await signInWithEmail(loginSchema.parse(rawValues));
      router.push(returnPathFromLocation());
    } catch (caught) {
      setError(getAuthErrorMessage(caught, "Unable to sign in. Please try again."));
    } finally {
      submissionPending.current = false;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
          {form.formState.isSubmitting ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "SIGN IN"}
        </Button>
      </form>
    </Form>
  );
}
