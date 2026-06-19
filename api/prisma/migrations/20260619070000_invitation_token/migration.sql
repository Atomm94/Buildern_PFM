-- AlterTable
ALTER TABLE `Invitation`
    ADD COLUMN `tokenHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Invitation_tokenHash_key` ON `Invitation`(`tokenHash`);
