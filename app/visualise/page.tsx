"use client";

import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";
import TransactionGraph from "@/components/TransactionGraph";
import { Block } from "@/lib/chain";

export default function Visualise() {
  const chain: Block[] = [
    { sender: "Alice", receiver: "Bob", amount: 50, timestamp: Date.now() },
    { sender: "Bob", receiver: "Charlie", amount: 30, timestamp: Date.now() },
    { sender: "Charlie", receiver: "Dave", amount: 20, timestamp: Date.now() },
    { sender: "Dave", receiver: "Alice", amount: 25, timestamp: Date.now() },
    { sender: "Dave", receiver: "Alice", amount: 25, timestamp: Date.now() },
  ];
  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <TransactionGraph chain={chain} />
      </div>
    </AuthCheck>
  );
}
