"use client";

import { ArrowLeft, Copy, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createRoom, joinRoom, setGameStart } from "@/lib/match_formation/match_formation";
import { HeaderBar } from "@/lib/my-components/header-bar";
import { connectGameSocket } from "@/lib/socket";
import type { RootState } from "@shared-store/index";

export default function PvpPage() {
  const authStatus = useSelector((state: RootState) => state.user.status);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login?returnTo=%2Fpvp");
  }, [authStatus, router]);

  if (authStatus !== "authenticated") {
    return <div className="flex min-h-screen items-center justify-center bg-[#06110d] text-[#d8d1bf]/65"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Restoring your seat…</div>;
  }

  return (
    <div className="min-h-screen bg-[#06110d] text-[#f5edd9]">
      <HeaderBar />
      <JoinCard />
    </div>
  );
}

function JoinCard() {
  const [creating, setCreating] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ableToStart, setAbleToStart] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const socket = connectGameSocket();
    const onPlayerJoined = (event: { matchId: string }) => {
      if (creating && event.matchId === createdRoomId) {
        setMessage("Your opponent is seated. Start when you are ready.");
        setAbleToStart(true);
      }
    };
    const onGameStarted = (event: { matchId: string }) => {
      if (!creating && event.matchId === createdRoomId) router.push(`/game?roomId=${encodeURIComponent(`${event.matchId}-0`)}`);
    };
    socket.on("room:player-joined", onPlayerJoined);
    socket.on("game:started", onGameStarted);
    return () => {
      socket.off("room:player-joined", onPlayerJoined);
      socket.off("game:started", onGameStarted);
    };
  }, [createdRoomId, creating, router]);

  function handleSwitch(checked: boolean) {
    setCreating(checked);
    setRoomNumber("");
    setCreatedRoomId(null);
    setMessage(null);
    setError(null);
    setAbleToStart(false);
  }

  async function handleJoinOrCreate() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (creating) {
        const matchId = await createRoom();
        if (!matchId) throw new Error("Unable to create a room. Please try again.");
        setCreatedRoomId(matchId);
        setRoomNumber(matchId);
        setMessage("Share this room number. We will let you know when your opponent joins.");
      } else {
        const matchId = roomNumber.trim();
        const result = await joinRoom(matchId);
        if (result.result !== 200) throw new Error(result.message);
        setCreatedRoomId(matchId);
        setMessage(result.message || "Room joined. Waiting for the host to start.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The table could not be reached.");
    } finally {
      setPending(false);
    }
  }

  async function startGame() {
    if (!createdRoomId || pending) return;
    setPending(true);
    setError(null);
    const result = await setGameStart(createdRoomId);
    setPending(false);
    if (result.result === 0) router.push(`/game?roomId=${encodeURIComponent(`${createdRoomId}-1`)}`);
    else setError(result.message || "Unable to start the match.");
  }

  async function copyRoomNumber() {
    if (createdRoomId) await navigator.clipboard.writeText(createdRoomId);
  }

  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/main-image/poster.jpg')] bg-cover bg-center opacity-30" />
      <div aria-hidden="true" className="absolute inset-0 bg-[#03100b]/75" />
      <Card className="relative w-full max-w-md rounded-sm border-[#b89b58]/45 bg-[#091912]/95 text-[#f5edd9] shadow-[0_28px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm">
        <CardHeader className="pb-5 text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#07140f] text-[#d8bb71]"><UsersRound className="h-5 w-5" /></span>
          <CardTitle className="font-serif text-3xl text-[#fff7df]">{creating ? "Create a room" : "Join a room"}</CardTitle>
          <CardDescription className="text-[#d8d1bf]/60">Private matches use your verified player account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!createdRoomId ? (
            <>
              <div className="flex items-center justify-between rounded-sm border border-[#aa9159]/25 bg-[#06110d]/55 px-4 py-3">
                <div><Label htmlFor="create-room" className="text-[#eee4cb]">Create instead</Label><p className="mt-0.5 text-xs text-[#d8d1bf]/45">Host a table for a friend.</p></div>
                <Switch id="create-room" checked={creating} onCheckedChange={handleSwitch} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-number" className="text-[#eee4cb]">Room number</Label>
                <Input id="room-number" autoComplete="off" placeholder={creating ? "Created automatically" : "Enter the room number"} value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} disabled={creating || pending} className="h-11 border-[#aa9159]/35 bg-[#06110d]/70 text-[#fff7df] placeholder:text-[#d8d1bf]/35 focus-visible:ring-[#d2b66e]" />
              </div>
            </>
          ) : (
            <div className="rounded-sm border border-[#aa9159]/30 bg-[#06110d]/55 p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#cbb270]">Room number</p>
              <button type="button" onClick={() => void copyRoomNumber()} className="mx-auto mt-2 flex items-center gap-2 font-mono text-3xl font-bold text-[#fff4d5]" aria-label="Copy room number">{createdRoomId}<Copy className="h-4 w-4 text-[#cbb270]" /></button>
              <p className="mt-3 text-sm leading-6 text-[#d8d1bf]/65">{message}</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-sm border border-red-300/25 bg-red-950/35 px-3 py-2.5 text-sm text-[#ffb4a7]">{error}</p>}
          <p className="flex items-center justify-center gap-2 text-xs text-[#d8d1bf]/45"><ShieldCheck className="h-3.5 w-3.5 text-[#cbb270]" />Account identity verified by Supabase</p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="ghost" className="text-[#d8d1bf]/70 hover:bg-[#d0b36d]/10 hover:text-[#fff4d6]"><Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
          {!createdRoomId ? (
            <Button className="ml-auto rounded-sm bg-[#c6a354] font-bold text-[#102018] hover:bg-[#d8ba70]" onClick={() => void handleJoinOrCreate()} disabled={pending || (!creating && !roomNumber.trim())}>{pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{creating ? "Create room" : "Join room"}</Button>
          ) : creating ? (
            <Button className="ml-auto rounded-sm bg-[#c6a354] font-bold text-[#102018] hover:bg-[#d8ba70]" disabled={!ableToStart || pending} onClick={() => void startGame()}>{pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Start match</Button>
          ) : <span className="ml-auto self-center text-xs uppercase tracking-[0.15em] text-[#cbb270]">Waiting for host</span>}
        </CardFooter>
      </Card>
    </main>
  );
}
