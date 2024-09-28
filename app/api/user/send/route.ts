import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { chain } from "@/lib/chain";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";


interface ExtendedNextApiRequest extends NextApiRequest {
  body: {
    receiver: string;
    amount: string;
  };
}

export default async function handler(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" });
  }

  const { receiver, amount } = await req.json();
  console.log(receiver, amount);

  const user = await prismadb.user.findUniqueOrThrow({
    where: { email: session.user.email ?? "" },
  });

  chain.push({
    sender: user.id,
    receiver,
    amount: parseInt(amount),
    timestamp: Date.now(),
  });

  const receiverUser = await prismadb.user.findFirstOrThrow({
    where: { id: receiver },
  });

  await prismadb.user.update({
    where: { id: user.id },
    data: {
      balance: user.balance - parseFloat(amount),
    },
  });

  await prismadb.user.update({
    where: { id: receiverUser.id },
    data: {
      balance: receiverUser.balance + parseFloat(amount),
    },
  });
  return NextResponse.json({ message: "Success!" });
}

export { handler as POST };
