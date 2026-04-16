import { getPool } from '../db.ts'

export async function createNotification(userId: number, type: string, payload: string) {
    let pool = getPool()

    const result = await pool.request().query(`
        INSERT INTO Notifications (UserId, Type, Payload)
        VALUES ('${userId}', '${type}', '${payload}')
        SELECT SCOPE_IDENTITY() AS Id
        `)

    return result.recordset[0].Id
}

export async function getNotificationByUserId(userId: number) {
    let pool = getPool()

    const result = await pool.request().query(`
        SELECT Notification.* FROM Notifications
        WHERE UserId = '${userId}' AND IsRead = 0
        `)
    const notifications = result.recordset
    return notifications
}

export async function markAllRead(userId: number) {
    let pool = getPool()

    const result = await pool.request().query(`
        UPDATE Notifications
        SET IsRead = 1
        WHERE UserId = '${userId}'
        `)
    return { success: true }
}