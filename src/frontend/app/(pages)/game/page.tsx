"use client";

import { Cross1Icon } from "@radix-ui/react-icons";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import DealCards from "@/lib/cards-play/deal-card-animation";
import { HeaderBar } from "@/lib/my-components/header-bar";
import DozenalGinRummyRules from "@/lib/my-components/rule";
import { publicAssetPath } from "@/lib/publicAsset";
import { setGameStatus } from "@/lib/shared-store/slices/game";
import { AppDispatch, RootState } from "@shared-store/index";

const BOARD_IMAGE_WIDTH = 3508;
const BOARD_IMAGE_HEIGHT = 2480;
const BOARD_ASPECT_RATIO = BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT;

// DealCards uses pixel-based positions. Keeping one canonical coordinate space
// lets the background and every game element scale together without distortion.
const GAME_UI_WIDTH = 1300;
const GAME_UI_HEIGHT = GAME_UI_WIDTH / BOARD_ASPECT_RATIO;

function GameContent() {
  const searchParams = useSearchParams();
  const fullRoomId = searchParams.get("roomId") ?? "tutorial";
  const roomId = fullRoomId.split("-")[0];
  const host = fullRoomId.split("-")[1] ?? "1";

  const dispatch = useDispatch<AppDispatch>();
  const game = useSelector((state: RootState) => state.game);
  const user = useSelector((state: RootState) => state.user);

  const [userName, setUserName] = useState("");
  const [boardScale, setBoardScale] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);
  const sidebarOpen = Boolean(game.showSideBar);

  useEffect(() => {
    setUserName(user.username === "" ? "User" : user.username);
  }, [user.username]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    let animationFrame = 0;
    const updateScale = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (board.clientWidth > 0) {
          setBoardScale(board.clientWidth / GAME_UI_WIDTH);
        }
      });
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(board);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  const handleClose = () => {
    dispatch(setGameStatus({ showSideBar: null }));
  };

  return (
    <div className="flex h-screen min-h-[640px] min-w-[1100px] flex-col overflow-hidden bg-[#06110d]">
      <HeaderBar />

      <main className="flex min-h-0 flex-1 overflow-hidden p-2">
        <aside
          aria-hidden={!sidebarOpen}
          className="h-full shrink-0 overflow-hidden rounded-sm bg-[#f1ead9] text-[#17231d] shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition-[width,margin] duration-500 ease-in-out"
          style={{
            width: sidebarOpen ? "340px" : "0px",
            marginRight: sidebarOpen ? "8px" : "0px",
            visibility: sidebarOpen ? "visible" : "hidden",
          }}
        >
          {sidebarOpen && (
            <div className="flex h-full w-[340px] flex-col">
              <div className="flex shrink-0 items-start justify-between border-b border-[#1a3a2b]/15 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6f38]">
                    Table guide
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-[#10251a]">
                    Dozenal Gin Rummy Rules
                  </h2>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClose}
                  aria-label="Close rules"
                  className="-mr-2 -mt-2 shrink-0 text-[#294235] hover:bg-[#163426]/10"
                >
                  <Cross1Icon className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-5">
                <DozenalGinRummyRules />
              </div>
            </div>
          )}
        </aside>

        <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-sm border border-[#9b824e]/30 bg-[#020a07] shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]">
          <div
            ref={boardRef}
            className="relative max-w-full overflow-hidden border border-[#c0a361]/35 bg-[#07150f] shadow-[0_26px_70px_rgba(0,0,0,0.5)]"
            style={{
              aspectRatio: `${BOARD_IMAGE_WIDTH} / ${BOARD_IMAGE_HEIGHT}`,
              width: `min(100%, calc((100vh - 4.5rem) * ${BOARD_ASPECT_RATIO}))`,
              maxWidth: "1600px",
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${publicAssetPath("/main-image/background-nothing.jpg")}")`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 bg-[#00130d]/20 shadow-[inset_0_0_80px_rgba(0,0,0,0.28)]"
            />

            <div
              className="absolute left-1/2 top-1/2 z-20"
              style={{
                width: `${GAME_UI_WIDTH}px`,
                height: `${GAME_UI_HEIGHT}px`,
                transform: `translate(-50%, -50%) scale(${boardScale})`,
                transformOrigin: "center",
              }}
            >
              <DealCards roomId={roomId} host={host} userName={userName} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06110d] font-serif text-lg text-[#f5edd9]">
          Preparing the table…
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
