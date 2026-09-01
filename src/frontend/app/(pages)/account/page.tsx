"use client";

import { ArrowLeft, Camera, LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/auth/actions";
import { AVATAR_ACCEPT, uploadCurrentUserAvatar, validateAvatarFile } from "@/lib/profile/avatar";
import { ProfileAvatar } from "@/lib/profile/profile-avatar";
import { setGameSocketAccessToken } from "@/lib/socket";
import type { AppDispatch, RootState } from "@shared-store/index";
import { setAvatarPath, setUnauthenticated } from "@shared-store/slices/user";

export default function AccountPage() {
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

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

  async function changeAvatar(file: File | undefined) {
    if (!file || uploadingAvatar) return;
    setError(null);
    setAvatarMessage(null);
    try {
      validateAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setUploadingAvatar(true);
      const avatarPath = await uploadCurrentUserAvatar(file, user.avatarPath);
      dispatch(setAvatarPath(avatarPath));
      setAvatarMessage("Avatar updated.");
    } catch (caught) {
      setAvatarPreview(null);
      setError(caught instanceof Error ? caught.message : "Your avatar could not be updated.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06110d] px-4 py-10 text-[#f5edd9]">
      <section className="w-full max-w-lg rounded-sm border border-[#b89b58]/45 bg-[#091912] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:p-9">
        <Link href="/home" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#cbb270] hover:text-[#fff4d6]"><ArrowLeft className="h-4 w-4" />Home</Link>
        <div className="mt-8 flex items-center gap-5 border-b border-[#9c8248]/25 pb-7">
          <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} aria-label="Change avatar" className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b66e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#091912]">
            <ProfileAvatar playerId={user.playerId} avatarPath={user.avatarPath} previewUrl={avatarPreview} size="lg" />
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Camera className="h-5 w-5 text-[#fff4d5]" /></span>
          </button>
          <input ref={avatarInputRef} type="file" accept={AVATAR_ACCEPT} aria-label="Choose avatar image" className="sr-only" onChange={(event) => void changeAvatar(event.target.files?.[0])} />
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#cbb270]">User ID</p><p className="truncate font-serif text-2xl text-[#fff7df]">{user.playerId}</p><p className="mt-1 text-xs text-[#d8d1bf]/55">User IDs cannot be changed.</p></div>
        </div>
        <dl className="space-y-4 py-7 text-sm">
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#cbb270]">Email</dt><dd className="mt-1 text-[#eee4cb]">{user.email}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#cbb270]">Profile image</dt><dd className="mt-2"><Button type="button" variant="outline" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} className="border-[#aa9159]/35 bg-transparent text-[#eee4cb] hover:bg-[#d0b36d]/10 hover:text-[#fff7df]">{uploadingAvatar ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Uploading…</> : <><Camera className="mr-2 h-4 w-4" />Change avatar</>}</Button><p className="mt-2 text-xs text-[#d8d1bf]/45">JPG, PNG, or WebP. Maximum 2 MB.</p></dd></div>
        </dl>
        {avatarMessage && <p role="status" className="mb-4 text-sm text-emerald-200/80">{avatarMessage}</p>}
        {error && <p role="alert" className="mb-4 text-sm text-[#ffb4a7]">{error}</p>}
        <Button variant="outline" className="w-full border-[#aa9159]/35 bg-transparent text-[#eee4cb] hover:bg-[#d0b36d]/10 hover:text-[#fff7df]" disabled={signingOut} onClick={logout}><LogOut className="mr-2 h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>
      </section>
    </main>
  );
}
