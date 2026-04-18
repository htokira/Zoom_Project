/*
  Warnings:

  - A unique constraint covering the columns `[roomCode]` on the table `Meetings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Meetings] ADD CONSTRAINT [Meetings_roomCode_key] UNIQUE NONCLUSTERED ([roomCode]);

-- CreateIndex
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
