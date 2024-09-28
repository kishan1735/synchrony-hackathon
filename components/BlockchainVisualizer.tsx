import { useEffect, useState } from "react";

function BlockchainVisualizer() {
  const [chain, setChain] = useState([]);
  const [encrypted, setEncrypted] = useState(false);
  async function fetchBlockchain() {
    const res = await fetch("/api/chain");
    const data = await res.json();
    setChain(data);
    return data;
  }

  const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');


  useEffect(() => {
    fetchBlockchain();
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-10 -mt-48">
      {chain.map((block, i) => (
        <div className="w-50 bg-slate-700 p-4 text-center " onClick={() => setEncrypted(!encrypted)}>
          <div className="text-sm italic">Block {i + 1}</div>
          <div className="text-lg">
            {encrypted ? `Hash: ${genRanHex(64)}` : `${block.senderId} → ${block.receiverId}`}
            <br />
            {encrypted ? `${genRanHex(128)}...` : `Amount: ${block.amount}`}
            <br />
          </div>
          <div className="text-sm italic">
            Timestamp: {new Date(block.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BlockchainVisualizer;
