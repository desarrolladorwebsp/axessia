CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `authorType` VARCHAR(191) NOT NULL,
    `message` VARCHAR(2000) NOT NULL,
    `imageStorageKey` VARCHAR(191) NULL,
    `imageFileName` VARCHAR(191) NULL,
    `imageMimeType` VARCHAR(191) NULL,
    `imageFileSize` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `ChatMessage_requestId_createdAt_idx`(`requestId`, `createdAt`),
    CONSTRAINT `ChatMessage_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `QuoteRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
