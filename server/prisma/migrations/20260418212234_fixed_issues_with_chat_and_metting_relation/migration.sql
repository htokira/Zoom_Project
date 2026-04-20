/*
  Warnings:

  - A unique constraint covering the columns `[chatId]` on the table `Meetings` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Meetings] ADD CONSTRAINT [Meetings_chatId_key] UNIQUE NONCLUSTERED ([chatId]);

-- AddForeignKey
ALTER TABLE [dbo].[Meetings] ADD CONSTRAINT [Meetings_chatId_fkey] FOREIGN KEY ([chatId]) REFERENCES [dbo].[Chats]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
