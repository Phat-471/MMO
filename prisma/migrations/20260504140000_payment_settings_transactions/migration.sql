CREATE TABLE `PaymentSetting` (
    `id` VARCHAR(36) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `bankCode` VARCHAR(32) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(64) NOT NULL,
    `transferPrefix` VARCHAR(64) NOT NULL,
    `note` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentTransaction` (
    `id` VARCHAR(36) NOT NULL,
    `workspaceId` VARCHAR(36) NOT NULL,
    `planCode` ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE') NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `checkoutCode` VARCHAR(80) NOT NULL,
    `transferContent` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `bankCode` VARCHAR(32) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(64) NOT NULL,
    `qrUrl` LONGTEXT NULL,
    `metadataJson` LONGTEXT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PaymentTransaction_checkoutCode_key`(`checkoutCode`),
    INDEX `PaymentTransaction_workspaceId_status_idx`(`workspaceId`, `status`),
    INDEX `PaymentTransaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
