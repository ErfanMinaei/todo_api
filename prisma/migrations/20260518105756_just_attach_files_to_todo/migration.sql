/*
  Warnings:

  - You are about to drop the column `todo_list_id` on the `FileObject` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `FileObject` DROP FOREIGN KEY `FileObject_todo_list_id_fkey`;

-- DropIndex
DROP INDEX `FileObject_todo_list_id_idx` ON `FileObject`;

-- AlterTable
ALTER TABLE `FileObject` DROP COLUMN `todo_list_id`;
