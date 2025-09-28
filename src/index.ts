import { Hono } from 'hono'
import { serializeError } from 'serialize-error'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { openAiRouter } from './api/openai'
import { ollamaRouter } from './api/ollama'

export interface Bindings {
  API_KEY: string
  OPENAI_API_KEY: string
}

// Create a context that uses environment variables for Node.js
const createEnvContext = () => ({
  env: {
    API_KEY: process.env.API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    // Add all other environment variables that might be used
    ANTROPIC_API_KEY: process.env.ANTROPIC_API_KEY,
    VERTEX_ANTROPIC_GOOGLE_SA_CLIENT_EMAIL:
      process.env.VERTEX_ANTROPIC_GOOGLE_SA_CLIENT_EMAIL,
    VERTEX_ANTROPIC_GOOGLE_SA_PRIVATE_KEY:
      process.env.VERTEX_ANTROPIC_GOOGLE_SA_PRIVATE_KEY,
    VERTEX_ANTROPIC_REGION: process.env.VERTEX_ANTROPIC_REGION,
    VERTEX_ANTROPIC_PROJECTID: process.env.VERTEX_ANTROPIC_PROJECTID,
    GOOGLE_GEN_AI_API_KEY: process.env.GOOGLE_GEN_AI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CEREBRAS_MODELS: process.env.CEREBRAS_MODELS,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_API_VERSION: process.env.AZURE_API_VERSION,
    AZURE_DEPLOYMENT_MODELS: process.env.AZURE_DEPLOYMENT_MODELS,
    COHERE_API_KEY: process.env.COHERE_API_KEY,
    ALIYUN_BAILIAN_API_KEY: process.env.ALIYUN_BAILIAN_API_KEY,
    ALIYUN_BAILIAN_MODELS: process.env.ALIYUN_BAILIAN_MODELS,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODELS: process.env.OLLAMA_MODELS,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODELS: process.env.OPENROUTER_MODELS,
    GROK_API_KEY: process.env.GROK_API_KEY,
    MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY,
    LINGYIWANWU_API_KEY: process.env.LINGYIWANWU_API_KEY
  }
})

const app = new Hono<{
  Bindings: Bindings
}>()
  /*
  curl https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
       "model": "gpt-4o-mini",
       "messages": [{"role": "user", "content": "Say this is a test!"}],
       "temperature": 0.7
     }'
  */
  .use(
    cors({
      origin: (_origin, c) => {
        // In Node.js environment, use process.env directly
        return process.env.CORS_ORIGIN || c.env?.CORS_ORIGIN
      }
    })
  )
  .use(async (c, next) => {
    await next()
    if (c.error) {
      throw new HTTPException((c.error as any)?.status ?? 500, {
        message: serializeError(c.error).message
      })
    }
  })

// 生成 openai chat 的代理，https://api.openai.com/v1/chat/completions
app.route('v1', openAiRouter())

// 生成 ollama chat 的代理
app.route('/ollama', ollamaRouter())

export default app
