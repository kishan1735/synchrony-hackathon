"use client";
import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@radix-ui/react-label";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [accountDetails, setAccountDetails] = useState<any>(null);

  async function fetchAccountDetails() {
    const res = await fetch("/api/user/info");
    const data = await res.json();
    setAccountDetails(data);
    return data;
  }
  useEffect(() => {
    fetchAccountDetails();
  }, []);

  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <Card className="w-full max-w-lg bg-slate-100 mt-4">
          <CardHeader>
            <CardTitle className="text-2xl">Your Account</CardTitle>
            <CardDescription>View your current account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 border border-2 border-slate-800 py-8">
              <div className="flex space-x-4 items-center">
                <div className="text-xl font-medium">Account ID</div>
                <Label htmlFor="email">{accountDetails?.id}</Label>
              </div>
              <div className="flex space-x-4 items-center">
                <div className="text-xl font-medium">Balance</div>
                <Label htmlFor="email">{Number.parseFloat(accountDetails?.balance).toFixed(2)}</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        <Link
          href="/transaction"
          className="text-xl md:text-2xl border-2 border-slate-300 p-3 flex items-center gap-2 w-44 md:w-48 hover:bg-slate-900 hover:scale-105"
        >
          <p className="mx-auto">Send Money</p>
        </Link>
      </div>
    </AuthCheck>
  );
}
