"use client";

import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/auth/actions";
import { setGameSocketAccessToken } from "@/lib/socket";
import type { AppDispatch, RootState } from "@shared-store/index";
import { setUnauthenticated } from "@shared-store/slices/user";

export default function AccountPage() {
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user.status === "unauthenticated") router.replace("/login?next=%2Faccount");
  }, [router, user.status]);

  if (user.status !== "authenticated") {
    return <div className="flex min-h-screen items-center justify-center bg-[#06110d] text-[#d8d1bf]/65">Restoring your account…</div>;
  }

  async function logout() {
    setSigningOut(true);
    setError(null);
    try {
      await signOutUser();
      setGameSocketAccessToken(null, true);
      dispatch(setUnauthenticated());
      router.replace("/home");
    } catch {
      setError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06110d] px-4 py-10 text-[#f5edd9]">
      <section className="w-full max-w-lg rounded-sm border border-[#b89b58]/45 bg-[#091912] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:p-9">
        <Link href="/home" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#cbb270] hover:text-[#fff4d6]"><ArrowLeft className="h-4 w-4" />Home</Link>
        <div className="mt-8 flex items-center gap-4 border-b border-[#9c8248]/25 pb-7">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#07140f] text-[#d8bb71]"><UserRound className="h-6 w-6" /></span>
          <div><p className="font-serif text-2xl text-[#fff7df]">{user.displayName}</p><p className="mt-1 text-sm text-[#d8d1bf]/55">@{user.username}</p></div>
        </div>
        <dl className="space-y-4 py-7 text-sm">
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#cbb270]">Email</dt><dd className="mt-1 text-[#eee4cb]">{user.email}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#cbb270]">Player ID</dt><dd className="mt-1 break-all font-mono text-xs text-[#d8d1bf]/60">{user.id}</dd></div>
        </dl>
        {error && <p role="alert" className="mb-4 text-sm text-[#ffb4a7]">{error}</p>}
        <Button variant="outline" className="w-full border-[#aa9159]/35 bg-transparent text-[#eee4cb] hover:bg-[#d0b36d]/10 hover:text-[#fff7df]" disabled={signingOut} onClick={logout}><LogOut className="mr-2 h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>
      </section>
    </main>
  );
}
