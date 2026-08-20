

"use client";

import { HeaderBar } from "@/lib/my-components/header-bar";
import DealCards from "@/lib/cards-play/deal-card-animation";

import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@shared-store/index";
import { useEffect, useState } from "react";
import { setGameStatus } from "@/lib/shared-store/slices/game";

import { Button } from "@/components/ui/button";
import { Cross1Icon } from "@radix-ui/react-icons";

import { useParams } from "next/navigation";
import { setTimeout } from "timers/promises";

import DozenalGinRummyRules from "@/lib/my-components/rule"

// host -> 1
// join -> 0

export default function GamePage() {
    const params = useParams();
    const routRroomId = params?.roomid;

    const fullRoomId = Array.isArray(routRroomId) ? routRroomId[0] : routRroomId;
    const roomId = fullRoomId.split("-")[0];
    const host = fullRoomId.split("-")[1] ?? '1';

    // console.log(roomId);
    

    const dispatch = useDispatch<AppDispatch>();
    const game = useSelector((state: RootState) => state.game);

    const [animateClose, setAnimateClose] = useState(true);
    const [showRefreshWarning, setShowRefreshWarning] = useState(true);


    const [userName, setUserName] = useState<string>('')

    // const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.user);
    useEffect(() => {
        console.log("Updated user info: ", user);
        console.log("ooooooooooooooooooooooooooooooooooooooooo:",user);
        if (user.username == '') {
            setUserName('User')
        } else{
            setUserName(user.username)
        }
        
    }, [user]);


    useEffect(() => {
        console.log("Updated game Status: ", game);
        if (game.showSideBar) {
            setAnimateClose(false);
        }
    }, [game]);

    const handleClose = () => {
        setAnimateClose(true);
        dispatch(setGameStatus({ showSideBar: null }));
    };

    return (
        <div className="h-full w-full flex flex-col relative">
            <HeaderBar />
            {showRefreshWarning && (
                <div className="relative bg-yellow-100 text-yellow-800 font-semibold text-center py-2 px-4 shadow-md border-b border-yellow-300 z-10">
                    ❗ Please do not refresh this page during the game.

                    {/* 关闭按钮 */}
                    <button
                    onClick={() => setShowRefreshWarning(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-800 hover:text-red-600 text-lg font-bold"
                    aria-label="Close warning"
                    >
                    ✕
                    </button>
                </div>
                )}
            <div className="flex w-full h-[600px] pt-2 py-4 px-4 transition-all duration-500 ease-in-out" style={{
    minHeight: showRefreshWarning
      ? "calc(100vh - 102px)"
      : "calc(100vh - 52px)",
  }}>
                {/* Left Drawer */}
                <div
                    className={`bg-gray-100 h-full  transition-all duration-500 ease-in-out flex ${
                        animateClose ? "" : "mr-4"
                    }`}
                    
                    style={{
                        width: game.showSideBar ? "350px" : "0px",
                        visibility: game.showSideBar || !animateClose ? 'visible' : 'hidden',
                    }}
                >
                    {game.showSideBar && (
                        <div>


                        <div className={`p-4 relative w-full  ${
                            animateClose ? "" : "pl-4"
                        }`}>  
                            <Button size="icon" variant="ghost"  onClick={handleClose} className="absolute top-2 right-2" >
                                <Cross1Icon  className="h-4 w-4" />
                            </Button>

                        </div>

                        <h2 className="text-3xl font-bold px-4">Dozenal Gin Rummy Rules</h2>
                        <div className="flex-1 overflow-y-auto " style={{ height: "calc(100vh - 200px)" }}>
                            
                            <DozenalGinRummyRules />
                        </div>
                        </div>
                    )}

                  
                </div>


                {/* Right Play Table*/}
                <div
                    className="h-full flex flex-col items-center justify-center transition-all duration-500 ease-in-out relative"
                    style={{ flex: game.showSideBar ? 1 : 2 }}
                >
                    {/* 背景层 */}
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            backgroundImage: `url('/main-image/background-nothing.jpg')`, // 替换成你的图片路径
                            backgroundSize: '100% 100%', // 完全填充，可变形
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            opacity: 0.3, // 仅背景图透明
                        }}
                    ></div>

                                    <DealCards roomId={roomId} host={host} userName={userName}/>
                                </div>
                            </div>
                        </div>
                    );

                }
