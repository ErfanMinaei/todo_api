/*
  Warnings:

  - You are about to drop the `TodoLists` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Todos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TodoLists` DROP FOREIGN KEY `TodoLists_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Todos` DROP FOREIGN KEY `Todos_todoListId_fkey`;

-- DropTable
DROP TABLE `TodoLists`;

-- DropTable
DROP TABLE `Todos`;

-- CreateTable
CREATE TABLE `UserTodoList` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Todo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `is_done` BOOLEAN NOT NULL DEFAULT false,
    `deadline` DATETIME(3) NOT NULL,
    `todoListId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserTodoList` ADD CONSTRAINT `UserTodoList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Todo` ADD CONSTRAINT `Todo_todoListId_fkey` FOREIGN KEY (`todoListId`) REFERENCES `UserTodoList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
