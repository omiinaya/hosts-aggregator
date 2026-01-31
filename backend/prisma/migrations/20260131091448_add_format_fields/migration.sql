-- AlterTable
ALTER TABLE "source_contents" ADD COLUMN "format" TEXT;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN "format" TEXT DEFAULT 'auto';
