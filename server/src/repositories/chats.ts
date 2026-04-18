import prisma from '../db.ts'

export async function createChat(name: string, memberIds: number[], type: 'group' | 'private' = 'group') {
    const chat = await prisma.chat.create({
        data: {
            name: name || null,
            type,
            members: {
                create: memberIds.map(userId => ({ userId }))
            }
        }
    });
    
    return chat.id;
}

export async function saveMessage(chatId: number, senderId: number, text: string) {
    const message = await prisma.message.create({
        data: {
            chatId,
            senderId,
            text
        }
    });
    
    return message.id;
}


export async function getChatByUserId(userId: number) {
    return await prisma.chat.findMany({
        where: {
            members: {
                some: { userId }
            }
        }
    });
}

export async function getMessages(chatId: number, skip: number, take: number) {
    return await prisma.message.findMany({
        where: { chatId },
        orderBy: { sentAt: 'desc' },
        skip,
        take
    });
}

export async function createPrivateChat(userId1: number, userId2: number) {
    const existingChat = await prisma.chat.findFirst({
        where: {
            type: 'private',
            AND: [
                { members: { some: { userId: userId1 } } },
                { members: { some: { userId: userId2 } } }
            ]
        }
    });

    if (existingChat) {
        return existingChat;
    } else {
        const newChatId = await createChat('', [userId1, userId2], 'private');
        return await prisma.chat.findUnique({ where: { id: newChatId } }); 
    }
}

export async function getChatMembers(chatId: number) {
    return await prisma.chatMember.findMany({
        where: { chatId }
    });
}
