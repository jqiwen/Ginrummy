"use client"

import { useSelector, useDispatch } from 'react-redux';
import {  setUserInfo } from '@shared-store/slices/user';
import { AppDispatch, RootState } from '@shared-store/index'; 
import { useEffect, useState } from 'react';

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from 'next/image';

import { HeaderBar } from '@/lib/my-components/header-bar';
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
  } from "@/components/ui/drawer"
import { DialogTitle, DialogDescription } from "@radix-ui/react-dialog"; 
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; 

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function homePage() {

    const backend_url = process.env.BACKEND_URL || "https://backend.ginrummys.ca";
    // const backend_url = "http://localhost:8080";

    // 不要删
    // const dispatch = useDispatch<AppDispatch>();
    // const user = useSelector((state: RootState) => state.user);
    // useEffect(() => {
    //     console.log("Updated user info: ", user);
    // }, [user]);

    return(
        <div className='h-full w-full '>
            <HeaderBar></HeaderBar>
            <div className='flex felx-col items-center justify-center w-full flex-1 pt-[50px]'>
                <div className="group relative flex flex-col w-[90%] h-[700px]  rounded-lg shadow-lg transition-all duration-300 ease-in-out">
                    <div className="flex h-full w-full">
                        <Image  src="/main-image/poster.jpg"
                                alt="poster"
                                layout="fill"
                                objectFit="cover"
                                style={{ borderRadius: '4px', zIndex:-1 }}
                            />
                    </div>

                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button className="w-full transition-transform duration-300 font-black z-100">PLAY</Button>
                        </DrawerTrigger>
                        <DrawerContent className="m-4 w-full h-auto flex items-center justify-center">
                            <VisuallyHidden>
                                <DialogTitle>Game Options</DialogTitle>
                                <DialogDescription>Choose your game mode and start playing!</DialogDescription>
                            </VisuallyHidden>
                            <div className='flex flex-col w-[300px] gap-4 m-4 '>
                                {StartButton("/game/tutorial", "Start a tutorial")}
                                {/* {StartButton("", "Continue a Game")} */}
                                {/* {StartButton("", "Start a Tutorial")} */}
                                {StartButton("/pvp", "Play with a Friend")}
                            </div>
                        </DrawerContent>
                    </Drawer>
                </div>
            </div>

            <div className="w-full fixed bottom-0 text-center  bg-gray-100 py-2 text-sm text-gray-800 z-50">
            K6T dozenal deck of cards by J. L. Cazaux, Pionissimo
            </div>
        </div>    
    )
}



function StartButton(href: string, name: string) {
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.user);
    
    // const isDisabled = name == 'Play with a Friend' && (!user || user.username === '');
    const isDisabled = false;


    return (
        <TooltipProvider >
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="w-full">
                        <Button asChild className="w-full" disabled={isDisabled}>
                            <Link
                                href={href}
                                className={`w-full text-center transition-transform duration-300 hover:opacity-75 ${
                                    isDisabled ? "pointer-events-none opacity-50" : ""
                                }`}
                            >
                                {name}
                            </Link>
                        </Button>
                    </div>
                </TooltipTrigger>
                {isDisabled && (
                    <TooltipContent className='bg-gray-400'>
                        <span  >Please Log in First</span>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}

