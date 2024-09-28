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

import { SubmitHandler, useForm } from "react-hook-form";
import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";

interface TransactionType {
  accountNumber: string;
  amount: string;
}

export default function Dashboard() {
  const { register, handleSubmit } = useForm<TransactionType>();

  const onSubmit: SubmitHandler<TransactionType> = async (data) => {};
  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <Card className="w-full max-w-sm bg-slate-100 mt-16">
          <CardHeader>
            <CardTitle className="text-2xl">Send Money</CardTitle>
            <CardDescription>Enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="email">Account Number</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  required
                  {...register("accountNumber")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Amount</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="off"
                  required
                  {...register("amount")}
                />
              </div>
              <Button className="w-full mt-3" type="submit">
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthCheck>
  );
}
