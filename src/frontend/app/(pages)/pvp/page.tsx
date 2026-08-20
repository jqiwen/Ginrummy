"use client";

import { HeaderBar } from '@/lib/my-components/header-bar';


import { useState,useEffect, useRef } from 'react';
import * as React from "react"


import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import  { createRoom, joinRoom, checkRoomStatus, setGameStart , isGameStarted} from "@/lib/match_formation/match_formation";

import { useParams, useRouter } from "next/navigation";


export default function PVPPage() {
  return (
    <div className='w-full '>
                <HeaderBar></HeaderBar>
        <div className="w-full flex flex-col items-center justify-center">
            <JoinCard></JoinCard>
        </div>
    </div>
  );
}


function JoinCard() {
    const [isCreatingNewRoom, setIsCreatingNewRoom] = useState(false);
    const [currentTitle, setCurrentTitle] = useState('Join a Room');
    const [currentButton, setCurrenButton] = useState('Join');
    const [roomNumber, setRoomNumber] = useState('');
    const [createdRoomID, setCreatedRoomID] = useState<string | null>(null);

    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const [ableToStart, setAbleToStart] = useState<boolean>(false)

    const router = useRouter();


    useEffect(() => {
        console.log(isCreatingNewRoom);
        if (isCreatingNewRoom) {
            setCurrentTitle('Create a Room');
            setCurrenButton('Create');
        } else {
            setCurrentTitle('Join a Room');
            setCurrenButton('Join');
        }
    }, [isCreatingNewRoom]);

    // create 查询玩家是否已经加入
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
      
        if (createdRoomID && isCreatingNewRoom) {
          intervalId = setInterval(async () => {
            const status = await checkRoomStatus(createdRoomID);
      
            if (status.result === 0) {
              // Second player has joined, stop polling
              clearInterval(intervalId);
              setActionMessage("Second player has joined. You can now start!");
              setAbleToStart(true)
            }
          }, 2000); // every 2 seconds
        }
      
        return () => {
          if (intervalId) clearInterval(intervalId); // cleanup on unmount or mode change
        };
      }, [createdRoomID, isCreatingNewRoom]);

      // join 查询游戏是否开始
      useEffect(() => {
        let intervalId: NodeJS.Timeout;
      
        // 如果是 Join 模式，并且已设置 RoomID，就开始轮询是否游戏已开始
        if (createdRoomID && !isCreatingNewRoom) {
          intervalId = setInterval(async () => {
            const status = await isGameStarted(createdRoomID);
            console.log("Game start status:", status);
      
            if (status.result === 0) {
              clearInterval(intervalId);
              router.push(`/game/${createdRoomID}-0`);
            }
          }, 2000);
        }
      
        return () => {
          if (intervalId) clearInterval(intervalId);
        };
      }, [createdRoomID, !isCreatingNewRoom]);
      

    function handleSwitch(checked: boolean) {
        setIsCreatingNewRoom(checked);
        setRoomNumber(""); 
        setActionMessage(null); 
        setAbleToStart(false)
    }

    async function handleJoinOrClick(status: string) {
        if (status === "Join") {
          const joinResult = await joinRoom(roomNumber);
       
          
            if (joinResult.result === 200) {
                setCreatedRoomID(roomNumber);
                setActionMessage(joinResult.message); 
            } else {
                alert(joinResult.message)
            }

        } else if (status === "Create") {
          const newMatchID = await createRoom(); 
          if (newMatchID) {
            setCreatedRoomID(newMatchID);
            setRoomNumber(newMatchID)
            setActionMessage(`Waiting for other player to join...`);
          } else {
            setActionMessage("Failed to create room.");
          }
        }
    }
    
      
      
    return (
        <div
            className="w-full flex items-center justify-center"
            style={{ 
                height: "calc(100vh - 52px)",
                backgroundImage: "url('/main-image/poster.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center"
            }}
        >
            <Card className="w-[350px] bg-white bg-opacity-95 shadow-lg p-4 border-spacing-1">
                <CardHeader>
                    <CardTitle>{currentTitle}</CardTitle>
                    {!createdRoomID && <CardDescription>Switch to create if you are the holder.</CardDescription>}
                </CardHeader>
                <CardContent>
                    {actionMessage ? (
                        <div>
                            <div className="text-center text-gray-800 font-semibold text-sm">Room Number: </div>
                            <div className="text-3xl font-bold text-center text-amber-900 my-4">{createdRoomID}</div>
                            <div className="text-center text-gray-800 font-semibold text-sm"> {actionMessage}</div>
                        </div>
                  
                    ) : (
                        <form>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex items-center space-x-2">
                            <Switch
                                id="isCreatingNewRoom"
                                checked={isCreatingNewRoom}
                                onCheckedChange={handleSwitch}
                            />
                            <Label htmlFor="isCreatingNewRoom">Create</Label>
                            </div>

                            <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="number">Room NO.</Label>
                            <Input
                                id="number"
                                placeholder="Enter number"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                disabled={isCreatingNewRoom}
                            />
                            </div>
                        </div>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between">
                    {!createdRoomID ? (
                        <div className="flex justify-between w-full">
                        <Button variant={'outline'}>Back</Button>
                        <Button
                            onClick={() => handleJoinOrClick(currentButton)}
                            disabled={!isCreatingNewRoom && roomNumber.trim() === ""}
                            >
                            {currentButton}
                        </Button>
                        </div>
                    ) : (
                        <Button
                            className="ml-auto"
                            disabled={!ableToStart}
                            onClick={async () => {
                                const res = await setGameStart(createdRoomID!);
                                if (res.result === 0) {
                                router.push(`/game/${createdRoomID}-1`);
                                } else {
                                alert("Failed to start game: " + res.message);
                                }
                            }}
                            >
                            Start
                        </Button>
                    )}
                </CardFooter>

            </Card>
        </div>
    );
}


