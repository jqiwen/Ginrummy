import { Button } from "@/components/ui/button"
import Link from "next/link";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { Url } from "next/dist/shared/lib/router/router";
type ButtonVariant = "secondary" | "outline" | "ghost" | "link" | "default" | "destructive" | null | undefined;


export function MyShowTooltipButton({
    varient = "default",
    IconName,
    tooltipContent,
    link}:{
        varient?:ButtonVariant,
        IconName?:any, 
        tooltipContent:string,
        link?:Url}){
    return(
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                  { link? (
                    <Link href={link} className="flex items-center">
                         <MyButton varient={varient} IconName={IconName}></MyButton>
                     </Link>
                    ):(
                        <MyButton varient={varient} IconName={IconName}></MyButton>
                    )
                    }
                </TooltipTrigger>
                <TooltipContent>
                <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export function MyButton({varient = "default", IconName}:{varient:ButtonVariant, IconName?:any}){
  
    return(
        <Button variant={varient} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
            {IconName? (
                <IconName className="h-5 w-5 text-gray-700" />
                ):null}
          
        </Button>
    )
}