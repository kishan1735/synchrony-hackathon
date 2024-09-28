import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { chain } from "@/lib/chain";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

interface ExtendedNextApiRequest extends NextApiRequest {
  query: {
    receiver: string;
    amount: string;
  };
}

async function handler(req: ExtendedNextApiRequest) {
  const session = await getServerSession(authOptions);
  console.log(session);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized", status: 401 });
  }

  const user = await prismadb.user.findUniqueOrThrow({
    where: { email: session.user.email ?? "" },
  });
  return NextResponse.json(user);
}

export { handler as GET };
