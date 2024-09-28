/*
  Warnings:

  - You are about to drop the column `encyptedData` on the `Block` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `Block` table. All the data in the column will be lost.
  - Changed the type of `amount` on the `Block` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Block" DROP COLUMN "encyptedData",
DROP COLUMN "hash",
DROP COLUMN "amount",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL;
