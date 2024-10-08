"use client";

import AuthCheck from "@/components/AuthCheck";
import BlockchainVisualizer from "@/components/BlockchainVisualizer";
import DSTransactionGraph from "@/components/DSTransactionGraph";
import NavBar from "@/components/NavBar";
import { Block } from "@/lib/chain";
import { useEffect, useState } from "react";

export default function Visualise() {
  //   const chain: Block[] = [
  //     { sender: "Alice", receiver: "Bob", amount: 50, timestamp: Date.now() },
  //     { sender: "Bob", receiver: "Charlie", amount: 30, timestamp: Date.now() },
  //     { sender: "Charlie", receiver: "Dave", amount: 20, timestamp: Date.now() },
  //     { sender: "Dave", receiver: "Alice", amount: 25, timestamp: Date.now() },
  //     { sender: "Dave", receiver: "Alice", amount: 25, timestamp: Date.now() },
  //   ];
  const [chain, setChain] = useState([]);

  useEffect(() => {
    async function fetchChain() {
      const res = await fetch("/api/chain", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      console.log(data);
      setChain(data);
    }
    fetchChain();
  }, []);
  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <div className="flex flex-col items-center justify-center">
          <DSTransactionGraph chain={chain} />
          <BlockchainVisualizer />
        </div>
      </div>
    </AuthCheck>
  );
}
