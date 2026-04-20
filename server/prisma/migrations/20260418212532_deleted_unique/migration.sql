BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Meetings] DROP CONSTRAINT [Meetings_chatId_fkey];

-- DropIndex
ALTER TABLE [dbo].[Meetings] DROP CONSTRAINT [Meetings_chatId_key];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
