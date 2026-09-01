"use client";

import { ArrowRight, BookOpenText, Diamond, LoaderCircle, Play, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { publicAssetPath } from "@/lib/publicAsset";
import { HeaderBar } from "@/lib/my-components/header-bar";
import type { RootState } from "@shared-store/index";

const gameModes = [
  {
    href: "/game?mode=tutorial",
    title: "Tutorial",
    description: "Learn the dozenal Gin Rummy rules and controls.",
    icon: BookOpenText,
  },
  {
    href: "/pvp",
    title: "Play with a Friend",
    description: "Invite a registered player to a private table.",
    icon: UsersRound,
    requiresAccount: true,
  },
];

export default function HomePage() {
  const authStatus = useSelector((state: RootState) => state.user.status);

  return (
    <div className="flex h-screen min-h-[640px] min-w-[1100px] flex-col overflow-hidden bg-[#06110d] text-[#f5edd9]">
      <HeaderBar />

      <main className="min-h-0 flex-1 px-5 py-4 xl:px-9 xl:py-6">
        <section className="mx-auto grid h-full max-w-[1600px] grid-cols-[minmax(320px,0.43fr)_minmax(0,1fr)] overflow-hidden rounded-sm border border-[#9c8248]/45 bg-[#091912] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="relative z-10 flex min-h-0 flex-col justify-between border-r border-[#9c8248]/30 bg-[#0b2118]/95 px-8 py-8 xl:px-12 xl:py-12">
            <div>
              <div className="mb-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#cbb270]">
                <span className="h-px w-8 bg-[#cbb270]/70" />
                A dozenal card game
              </div>

              <h1 className="font-serif text-[clamp(3.25rem,4.5vw,5.8rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-[#fff7df]">
                GIN
                <br />
                RUMMY
              </h1>
              <p className="mt-5 font-serif text-xl italic tracking-[0.06em] text-[#d5bd7e] xl:text-2xl">
                With a twist.
              </p>
              <p className="mt-6 max-w-[30rem] text-sm leading-6 text-[#d8d1bf]/80 xl:text-base xl:leading-7">
                Classic Gin Rummy, reimagined with a dozenal deck.
              </p>
            </div>

            <div className="pt-6">
              <Drawer shouldScaleBackground={false}>
                <DrawerTrigger asChild>
                  <Button className="group/play h-14 w-full rounded-sm border border-[#ead28d]/45 bg-[#c6a354] text-sm font-black tracking-[0.24em] text-[#102018] shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#d8ba70] active:translate-y-0">
                    <Play className="mr-2 h-4 w-4 fill-current transition-transform duration-200 group-hover/play:scale-110" />
                    PLAY
                  </Button>
                </DrawerTrigger>

                <DrawerContent className="border-[#8b7545] bg-[#081711] text-[#f7eed8] shadow-[0_-24px_70px_rgba(0,0,0,0.5)]">
                  <div className="mx-auto w-full max-w-4xl px-8 pb-9 pt-2">
                    <DrawerHeader className="px-0 pb-6 text-center">
                      <DrawerTitle className="font-serif text-3xl font-semibold tracking-tight text-[#fff5d8]">
                        Choose your game
                      </DrawerTitle>
                      <DrawerDescription className="mt-2 text-sm text-[#d5ccba]/70">
                        Learn the deck or invite a friend to the table.
                      </DrawerDescription>
                    </DrawerHeader>

                    <div className="grid grid-cols-2 gap-4">
                      {gameModes.map((mode) => {
                        const Icon = mode.icon;
                        const isPreparing = mode.requiresAccount && authStatus === "initializing";
                        const needsLogin = mode.requiresAccount && authStatus !== "authenticated";
                        const href = needsLogin ? "/login?next=%2Fpvp" : mode.href;

                        const content = (
                          <>
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#c8aa63]/45 bg-[#07140f] text-[#d8bb71]">
                              {isPreparing ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-serif text-xl font-semibold text-[#fff4d5]">
                                {isPreparing ? "Preparing table…" : mode.title}
                              </span>
                              <span className="mt-1 block text-sm leading-5 text-[#d8d0be]/65">
                                {isPreparing ? "Restoring your authenticated session." : mode.description}
                              </span>
                              {needsLogin && !isPreparing && (
                                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#cbb270]">
                                  Account required
                                </span>
                              )}
                            </span>
                            {!isPreparing && <ArrowRight className="h-5 w-5 shrink-0 text-[#cdb16b] transition-transform duration-200 group-hover/mode:translate-x-1" />}
                          </>
                        );

                        if (isPreparing) {
                          return <div key={mode.href} role="status" aria-label="Preparing private match" className="flex min-h-32 items-center gap-5 rounded-sm border border-[#a98d50]/25 bg-[#10271d]/70 p-6 opacity-75">{content}</div>;
                        }

                        return (
                          <Link
                            key={mode.href}
                            href={href}
                            className="group/mode flex min-h-32 items-center gap-5 rounded-sm border border-[#a98d50]/35 bg-[#10271d] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d2b66e]/75 hover:bg-[#153126] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b66e]"
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>

              <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#d1c7b0]/45">
                <span>Two players</span>
                <Diamond className="h-2.5 w-2.5 fill-[#b89b58] text-[#b89b58]" />
                <span>Dozenal deck</span>
              </div>
            </div>
          </div>

          <div className="group/poster relative min-h-0 overflow-hidden bg-[#020705]">
            <Image
              src={publicAssetPath("/main-image/poster.jpg")}
              alt="Gin Rummy Dozenal poster featuring the K6T card deck"
              fill
              priority
              sizes="(min-width: 1600px) 1120px, 72vw"
              className="object-contain object-center transition-transform duration-500 ease-out group-hover/poster:scale-[1.008]"
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.34)]" />
            <div className="absolute bottom-5 right-6 border border-[#ead08b]/30 bg-[#06110d]/80 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[#eadcae]/70 backdrop-blur-sm">
              K6T · Dozenal deck
            </div>
          </div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-[#9c8248]/25 bg-[#07140f] px-6 py-2.5 text-center text-[11px] tracking-[0.08em] text-[#d8d0bd]/55">
        K6T dozenal deck of cards by J. L. Cazaux, Pionissimo
      </footer>
    </div>
  );
}
