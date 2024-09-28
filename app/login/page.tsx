"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { signIn } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";

interface LoginType {
  email: string;
  password: string;
}

export default function LoginForm() {
  const { register, handleSubmit } = useForm<LoginType>();
  const onSubmit: SubmitHandler<LoginType> = async (data) => {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      callbackUrl: "/",
    });
  };
  return (
    <div className="text-slate-950 min-h-screen flex justify-center items-center">
      <Card className="w-full max-w-sm bg-slate-100">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="off"
                required
                {...register("email")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="off"
                required
                {...register("password")}
              />
            </div>
            <Button className="w-full mt-3" type="submit">
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="mx-auto text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline font-semibold">
              Sign up
            </Link>
          </div>
        </CardFooter>
        <CardFooter>
          <div className="mx-auto bg-slate-100 flex gap-2 items-center border-slate-950 border-2 px-3 py-1 rounded-xl cursor-pointer">
            <button
              className="font-medium"
              onClick={() => {
                signIn("google", { callbackUrl: "/" });
              }}
            >
              Google
            </button>{" "}
            <FaGoogle />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
