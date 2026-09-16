-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Supplier_name_idx`(`name`),
    INDEX `Supplier_identifier_idx`(`identifier`),
    INDEX `Supplier_contactName_idx`(`contactName`),
    INDEX `Supplier_email_idx`(`email`),
    INDEX `Supplier_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
