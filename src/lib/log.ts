import pino from 'pino'

// Minimal, transport-free (no worker threads)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
})
