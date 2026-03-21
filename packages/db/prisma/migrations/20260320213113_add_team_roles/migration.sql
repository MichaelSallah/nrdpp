-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MANAGER', 'VIEWER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "teamRole" "TeamRole" NOT NULL DEFAULT 'OWNER';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
