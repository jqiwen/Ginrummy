import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LogInForm } from "@/lib/my-components/login-form";

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Player access" title="Welcome back" description="Sign in to create a private table or rejoin a match." footer={<>New to the table? <Link href="/signup" className="font-semibold text-[#e2c77f] underline-offset-4 hover:underline">Create an account</Link></>}>
      <LogInForm />
    </AuthShell>
  );
}
