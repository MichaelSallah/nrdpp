/*
  Warnings:

  - You are about to drop the column `covidLevyAmount` on the `Quotation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "covidLevyAmount",
ADD COLUMN     "taxMode" TEXT NOT NULL DEFAULT 'AUTO';
