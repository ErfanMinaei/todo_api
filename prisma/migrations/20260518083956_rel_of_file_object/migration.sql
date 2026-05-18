-- AlterTable
ALTER TABLE `FileObject` ADD COLUMN `todo_id` INTEGER NULL,
    ADD COLUMN `todo_list_id` INTEGER NULL,
    MODIFY `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `FileObject_todo_list_id_idx` ON `FileObject`(`todo_list_id`);

-- CreateIndex
CREATE INDEX `FileObject_todo_id_idx` ON `FileObject`(`todo_id`);

-- AddForeignKey
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_todo_list_id_fkey` FOREIGN KEY (`todo_list_id`) REFERENCES `UserTodoList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_todo_id_fkey` FOREIGN KEY (`todo_id`) REFERENCES `Todo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
