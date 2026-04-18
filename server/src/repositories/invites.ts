import prisma from '../db.ts'

export async function createInvites(meetingId: number, userIds: number[]) {
    await prisma.meetingInvite.createMany({
        data: userIds.map(userId => ({
            meetingId,
            userId
        }))
    });
}

export async function updateInviteStatus(inviteId: number, status: string) {
    await prisma.meetingInvite.update({
        where: { id: inviteId },
        data: { status }
    });

    return { success: true };
}

export async function getInvitesByMeetingId(meetingId: number) {
    return await prisma.meetingInvite.findMany({
        where: { meetingId }
    });
}