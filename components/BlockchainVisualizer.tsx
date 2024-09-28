import { useEffect, useState } from "react";

function BlockchainVisualizer() {
  const [chain, setChain] = useState([]);
  async function fetchBlockchain() {
    const res = await fetch("/api/chain");
    const data = await res.json();
    setChain(data);
    return data;
  }

  useEffect(() => {
    fetchBlockchain();
  }, []);

  return (
    <>
      {chain.map((block, i) => (
        <div className="w-50 h-22 bg-slate-700 p-4 text-center">
          <div className=" text-sm italic">Block {i + 1}</div>
          <div className="text-lg">
            {block.senderId} → {block.receiverId}
            <br />
            Amount: {block.amount}
            <br />
          </div>
          <div className="text-sm italic">
            Timestamp: {new Date(block.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </>
  );
}

export default BlockchainVisualizer;
