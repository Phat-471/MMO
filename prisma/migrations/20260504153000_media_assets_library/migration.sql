CREATE TABLE `MediaAsset` (
    `id` VARCHAR(36) NOT NULL,
    `workspaceId` VARCHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `assetType` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'TEMPLATE') NOT NULL,
    `sourceUrl` LONGTEXT NOT NULL,
    `thumbnailUrl` LONGTEXT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT true,
    `tagsJson` LONGTEXT NOT NULL,
    `metadataJson` LONGTEXT NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `MediaAsset_workspaceId_approved_idx`(`workspaceId`, `approved`),
    INDEX `MediaAsset_workspaceId_assetType_idx`(`workspaceId`, `assetType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
