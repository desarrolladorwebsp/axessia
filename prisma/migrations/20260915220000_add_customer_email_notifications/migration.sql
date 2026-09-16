-- CreateTable
CREATE TABLE `CustomerEmailNotification` (
    `id` VARCHAR(191) NOT NULL,
    `occurrenceKey` VARCHAR(191) NOT NULL,
    `type` ENUM('QUOTE_PENDING_REMINDER', 'QUOTE_EXPIRING_SOON', 'REQUEST_COMPLETED') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `customerId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerEmailNotification_occurrenceKey_key`(`occurrenceKey`),
    INDEX `CustomerEmailNotification_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `CustomerEmailNotification_quoteId_type_status_idx`(`quoteId`, `type`, `status`),
    INDEX `CustomerEmailNotification_requestId_type_status_idx`(`requestId`, `type`, `status`),
    INDEX `CustomerEmailNotification_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerEmailNotification` ADD CONSTRAINT `CustomerEmailNotification_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerEmailNotification` ADD CONSTRAINT `CustomerEmailNotification_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerEmailNotification` ADD CONSTRAINT `CustomerEmailNotification_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `QuoteRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
