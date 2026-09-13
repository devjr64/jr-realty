-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "agentId" TEXT;

-- CreateIndex
CREATE INDEX "Project_agentId_idx" ON "Project"("agentId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
