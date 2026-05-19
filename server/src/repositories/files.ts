import prisma from '../db.ts'

export async function saveFiles(messageId: number, fileName: string, filePath: string, fileSize: number, fileType: string) {
    const file = await prisma.file.create({
        data: {
            messageId,
            fileName,
            filePath,
            fileSize,
            fileType
        }
    });
    
    return file.id;
}

export async function getFileById(id: number) {
    return await prisma.file.findUnique({
        where: { id }
    });
}

export async function getFileByName(fileName: string) {
    return await prisma.file.findFirst({
        where: { fileName },
        orderBy: { id: 'desc' } 
    });
}