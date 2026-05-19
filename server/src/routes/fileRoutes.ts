import { Router } from "express"
import { saveFiles, getFileByName } from '../repositories/files.ts'
import { verifyToken } from '../middleware/authMiddleware.ts'

import multer from 'multer'

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, Date.now() + '_' + file.originalname)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
})

const router = Router()

router.post('/files/upload', verifyToken, upload.single('file'), async (req, res) => {
    const messageId = Number(req.body.messageId)
    const file = req.file  
    if (!file) {
        res.status(400).json({ error: 'No file' })
        return
    }
    const fileId = await saveFiles(messageId, file.originalname, file.path, file.size, file.mimetype)
    res.status(201).json({ id: fileId })
})

router.get('/files/download', verifyToken, async (req, res) => {
    const fileName = req.query.name as string
    if (!fileName) {
        res.status(400).json({ error: 'Назва файлу відсутня' })
        return
    }

    try {
        const file = await getFileByName(fileName)
        if (!file) {
            res.status(404).json({ error: 'Файл не знайдено' })
            return
        }
        res.download(file.filePath, file.fileName)
    } catch (err) {
        console.error('Download error:', err)
        res.status(500).json({ error: 'Помилка при завантаженні файлу' })
    }
})

router.get('/files/:id', verifyToken, async (req, res) => {
    const id = Number(req.params.id)
    const file = await getFileByName(String(id))
    if (!file) {
        res.status(404).json({ error: 'Файл не знайдено' })
        return
    }
    res.download(file.filePath, file.fileName)
})

export default router