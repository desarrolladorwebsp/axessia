CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `productType` ENUM('MEDICATION', 'MEDICAL_DEVICE') NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `activeIngredient` VARCHAR(191) NULL,
    `concentration` VARCHAR(191) NULL,
    `pharmaceuticalForm` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `presentation` VARCHAR(191) NULL,
    `unitsPerPackage` INTEGER NULL,
    `manufacturer` VARCHAR(191) NULL,
    `originCountry` VARCHAR(191) NULL,
    `supplierCountry` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `sanitaryRegistry` VARCHAR(191) NULL,
    `condition` ENUM('AVAILABLE', 'SPECIAL_IMPORT') NULL,
    `cost` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `Product_productType_productName_idx`(`productType`, `productName`),
    INDEX `Product_supplierId_idx`(`supplierId`),
    INDEX `Product_isActive_createdAt_idx`(`isActive`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `QuoteItem` ADD COLUMN `productId` VARCHAR(191) NULL, ADD COLUMN `unitCost` DECIMAL(12, 2) NULL;
CREATE INDEX `QuoteItem_productId_idx` ON `QuoteItem`(`productId`);
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
