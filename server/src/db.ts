import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function connectDB() {
  try {
    await prisma.$connect()
    console.log('Connected to DB via Prisma')
  } catch (error) {
    console.error('DB connection failed:', error)
  }
}

export default prisma