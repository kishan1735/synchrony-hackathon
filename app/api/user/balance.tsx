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
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.id) {
    return res.status(401).send("Unauthorized");
  }

  const { balance } = await prismadb.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  return res.status(200).json({ balance });
}
