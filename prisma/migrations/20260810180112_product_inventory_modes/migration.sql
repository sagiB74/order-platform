-- CreateEnum
CREATE TYPE "InventoryMode" AS ENUM ('UNLIMITED', 'OUT_OF_STOCK', 'LIMITED');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "isAvailable",
ADD COLUMN     "inventoryMode" "InventoryMode" NOT NULL DEFAULT 'UNLIMITED',
ADD COLUMN     "limitExpiresAt" TIMESTAMP(3),
ADD COLUMN     "limitMaxQuantity" INTEGER,
ADD COLUMN     "limitSoldCount" INTEGER NOT NULL DEFAULT 0;

