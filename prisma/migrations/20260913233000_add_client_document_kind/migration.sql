-- AlterTable
ALTER TABLE `ClientDocument`
  ADD COLUMN `documentKind` ENUM('MANDATE', 'ID_FRONT', 'ID_BACK', 'OTHER') NULL,
  ADD COLUMN `customLabel` VARCHAR(191) NULL;
