"use client";

import { ExitIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signOutUser } from "@/lib/auth/actions";
import { setGameSocketAccessToken } from "@/lib/socket";
import type { AppDispatch, RootState } from "@shared-store/index";
import { setGameStatus, type SideBarType } from "@shared-store/slices/game";
import { setUnauthenticated } from "@shared-store/slices/user";

export function HeaderBar() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const game = useSelector((state: RootState) => state.game);
  const [openPauseDialog, setOpenPauseDialog] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

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
        {user.status === "loading" && <div aria-label="Restoring session" className="h-8 w-28 animate-pulse rounded-sm border border-[#9c8248]/20 bg-[#d0b36d]/10" />}
        {user.status === "unauthenticated" && (
          <>
            <Button asChild size="sm" variant="ghost" className={surfaceButtonClass}><Link href="/login">Log in</Link></Button>
            <Button asChild size="sm" className="rounded-sm bg-[#c6a354] font-semibold text-[#102018] hover:bg-[#d8ba70]"><Link href="/signup">Sign up</Link></Button>
          </>
        )}
        {user.status === "authenticated" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`${surfaceButtonClass} h-10 gap-2 px-2`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#10271d] text-[#d8bb71]"><UserRound className="h-3.5 w-3.5" /></span>
                <span className="max-w-28 truncate text-sm">{user.displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[#aa9159]/35 bg-[#0b2118] text-[#eee4cb]">
              <DropdownMenuLabel><span className="block truncate">{user.displayName}</span><span className="mt-0.5 block truncate text-xs font-normal text-[#d8d1bf]/55">{user.email}</span></DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#9c8248]/25" />
              <DropdownMenuItem asChild className="focus:bg-[#d0b36d]/15 focus:text-[#fff6dc]"><Link href="/account"><UserRound className="mr-2 h-4 w-4" />Account</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleLogout()} className="focus:bg-[#d0b36d]/15 focus:text-[#fff6dc]"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={openPauseDialog} onOpenChange={setOpenPauseDialog}>
        <DialogContent onInteractOutside={(event) => event.preventDefault()} className="w-auto p-6">
          <DialogHeader><DialogTitle>Leave the game</DialogTitle><DialogDescription>Your current round will not be saved.</DialogDescription></DialogHeader>
          <div className="mt-4 flex w-[300px] flex-col gap-3"><Button asChild><Link href="/home">Leave game</Link></Button><Button variant="ghost" onClick={() => setOpenPauseDialog(false)}>Cancel</Button></div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
