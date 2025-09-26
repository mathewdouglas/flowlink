-- AlterTable
ALTER TABLE "field_mappings" ADD COLUMN "source_transform" TEXT;
ALTER TABLE "field_mappings" ADD COLUMN "target_transform" TEXT;
ALTER TABLE "field_mappings" ADD COLUMN "transformation_type" TEXT;
