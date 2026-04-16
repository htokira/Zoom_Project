import sql from 'mssql'

const config: sql.config = {
  server: 'DESKTOP-PII8VFF',
  database: 'Zoom',
  user: 'zoom_user',
  password: 'Password123!',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
}

let pool: sql.ConnectionPool | null = null

export async function connectDB() {
  try {
    pool = await sql.connect(config) 
    console.log('Connected to DB')
  } catch (error) {
    console.error('DB connection failed:', error)
  }
}

export function getPool() {
    if (!pool) throw new Error('DB not connected')
    return pool
}