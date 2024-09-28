"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { LoadingSpinner } from "./ui/spinner";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  if (status === "authenticated") return <>{children}</>;
  if (status === "loading")
    return (
      <div className="bg-black opacity-80 items-center justify-center min-h-screen py-64">
        <LoadingSpinner className="mx-auto" />;
      </div>
    );
  redirect("/login");
}
