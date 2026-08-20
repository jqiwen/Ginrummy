'use client';

import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@shared-store/index'; 
import { useEffect } from 'react';
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation'; 
import { useState } from "react";
import { setGameStatus } from '../shared-store/slices/game';

import { clearUserInfo } from '@shared-store/slices/user';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

  
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExitIcon, InfoCircledIcon, ArchiveIcon } from "@radix-ui/react-icons"

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
  } from "@/components/ui/hover-card";

  import { SideBarType } from '../shared-store/slices/game';


export function HeaderBar() {
    // 使用 useSelector 读取 Redux store 中的数据
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.user);
    const game = useSelector((state: RootState) => state.game);

    const router = useRouter();
    const pathname = usePathname();

    const [openPauseDialog, setOpenPauseDialog] = useState(false);

    useEffect(() => {
        console.log("Updated user info: ", user);
        console.log("Current URL:",  pathname )
    }, [user]);

    useEffect(() => {
        if (openPauseDialog) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
    }, [openPauseDialog]);


    function handleLogout() {
        dispatch(clearUserInfo());
    }

    function changeShowSideBar(state:SideBarType){
      if (game.showSideBar == state) {
        dispatch(setGameStatus({showSideBar:null}))
      } else {
        dispatch(setGameStatus({showSideBar:state}))
      }
    }
    

    return (
        <header className="sticky top-0 z-990 w-full flex items-center justify-between px-4 py-2 flex-row ">
            {/^\/game\/[^/]+$/.test(pathname)&& (
                <div className='flex flex-row gap-2'>
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild> 
                            <Button size="icon" variant="ghost" onClick={() => {setOpenPauseDialog(true)}}><ExitIcon className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="bg-black text-white px-3 py-2 rounded-md shadow-lg" style={{zIndex: 1000 }}>
                            <p>Leave</p>
                        </TooltipContent>
                    </Tooltip>

                    <Dialog open={openPauseDialog} onOpenChange={setOpenPauseDialog}>
                        <DialogContent onInteractOutside={(event) => event.preventDefault()}
                                        className="w-auto h-auto -w-full max-h-full p-6 rounded-md shadow-lg">
                            <DialogHeader>
                                <DialogTitle>Leave the game</DialogTitle>
                                <DialogDescription className='flex flex-col h-full justify-center'>
                                    {/* <span>Prograss will not be saved automatically</span> */}
                                </DialogDescription>
                            </DialogHeader>
                            <div className='flex flex-col w-[300px] gap-4 m-4 '>
                                    {/* {StartButton('/home', "Save and Leave")} */}
                                    {StartButton('/home', "Leave (without save)")}
                                    {/* {StartButton('/game/tutorial', "Restart")} */}
                                    <Button variant="ghost" onClick={() => setOpenPauseDialog(false)}>Cancel</Button>
                                </div>
                        </DialogContent>
                    </Dialog>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild> 
                            <Button size="icon" variant={game.showSideBar === 'Rules' ? "secondary" : "ghost"} onClick={() => {changeShowSideBar('Rules')}}><InfoCircledIcon  className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="bg-black text-white px-3 py-2 rounded-md shadow-lg flex" style={{ zIndex: 1000 }}>
                            <p>Rules</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild> 
                            <Button size="icon" variant={game.showSideBar === 'Grades' ? "secondary" : "ghost"} onClick={() => {changeShowSideBar('Grades')}}><ArchiveIcon  className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="bg-black text-white px-3 py-2 rounded-md shadow-lg flex" style={{ zIndex: 1000 }}>
                            <p>Points</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider> */}



                </div>

            ) }

            {pathname == "/home" && (
                <div>HOME</div>
            )}

            {pathname == "/pvp" && (
                <div>
                    <Link href={"/home"}
                          className="w-full text-center transition-transform duration-300 hover:opacity-75 pr-2" 
                        >
                        HOME
                    </Link> 
                        / PVP
                </div>
            )}



            {user.username ? (
                    <HoverCard openDelay={0} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <Button variant="ghost">{user.username}</Button>
                        </HoverCardTrigger>
                        <HoverCardContent side="bottom" align="end" className=" w-auto h-auto flex flex-col gap-2 shadow-lg border-none">
                                {/* <Button variant="ghost">My Profile</Button>
                                <Button variant="ghost">My Friends</Button> */}
                                <Button variant="ghost" onClick={handleLogout}>Log out</Button>
                        </HoverCardContent>
                    </HoverCard>

                ) : (
                    <Button variant="ghost"><Link href="/login">Log in</Link></Button>
                )
            }
        </header>
    );
}


function StartButton(href: string, name: string) {
    return (
      <Button asChild className="w-full">
        <Link
          href={href}
          className="w-full text-center transition-transform duration-300 hover:opacity-75" 
        >
          {name}
        </Link>
      </Button>
    );
  }