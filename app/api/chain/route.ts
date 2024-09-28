import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

interface ExtendedNextApiRequest extends NextApiRequest {
  query: {
    receiver: string;
    amount: string;
  };
}

async function handler(req: ExtendedNextApiRequest) {
  const chain = await prismadb.block.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(chain);
}

export { handler as GET };
