import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import { authRoutes } from './routes/auth'
import { supplierRoutes } from './routes/suppliers'
import { categoryRoutes } from './routes/categories'
import { rfqRoutes } from './routes/rfqs'
import { quotationRoutes } from './routes/quotations'
import { chatRoutes } from './routes/chat'
import { evaluationRoutes } from './routes/evaluations'
import { notificationRoutes } from './routes/notifications'
import { auditRoutes } from './routes/audit'
import { reportRoutes } from './routes/reports'
import { adminRoutes } from './routes/admin'
import { errorHandler } from './middleware/errorHandler'
import { setupChatSocket } from './services/chatSocket'
import { startCronJobs } from './services/cronJobs'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const allowedOrigins = (process.env.WEB_URL || 'http://localhost:3001,http://localhost:3002')
  .split(',')
  .map(o => o.trim())

const corsOptions = {
  origin: (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile, curl, etc) or from serveo / localhost
    if (!origin || origin.includes('serveousercontent.com') || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(null, true) // open in dev — tighten in production
    }
  },
  credentials: true,
}

// Socket.io
export const io = new SocketServer(httpServer, {
  cors: corsOptions,
})

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })
app.use('/api', limiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/rfqs', rfqRoutes)
app.use('/api/rfqs', quotationRoutes)
app.use('/api/rfqs', chatRoutes)
app.use('/api/rfqs', evaluationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }))

// Error handler (must be last)
app.use(errorHandler)

// Socket.io chat setup
setupChatSocket(io)

// Cron jobs
startCronJobs()

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 NRDPP API running on http://localhost:${PORT}`)
})
