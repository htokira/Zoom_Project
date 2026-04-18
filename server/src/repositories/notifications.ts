import prisma from '../db.ts'

export async function createNotification(userId: number, type: string, payload: string) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            payload
        }
    });

    return notification.id;
}

export async function getNotificationByUserId(userId: number) {
    return await prisma.notification.findMany({
        where: {
            userId,
            isRead: false
        }
    });
}

export async function markAllRead(userId: number) {
    await prisma.notification.updateMany({
        where: {
            userId,
            isRead: false
        },
        data: {
            isRead: true
        }
    });
    
    return { success: true };
}