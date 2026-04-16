import { getPool } from '../db.ts'

export async function createInvites(meetingId: number, userIds: number[]) {
    let pool = getPool()

    for (const userId of userIds) {
         await pool.request().query(`
            INSERT INTO MeetingInvites (MeetingId, UserId) 
            VALUES ('${meetingId}', '${userId}')
            SELECT SCOPE_IDENTITY() AS Id
        `)
    }
}

export async function updateInviteStatus(inviteId: number, status: string) {
    let pool = getPool()

    const result = await pool.request().query(`
        UPDATE MeetingInvites
        SET Status = '${status}'
        WHERE Id = '${inviteId}'
        `)

    return { success: true }
}

export async function getInvitesByMeetingId(meetingId: number) {
    let pool = getPool()

    const result = await pool.request().query(`
        SELECT MeetingInvites.* FROM MeetingInvites
        WHERE MeetingId = '${meetingId}'
        `)

    return result.recordset
}