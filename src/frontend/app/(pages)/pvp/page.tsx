"use client";

import { ArrowLeft, Clock3, LoaderCircle, Search, ShieldCheck, UserRoundPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvitations } from "@/lib/invites/invitation-provider";
import { HeaderBar } from "@/lib/my-components/header-bar";
import { ProfileAvatar } from "@/lib/profile/profile-avatar";
import type { PublicPlayerProfile } from "@/lib/socket";
import type { RootState } from "@shared-store/index";

export default function PvpPage() {
  const authStatus = useSelector((state: RootState) => state.user.status);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login?next=%2Fpvp");
  }, [authStatus, router]);

  if (authStatus !== "authenticated") {
    return <div className="min-h-screen bg-[#06110d] text-[#d8d1bf]/65"><HeaderBar /><div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Preparing your private table…</div></div>;
  }

  return <div className="min-h-screen bg-[#06110d] text-[#f5edd9]"><HeaderBar /><PrivateMatch /></div>;
}

function PrivateMatch() {
  const { received, sent, loading, searchPlayers, sendInvite, acceptInvite, declineInvite, cancelInvite } = useInvitations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicPlayerProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const players = await searchPlayers(trimmed);
        if (active) setResults(players);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Player search failed.");
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, searchPlayers]);

  async function runAction(id: string, action: () => Promise<void>, successMessage: string) {
    if (actionId) return false;
    setActionId(id);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(successMessage);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invitation could not be updated.");
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function invite(player: PublicPlayerProfile) {
    const sent = await runAction(player.id, () => sendInvite(player.playerId), `Invitation sent to ${player.playerId}.`);
    if (sent) setResults((current) => current.filter((item) => item.id !== player.id));
  }

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/main-image/poster.jpg')] bg-cover bg-center opacity-20" />
      <div aria-hidden="true" className="absolute inset-0 bg-[#03100b]/80" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#cbb270]">Private match</p><h1 className="mt-2 font-serif text-4xl font-semibold text-[#fff7df]">Invite a player to your table</h1><p className="mt-2 text-sm text-[#d8d1bf]/65">Search registered Gin Rummy players by public User ID.</p></div>
          <Button asChild variant="ghost" className="text-[#d8d1bf]/70 hover:bg-[#d0b36d]/10 hover:text-[#fff4d6]"><Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-sm border-[#b89b58]/45 bg-[#091912]/95 text-[#f5edd9] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <CardHeader><span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#07140f] text-[#d8bb71]"><UserRoundPlus className="h-5 w-5" /></span><CardTitle className="font-serif text-2xl text-[#fff7df]">Find a registered player</CardTitle><CardDescription className="text-[#d8d1bf]/60">Invitations expire after 30 minutes. Email addresses are never shown.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-search" className="text-[#eee4cb]">Search by User ID</Label>
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cbb270]/70" /><Input id="player-search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type at least 2 characters" className="h-12 border-[#aa9159]/35 bg-[#06110d]/70 pl-10 pr-10 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]" aria-describedby="player-search-help" />{searching ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#cbb270]" /> : query && <button type="button" onClick={() => setQuery("")} aria-label="Clear player search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d8d1bf]/50 hover:text-[#fff7df]"><X className="h-4 w-4" /></button>}</div>
                <p id="player-search-help" className="text-xs text-[#d8d1bf]/45">Results contain only public User IDs and avatars.</p>
              </div>
              <div className="min-h-28 rounded-sm border border-[#aa9159]/25 bg-[#06110d]/45 p-2" aria-live="polite">
                {query.trim().length < 2 && <div className="flex min-h-24 items-center justify-center text-sm text-[#d8d1bf]/40">Start typing a User ID</div>}
                {query.trim().length >= 2 && !searching && results.length === 0 && <div className="flex min-h-24 items-center justify-center text-sm text-[#d8d1bf]/50">No matching players</div>}
                <ul className="space-y-1">{results.map((player) => <li key={player.id} className="flex items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 hover:border-[#aa9159]/25 hover:bg-[#10271d]"><ProfileAvatar playerId={player.playerId} avatarPath={player.avatarPath} /><span className="min-w-0 flex-1 truncate font-semibold text-[#fff4d5]">{player.playerId}</span><Button size="sm" onClick={() => void invite(player)} disabled={Boolean(actionId)} className="rounded-sm bg-[#c6a354] font-bold text-[#102018] hover:bg-[#d8ba70]">{actionId === player.id && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Invite</Button></li>)}</ul>
              </div>
              {message && <p role="status" className="rounded-sm border border-emerald-300/20 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-100">{message}</p>}
              {error && <p role="alert" className="rounded-sm border border-red-300/25 bg-red-950/35 px-3 py-2.5 text-sm text-[#ffb4a7]">{error}</p>}
              <p className="flex items-center gap-2 text-xs text-[#d8d1bf]/45"><ShieldCheck className="h-3.5 w-3.5 text-[#cbb270]" />Every action is verified against your Supabase account.</p>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-sm border-[#b89b58]/40 bg-[#091912]/95 text-[#f5edd9] backdrop-blur-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 font-serif text-xl text-[#fff7df]"><UsersRound className="h-4 w-4 text-[#d8bb71]" />Pending invitations</CardTitle><CardDescription className="text-[#d8d1bf]/55">Players waiting for your answer.</CardDescription></CardHeader>
              <CardContent>{loading && received.length === 0 ? <div className="flex items-center py-5 text-sm text-[#d8d1bf]/50"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading invitations…</div> : received.length === 0 ? <p className="py-5 text-sm text-[#d8d1bf]/45">No invitations waiting.</p> : <ul className="space-y-3">{received.map((invite) => <li key={invite.id} className="rounded-sm border border-[#aa9159]/25 bg-[#06110d]/55 p-3"><div className="flex items-center gap-3"><ProfileAvatar playerId={invite.sender.playerId} avatarPath={invite.sender.avatarPath} /><div className="min-w-0"><p className="truncate font-semibold text-[#fff4d5]">{invite.sender.playerId}</p><p className="text-xs text-[#d8d1bf]/55">invited you to play</p></div></div><div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={Boolean(actionId)} onClick={() => void runAction(invite.id, () => declineInvite(invite.id), "Invitation declined.")} className="text-[#d8d1bf]/65 hover:bg-red-950/30 hover:text-[#ffb4a7]">Decline</Button><Button size="sm" disabled={Boolean(actionId)} onClick={() => void runAction(invite.id, () => acceptInvite(invite.id), "Opening your table…")} className="rounded-sm bg-[#c6a354] font-bold text-[#102018] hover:bg-[#d8ba70]">{actionId === invite.id && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Accept</Button></div></li>)}</ul>}</CardContent>
            </Card>
            <Card className="rounded-sm border-[#b89b58]/40 bg-[#091912]/95 text-[#f5edd9] backdrop-blur-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 font-serif text-xl text-[#fff7df]"><Clock3 className="h-4 w-4 text-[#d8bb71]" />Sent invitations</CardTitle><CardDescription className="text-[#d8d1bf]/55">Waiting for another player.</CardDescription></CardHeader>
              <CardContent>{sent.length === 0 ? <p className="py-5 text-sm text-[#d8d1bf]/45">No invitations sent.</p> : <ul className="space-y-3">{sent.map((invite) => <li key={invite.id} className="flex items-center gap-3 rounded-sm border border-[#aa9159]/25 bg-[#06110d]/55 p-3"><ProfileAvatar playerId={invite.recipient.playerId} avatarPath={invite.recipient.avatarPath} /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#fff4d5]">{invite.recipient.playerId}</p><p className="text-xs text-[#d8d1bf]/55">Waiting for a response…</p></div><Button size="sm" variant="ghost" disabled={Boolean(actionId)} onClick={() => void runAction(invite.id, () => cancelInvite(invite.id), "Invitation cancelled.")} className="text-[#d8d1bf]/60 hover:bg-red-950/30 hover:text-[#ffb4a7]">Cancel</Button></li>)}</ul>}</CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
