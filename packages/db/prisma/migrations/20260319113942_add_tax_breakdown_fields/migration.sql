-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "covidLevyAmount" DECIMAL(18,2),
ADD COLUMN     "getfundAmount" DECIMAL(18,2),
ADD COLUMN     "grandTotal" DECIMAL(18,2),
ADD COLUMN     "nhilAmount" DECIMAL(18,2),
ADD COLUMN     "totalTax" DECIMAL(18,2);
