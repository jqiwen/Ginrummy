import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/lib/my-components/signup-form";

export default function SignupPage() {
  return (
    <AuthShell eyebrow="Join the table" title="Create account" description="Choose your player name and save a seat for private matches." footer={<>Already registered? <Link href="/login" className="font-semibold text-[#e2c77f] underline-offset-4 hover:underline">Sign in</Link></>}>
      <SignUpForm />
    </AuthShell>
  );
}
