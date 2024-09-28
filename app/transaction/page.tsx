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

export default function Transaction() {
  const { register, handleSubmit } = useForm<TransactionType>();

  async function sendMoney({ receiver, amount }) {
    const data = await fetch("/api/user/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ receiver, amount }),
    });
    const res = await data.json();
    console.log(res);
  }

  const onSubmit: SubmitHandler<TransactionType> = async (data) => {
    await sendMoney({
      receiver: data.accountNumber,
      amount: data.amount,
    });
  };
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
                  type="text"
                  autoComplete="off"
                  required
                  {...register("accountNumber")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Amount</Label>
                <Input
                  id="password"
                  type="number"
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
