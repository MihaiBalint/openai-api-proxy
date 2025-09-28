import { serve } from '@hono/node-server'
import app, { createEnvContext } from './index.js'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Server is running on port ${port}`)

serve({
  fetch: (request: Request) => {
    // Use the createEnvContext function to provide environment variables
    const envContext = createEnvContext()
    return app.fetch(request, envContext.env)
  },
  port
})
