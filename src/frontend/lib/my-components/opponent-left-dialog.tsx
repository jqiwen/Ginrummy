"use client";

import { DoorOpen, LoaderCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function OpponentLeftDialog({ secondsRemaining }: { secondsRemaining: number }) {
  return (
    <Dialog open>
      <DialogContent
        className="w-[390px] border border-[#b89b58]/55 bg-[#07150f] px-8 py-9 text-center text-[#f5edd9] shadow-[0_28px_90px_rgba(0,0,0,0.72)] [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#10271d] text-[#d8bb71]" aria-hidden="true">
            <DoorOpen className="h-5 w-5" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#cbb270]">Table closed</p>
          <DialogTitle className="font-serif text-2xl font-semibold text-[#fff4d5]">Opponent left the table</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-[#d8d1bf]/75">
            Your opponent has left the game.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 border-t border-[#9c8248]/25 pt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#d8d1bf]/55">Returning home in</p>
          <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 font-serif text-4xl font-semibold text-[#d8bb71]">
            {secondsRemaining}
          </p>
          <LoaderCircle className="mx-auto mt-4 h-4 w-4 animate-spin text-[#cbb270]/70" aria-hidden="true" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
