import { serve } from '@hono/node-server'
import app from './index.js'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
