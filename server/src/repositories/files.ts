import { getPool } from '../db.ts'

export async function saveFiles(messageId: number, fileName: string, filePath: string, fileSize: number, fileType: string) {
    let pool = getPool()

    const result = await pool.request().query(`
        INSERT INTO Files(MessageId, FileName, FilePath, FileSize, FileType)
        VALUES ('${messageId}', '${fileName}', '${filePath}', '${fileSize}', '${fileType}')
        SELECT SCOPE_IDENTITY() AS Id
        `)
    return result.recordset[0].Id
}

export async function getFileById(id: number) {
    let pool = getPool()

    const result = await pool.request().query(`
        SELECT Files.* FROM Files
        WHERE Id = ${id}
        `)

    return result.recordset[0]
}