-- CreateTable
CREATE TABLE "template_set" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_set_userId_idx" ON "template_set"("userId");

-- AddForeignKey
ALTER TABLE "template_set" ADD CONSTRAINT "template_set_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
