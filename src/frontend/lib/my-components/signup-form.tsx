"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {useDispatch } from 'react-redux';
import {  setUserInfo } from '@shared-store/slices/user';
import { AppDispatch } from '@shared-store/index'; 

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useEffect } from "react";

const backend_url = process.env.BACKEND_URL || "https://backend.ginrummys.ca";
const formSchema = z
  .object({
    username: z.string().min(2, {
      message: "Username must be at least 2 characters.",
    }),
    nickname: z.string(),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmed: z.string(),
  })
  .refine((data) => data.password === data.confirmed, {
    message: "Password doesn't match.",
    path: ["confirmed"],
  })

export function SignUpForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
   // 1. Define your form.
   const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      nickname:"",
      password:"",
      confirmed:""
    },
  })
 
  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    console.log("sign up success")
    // On submit, send a POST request to backend server to communicate the request.
    fetch(`${backend_url}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: values.username,
        nickname: values.nickname,
        password: values.password,})
    })
    .then((response) => response.json())
    .then((data) => {
      if (data["result"] == 0) {
        dispatch(setUserInfo({ username: values.username }));
        router.push("/home");
      }
      else if (data["result"] == 1) {
        // TODO: show error message
        console.log("username already exists")
        alert("username already exists")
      }
      else {
        console.log("sign up failed")
        console.log(data["message"])
        // TODO: show error message
        alert(data["message"])
      }
    })
    
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-[500px] flex flex-col gap-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input  {...field} />
              </FormControl>
              {/* <FormDescription>
                Username must be at least 2 characters.
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nickname</FormLabel>
              <FormControl>
                <Input  {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              {/* <FormDescription>
                Password must be at least 8 characters.
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              {/* <FormDescription>
                This is your public display name.
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign Up</Button>
      </form>
    </Form>
  )
}
