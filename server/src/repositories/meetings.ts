import { getPool } from '../db.ts'

export async function createMeeting(title: string, scheduledAt: Date, createdBy: number) {
    const roomCode = Math.random().toString(36).substring(2, 8)
    let pool = getPool()
    const result = await pool.request().query(`
        INSERT INTO Meetings (Title, ScheduledAt, CreatedBy, RoomCode)
        VALUES ('${title}', '${scheduledAt}', '${createdBy}', '${roomCode}')
        SELECT SCOPE_IDENTITY() AS Id
        `)

    const meetingId = result.recordset[0].Id
    return meetingId
}

export async function getMeetingByUserId(userId: number) {
    let pool = getPool()
    const result = await pool.request().query(`
        SELECT Meetings.* FROM Meetings
        JOIN MeetingInvites ON Meetings.Id = MeetingInvites.MeetingId
        WHERE MeetingInvites.UserId = '${userId}'
        `)

    const meeting = result.recordset
    return meeting 
}

export async function getMeetingById (id: number) {
    let pool = getPool()
    const result = await pool.request().query(`
        SELECT * FROM Meetings
        WHERE Id = ${id}
    `)
    return result.recordset[0]
}