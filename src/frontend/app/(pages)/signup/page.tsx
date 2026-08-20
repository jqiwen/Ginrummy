"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link";

import { useSelector,} from 'react-redux';
import { RootState } from '@shared-store/index'; 


import {SignUpForm} from "@my-components/signup-form"

export default function SignUp() {

  const user = useSelector((state: RootState) => state.user);
  console.log(user);


  return (
    
    <div className="w-full h-full flex"> 
      <div className="w-full flex flex-col items-center justify-center">
        <div> SignUp </div>
        <SignUpForm></SignUpForm>
        <Button variant="link"><Link href="/login" className="">back to log in</Link></Button>
      </div>
    </div>
   
  );
}
