-- AlterTable
ALTER TABLE `Supplier`
    ADD COLUMN `manufacturer` VARCHAR(191) NULL,
    ADD COLUMN `originCountry` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `QuoteItem`
    ADD COLUMN `supplierId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `QuoteItem_supplierId_idx` ON `QuoteItem`(`supplierId`);

-- AddForeignKey
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
