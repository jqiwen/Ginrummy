"use client"

// import { useSearchParams } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import {useDispatch } from 'react-redux';
import {  setUserInfo } from '@shared-store/slices/user';
import { AppDispatch } from '@shared-store/index'; 
// import { useEffect } from 'react';

import { useRouter } from "next/navigation"

import { authLogin } from "@/lib/socket";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string()
})

export function LogInForm() {

  const router = useRouter();
  
  const dispatch = useDispatch<AppDispatch>();
  // const user = useSelector((state: RootState) => state.user);
  // useEffect(() => {
  //   console.log("Updated user info: ", user);
  // }, [user]);

  const onLogin = async (data: z.infer<typeof formSchema>) => {
    console.log("login data: ", data); //TO BE DELETED
    const returned_data = await authLogin(data.username, data.password);
      console.log(returned_data)
      if (returned_data.code == 0) {
        // 登录成功时将数据存储到 Redux store
        dispatch(setUserInfo({ username: data.username })); // 传递 username
        console.log("Mark 1: User info dispatched: ", { username: data.username });
        router.push("/home");
      }
      if (returned_data.code != 0) {
        // TODO: show error message
        console.log("login failed")
        console.log(returned_data.message)
        // TODO: show error message
        alert(returned_data.message)
        return // 登录失败时不做任何事情, 密码错误则直接离开登录流程
      }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLogin)} className="w-[500px] flex flex-col gap-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} className="w-full" />
              </FormControl>
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
                <Input type="password" {...field} className="w-full"  />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">LogIn</Button>
      </form>
    </Form>
  )
}
