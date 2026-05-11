import { Router } from "express"
import { saveFiles, getFileById } from '../repositories/files.ts'
import { verifyToken } from '../middleware/authMiddleware.ts'

import multer from 'multer'

const storage = multer.diskStorage({
  destination: 'uploads/',  // папка де зберігаються файли
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname)  // унікальна назва файлу
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }  // максимум 20MB
})

const router = Router()
router.use(verifyToken);

router.post('/files/upload', upload.single('file'), async (req, res) => {
    const messageId = Number(req.body.messageId)
    const file = req.file  
    if (!file) {
    res.status(400).json({ error: 'No file' })
    return
}
    const fileId = await saveFiles(messageId, file.originalname, file.path, file.size, file.mimetype)
    res.status(201).json({ id: fileId })
})

router.get('/files/:id', async (req, res) => {
    const id = Number(req.params.id)
    const file = await getFileById(id)
    res.download(file.FilePath, file.FileName)
})

export default router