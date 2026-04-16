import { getPool } from '../db.ts'

export async function createChat(name: string, memberIds: number[], type: 'group' | 'private' = 'group') {
    let pool = getPool()

    const result = await pool.request().query(`
        INSERT INTO Chats (Name, Type) VALUES ('${name}', '${type}')
        SELECT SCOPE_IDENTITY() AS Id
    `)
    const chatId = result.recordset[0].Id

   for (const userId of memberIds) {
        await pool.request().query(`
            INSERT INTO ChatMembers (ChatId, UserId) VALUES ('${chatId}', '${userId}')
            SELECT SCOPE_IDENTITY() AS Id
        `)
    }
    return chatId
}

export async function saveMessage(chatId: number, senderId: number, text: string) {
    let pool = getPool()

    const result = await pool.request().query(`
        INSERT INTO Messages (ChatId, SenderId, Text) VALUES ('${chatId}', '${senderId}', '${text}')
        SELECT SCOPE_IDENTITY() AS Id
    `)
   return result.recordset[0].Id
}


export async function getChatByUserId(userId: number) {
    let pool = getPool()

    const result = await pool.request().query(`
        SELECT Chats.* FROM Chats
        JOIN ChatMembers ON Chats.Id = ChatMembers.ChatId
        WHERE ChatMembers.UserId = ${userId}
        `)
    const chats = result.recordset
    return chats
}

export async function getMessages(chatId: number, skip: number, take: number) {
    let pool = getPool()
    const message = await pool.request().query(`
        SELECT * FROM Messages
        WHERE ChatId = ${chatId}
        ORDER BY SentAt DESC
        OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `)
    return message.recordset
}

export async function createPrivateChat(userId1: number, userId2: number) {
    let pool = getPool()
    const result = await pool.request().query(`
        SELECT Chats.* FROM Chats
        JOIN ChatMembers cm1 ON Chats.Id = cm1.ChatId AND cm1.UserId = ${userId1}
        JOIN ChatMembers cm2 ON Chats.Id = cm2.ChatId AND cm2.UserId = ${userId2}
        WHERE Chats.Type = 'private'
    `)
    if (result.recordset.length > 0) {
        return result.recordset[0]
    }
    else {
        return await createChat('', [userId1, userId2], 'private')
    }
}

export async function getChatMembers(chatId: number) {
    let pool = getPool()

    const members = await pool.request().query(`
        SELECT ChatMembers.* FROM ChatMembers
        WHERE ChatId = '${chatId}'
        `)

    return members.recordset
}
