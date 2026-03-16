-- AlterTable
ALTER TABLE "user_config" ADD COLUMN     "sheetLeaveRow" INTEGER,
ADD COLUMN     "sheetWorkDays" TEXT NOT NULL DEFAULT '1,2,3,4,5';
