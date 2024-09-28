import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { chain } from "@/lib/chain";

interface ExtendedNextApiRequest extends NextApiRequest {
  query: {
    receiver: string;
    amount: string;
  };
}

export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.id) {
    return res.status(401).send("Unauthorized");
  }

  const { receiver, amount } = req.query;
  chain.push({
    sender: session.user.id,
    receiver,
    amount: parseInt(amount),
    timestamp: Date.now(),
  });

  await prismadb.user.update({
    where: { id: session.user.id },
    data: {
      balance: {
        decrement: parseInt(amount),
      },
    },
  });
  return res.status(200).json({ message: "Success!" });
}
