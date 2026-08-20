import { Button } from "@/components/ui/button"
import Link from "next/link";


import { LogInForm } from "@my-components/login-form";

export default function Login() {
  return (
    
    <div className="w-full h-full flex"> 
      <div className="w-full flex flex-col items-center justify-center">
        <div> Log In </div>
        <LogInForm></LogInForm>
        <Button variant="link"><Link href="/signup" className="">Sign Up</Link></Button>
        <Button variant="link"><Link href="/home" className="">back to home</Link></Button>
      </div>
    </div>
   
  );
}

