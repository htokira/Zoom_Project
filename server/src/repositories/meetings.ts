import prisma from '../db.ts'

export async function createMeeting(title: string, scheduledAt: string, createdBy: number) {
    const roomCode = Math.random().toString(36).substring(2, 8);
    
    const meeting = await prisma.meeting.create({
        data: {
            title,
            scheduledAt,
            createdBy,
            roomCode
        }
    });

    return meeting;
}

export async function getMeetingByUserId(userId: number) {
    return await prisma.meeting.findMany({
        where: {
            OR: [
                { createdBy: userId },
                {
                    invites: {
                        some: { userId }
                    }
                }
            ]
        },
        orderBy: { scheduledAt: 'asc' }
    });
}

export async function getMeetingById (id: number) {
    return await prisma.meeting.findUnique({
        where: { id }
    });
}