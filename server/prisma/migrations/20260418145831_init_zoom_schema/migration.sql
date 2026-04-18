BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] NVARCHAR(50) NOT NULL,
    [email] NVARCHAR(100),
    [password] NVARCHAR(255) NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Chats] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(200),
    [type] NVARCHAR(20) NOT NULL,
    [createdAt] DATETIME2 CONSTRAINT [Chats_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Chats_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ChatMembers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [chatId] INT NOT NULL,
    [userId] INT NOT NULL,
    [joinedAt] DATETIME2 CONSTRAINT [ChatMembers_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ChatMembers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Messages] (
    [id] INT NOT NULL IDENTITY(1,1),
    [chatId] INT NOT NULL,
    [senderId] INT NOT NULL,
    [text] NVARCHAR(max),
    [sentAt] DATETIME2 CONSTRAINT [Messages_sentAt_df] DEFAULT CURRENT_TIMESTAMP,
    [isDeleted] BIT CONSTRAINT [Messages_isDeleted_df] DEFAULT 0,
    CONSTRAINT [Messages_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Files] (
    [id] INT NOT NULL IDENTITY(1,1),
    [messageId] INT,
    [fileName] NVARCHAR(200) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [fileType] NVARCHAR(100) NOT NULL,
    CONSTRAINT [Files_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Meetings] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(200) NOT NULL,
    [scheduledAt] DATETIME2 NOT NULL,
    [createdBy] INT,
    [roomCode] NVARCHAR(20) NOT NULL,
    [reminderSent] BIT CONSTRAINT [Meetings_reminderSent_df] DEFAULT 0,
    CONSTRAINT [Meetings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MeetingInvites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [meetingId] INT,
    [userId] INT,
    [status] NVARCHAR(20),
    CONSTRAINT [MeetingInvites_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notifications] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT,
    [type] NVARCHAR(50) NOT NULL,
    [payload] NVARCHAR(500),
    [isRead] BIT CONSTRAINT [Notifications_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 CONSTRAINT [Notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ChatMembers] ADD CONSTRAINT [ChatMembers_chatId_fkey] FOREIGN KEY ([chatId]) REFERENCES [dbo].[Chats]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChatMembers] ADD CONSTRAINT [ChatMembers_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Messages] ADD CONSTRAINT [Messages_chatId_fkey] FOREIGN KEY ([chatId]) REFERENCES [dbo].[Chats]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Messages] ADD CONSTRAINT [Messages_senderId_fkey] FOREIGN KEY ([senderId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Files] ADD CONSTRAINT [Files_messageId_fkey] FOREIGN KEY ([messageId]) REFERENCES [dbo].[Messages]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Meetings] ADD CONSTRAINT [Meetings_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingInvites] ADD CONSTRAINT [MeetingInvites_meetingId_fkey] FOREIGN KEY ([meetingId]) REFERENCES [dbo].[Meetings]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingInvites] ADD CONSTRAINT [MeetingInvites_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [Notifications_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
