"use client";

import { Cross1Icon, ExitIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Bell, ChevronDown, DoorOpen, LoaderCircle, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signOutUser } from "@/lib/auth/actions";
import { useInvitations } from "@/lib/invites/invitation-provider";
import { ProfileAvatar } from "@/lib/profile/profile-avatar";
import { setGameSocketAccessToken } from "@/lib/socket";
import type { AppDispatch, RootState } from "@shared-store/index";
import { setGameStatus, type SideBarType } from "@shared-store/slices/game";
import { setUnauthenticated } from "@shared-store/slices/user";

export function HeaderBar() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const game = useSelector((state: RootState) => state.game);
  const { received, acceptInvite, declineInvite, leaveActiveMatch } = useInvitations();
  const [openPauseDialog, setOpenPauseDialog] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [leavingGame, setLeavingGame] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [inviteAction, setInviteAction] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [authControlsMounted, setAuthControlsMounted] = useState(false);

  const rawPathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const pathnameWithoutBase = basePath && rawPathname.startsWith(basePath) ? rawPathname.slice(basePath.length) || "/" : rawPathname;
  const pathname = pathnameWithoutBase.length > 1 ? pathnameWithoutBase.replace(/\/+$/, "") : pathnameWithoutBase;
  const isCardSurface = ["/", "/home", "/game", "/pvp", "/account"].includes(pathname);
  const surfaceButtonClass = isCardSurface ? "text-[#eee4cb] hover:bg-[#d0b36d]/15 hover:text-[#fff6dc]" : "";

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", openPauseDialog);
    return () => document.body.classList.remove("overflow-hidden");
  }, [openPauseDialog]);

  useEffect(() => {
    setAuthControlsMounted(true);
  }, []);

  const visibleAuthStatus = authControlsMounted ? user.status : "initializing";

  async function handleLogout() {
    setLogoutError(false);
    try {
      await signOutUser();
      setGameSocketAccessToken(null, true);
      dispatch(setUnauthenticated());
      router.push("/home");
    } catch {
      setLogoutError(true);
    }
  }

  function changeShowSideBar(state: SideBarType) {
    dispatch(setGameStatus({ showSideBar: game.showSideBar === state ? null : state }));
  }

  async function updateInvite(inviteId: string, action: "accept" | "decline") {
    if (inviteAction) return;
    setInviteAction(inviteId);
    setInviteError(null);
    try {
      if (action === "accept") await acceptInvite(inviteId);
      else await declineInvite(inviteId);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Invitation update failed.");
    } finally {
      setInviteAction(null);
    }
  }

  async function handleLeaveGame() {
    if (leavingGame) return;
    setLeavingGame(true);
    setLeaveError(null);
    try {
      await leaveActiveMatch();
      setOpenPauseDialog(false);
      router.replace("/home");
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : "Unable to leave the table. Please try again.");
    } finally {
      setLeavingGame(false);
    }
  }

  return (
    <header className={`sticky top-0 z-[990] flex h-14 w-full shrink-0 items-center justify-between border-b px-4 sm:px-5 ${isCardSurface ? "border-[#9c8248]/25 bg-[#07140f] text-[#f5edd9] shadow-[0_8px_28px_rgba(0,0,0,0.18)]" : "border-slate-200 bg-white text-slate-900"}`}>
      <div className="flex min-w-0 items-center gap-2">
        {pathname === "/game" && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild><Button className={surfaceButtonClass} size="icon" variant="ghost" onClick={() => setOpenPauseDialog(true)} aria-label="Leave game"><ExitIcon className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent side="bottom"><p>Leave</p></TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild><Button className={`${surfaceButtonClass} gap-2 px-3`} variant={game.showSideBar === "Rules" ? "secondary" : "ghost"} onClick={() => changeShowSideBar("Rules")} aria-expanded={game.showSideBar === "Rules"} aria-controls="game-rules-panel"><InfoCircledIcon className="h-4 w-4" /><span>? Rules</span></Button></TooltipTrigger>
              <TooltipContent side="bottom"><p>Rules</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {pathname !== "/game" && (
          <Link href="/home" className="flex items-center gap-3" aria-label="Gin Rummy Dozenal home">
            <span className="text-sm text-[#d1b46c]" aria-hidden="true">◆</span>
            <span className="font-serif text-sm font-semibold tracking-[0.16em] text-[#fff4d6]">GIN RUMMY</span>
            <span className="hidden border-l border-[#9c8248]/45 pl-3 text-[9px] font-semibold uppercase tracking-[0.26em] text-[#cfc4aa]/55 sm:inline">Dozenal</span>
          </Link>
        )}
      </div>

      <div className="flex h-10 min-w-[154px] items-center justify-end gap-1.5">
        {logoutError && <span role="alert" className="hidden text-xs text-[#ffb4a7] sm:inline">Sign out failed</span>}
        {visibleAuthStatus === "initializing" && <div aria-label="Restoring session" className="h-8 w-28 animate-pulse rounded-sm border border-[#9c8248]/20 bg-[#d0b36d]/10" />}
        {visibleAuthStatus === "unauthenticated" && (
          <>
            <Button asChild size="sm" variant="ghost" className={surfaceButtonClass}><Link href="/login">Log in</Link></Button>
            <Button asChild size="sm" className="rounded-sm bg-[#c6a354] font-semibold text-[#102018] hover:bg-[#d8ba70]"><Link href="/signup">Sign up</Link></Button>
          </>
        )}
        {visibleAuthStatus === "authenticated" && (
          <>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className={`${surfaceButtonClass} relative`} aria-label={`${received.length} pending game invitation${received.length === 1 ? "" : "s"}`}>
                <Bell className="h-4 w-4" />
                {received.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c6a354] px-1 text-[9px] font-black text-[#102018]">{Math.min(received.length, 9)}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-[#aa9159]/35 bg-[#0b2118] p-3 text-[#eee4cb]">
              <div className="flex items-center justify-between"><p className="font-serif text-lg font-semibold text-[#fff4d5]">Game invitations</p>{received.length > 0 && <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbb270]">{received.length} pending</span>}</div>
              {received.length === 0 ? <p className="py-5 text-sm text-[#d8d1bf]/50">No invitations waiting.</p> : <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">{received.map((invite) => <li key={invite.id} className="rounded-sm border border-[#aa9159]/25 bg-[#06110d]/55 p-3"><div className="flex items-center gap-2.5"><ProfileAvatar playerId={invite.sender.playerId} avatarPath={invite.sender.avatarPath} size="sm" /><p className="min-w-0 truncate text-sm"><span className="font-semibold text-[#fff4d5]">{invite.sender.playerId}</span> invited you to play.</p></div><div className="mt-2 flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={Boolean(inviteAction)} className="h-7 px-2 text-xs text-[#d8d1bf]/65 hover:bg-red-950/30 hover:text-[#ffb4a7]" onClick={() => void updateInvite(invite.id, "decline")}>Decline</Button><Button size="sm" disabled={Boolean(inviteAction)} className="h-7 rounded-sm bg-[#c6a354] px-2 text-xs font-bold text-[#102018] hover:bg-[#d8ba70]" onClick={() => void updateInvite(invite.id, "accept")}>{inviteAction === invite.id && <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />}Accept</Button></div></li>)}</ul>}
              {inviteError && <p role="alert" className="mt-2 text-xs text-[#ffb4a7]">{inviteError}</p>}
              <Button asChild variant="ghost" size="sm" className="mt-2 w-full text-[#d8d1bf]/65 hover:bg-[#d0b36d]/10 hover:text-[#fff4d6]"><Link href="/pvp">Open private match</Link></Button>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`${surfaceButtonClass} h-10 gap-2 px-2`}>
                <ProfileAvatar playerId={user.playerId} avatarPath={user.avatarPath} size="sm" />
                <span className="max-w-28 truncate text-sm">{user.playerId}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[#aa9159]/35 bg-[#0b2118] text-[#eee4cb]">
              <DropdownMenuLabel><span className="block truncate">{user.playerId}</span><span className="mt-0.5 block truncate text-xs font-normal text-[#d8d1bf]/55">User ID</span></DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#9c8248]/25" />
              <DropdownMenuItem asChild className="focus:bg-[#d0b36d]/15 focus:text-[#fff6dc]"><Link href="/account"><UserRound className="mr-2 h-4 w-4" />Account</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleLogout()} className="focus:bg-[#d0b36d]/15 focus:text-[#fff6dc]"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        )}
      </div>

      <Dialog
        open={openPauseDialog}
        onOpenChange={(open) => {
          if (leavingGame) return;
          setOpenPauseDialog(open);
          if (open) setLeaveError(null);
        }}
      >
        <DialogContent
          className="w-[430px] border border-[#b89b58]/55 bg-[#07150f] px-8 py-9 text-[#f5edd9] shadow-[0_28px_90px_rgba(0,0,0,0.72)] [&>button:last-child]:hidden"
          onEscapeKeyDown={(event) => { if (leavingGame) event.preventDefault(); }}
          onInteractOutside={(event) => { if (leavingGame) event.preventDefault(); }}
        >
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" disabled={leavingGame} aria-label="Close leave confirmation" className="absolute right-3 top-3 h-8 w-8 text-[#d8d1bf]/55 hover:bg-[#d0b36d]/10 hover:text-[#fff4d5]">
              <Cross1Icon className="h-4 w-4" />
            </Button>
          </DialogClose>
          <DialogHeader className="items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#10271d] text-[#d8bb71]" aria-hidden="true"><DoorOpen className="h-5 w-5" /></span>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#cbb270]">Private table</p>
            <DialogTitle className="font-serif text-2xl font-semibold text-[#fff4d5]">Leave the table?</DialogTitle>
            <DialogDescription className="max-w-sm pt-2 text-center text-sm leading-6 text-[#d8d1bf]/75">
              Your current round will end, and your opponent will be returned home.
            </DialogDescription>
          </DialogHeader>
          {leaveError && <p role="alert" className="rounded-sm border border-[#8f3d36]/55 bg-[#351713] px-3 py-2 text-center text-sm text-[#efb5a9]">{leaveError}</p>}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#9c8248]/25 pt-5">
            <Button type="button" variant="outline" disabled={leavingGame} onClick={() => setOpenPauseDialog(false)} className="border-[#b89b58]/55 bg-transparent text-[#ead8a7] hover:bg-[#d0b36d]/10 hover:text-[#fff4d5]">Stay in game</Button>
            <Button type="button" disabled={leavingGame} onClick={() => void handleLeaveGame()} className="border border-[#9a4d42]/65 bg-[#5b2821] text-[#f6d4cc] hover:bg-[#713229]">
              {leavingGame ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Leaving table…</> : "Leave game"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
