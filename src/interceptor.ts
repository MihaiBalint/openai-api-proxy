import OpenAI, { AzureOpenAI } from 'openai'
import { ChatCompletion } from 'openai/resources'
import { ChatCompletionCreateParams } from 'openai/resources/index.mjs'
import { safeJsonParse } from './safeJsonParse.js'

export type OpenAIFunctionCall = {
  id?: string
  name?: string
  arguments: Record<string, any>
}

export type OpenAIText = {
  text: string
}

export type Part = OpenAIText | OpenAIFunctionCall

export type InterceptorArgs = {
  client: OpenAI | AzureOpenAI
  req: ChatCompletionCreateParams
}

export type Interceptors = {
  interceptResponse: ({
    response
  }: {
    response: ChatCompletion
  }) => Promise<ChatCompletion>
  interceptStream: ({
    chunk,
    signal
  }: {
    chunk: OpenAI.Chat.ChatCompletionChunk
    signal?: AbortSignal
  }) => Promise<OpenAI.Chat.ChatCompletionChunk>
}

type OpenAIToolCallAccumulator = {
  id?: string
  index?: number
  type?: string
  name?: string
  arguments: string
}

export function streamingResponseInterceptor({
  client,
  req
}: InterceptorArgs): Interceptors {
  const streamingToolCalls: Map<number, OpenAIToolCallAccumulator> = new Map()

  async function interceptResponse({ response }: { response: ChatCompletion }) {
    return response
  }

  async function isToolCallAllowed(
    calls: OpenAIFunctionCall[]
  ): Promise<boolean> {
    return true
  }

  async function interceptStream({
    chunk,
    signal
  }: {
    chunk: OpenAI.Chat.ChatCompletionChunk
    signal?: AbortSignal
  }) {
    if (signal?.aborted) {
      console.log('Stream aborted')
    }

    const choice = chunk.choices?.[0]
    if (!choice) {
      return chunk
    }

    let chunkDelta = {}

    if (choice.delta?.content !== undefined) {
      chunkDelta = { ...chunkDelta, content: choice.delta.content }
    }
    if (choice.delta?.role !== undefined) {
      chunkDelta = { ...chunkDelta, role: choice.delta.role }
    }

    if (choice.delta?.tool_calls !== undefined) {
      for (const toolCall of choice.delta.tool_calls) {
        const index = toolCall.index ?? 0

        // Get or create the tool call accumulator for this index
        let accumulatedCall = streamingToolCalls.get(index)
        if (!accumulatedCall) {
          accumulatedCall = { arguments: '' }
          streamingToolCalls.set(index, accumulatedCall)
        }

        // Update accumulated data
        if (toolCall.id) {
          accumulatedCall.id = toolCall.id
        }
        if (toolCall.type) {
          accumulatedCall.type = toolCall.type
        }
        if (toolCall.index !== undefined) {
          accumulatedCall.index = toolCall.index
        }
        if (toolCall.function?.name) {
          accumulatedCall.name = toolCall.function.name
        }
        if (toolCall.function?.arguments) {
          accumulatedCall.arguments += toolCall.function.arguments
        }
      }
    }
    if (choice.finish_reason) {
      const toolCalls = []
      const parsedCalls = []
      for (const [, accumulatedCall] of streamingToolCalls) {
        // TODO: Add back id once we have a way to generate tool_call_id from the VLLM parser.
        // if (accumulatedCall.id && accumulatedCall.name) {
        if (accumulatedCall.name) {
          let args: Record<string, unknown> = {}
          if (accumulatedCall.arguments) {
            args = safeJsonParse(accumulatedCall.arguments, {})
          }
          const callRecord = {
            id:
              accumulatedCall.id ||
              `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: accumulatedCall.name,
            arguments: args
          }
          parsedCalls.push(callRecord)
          toolCalls.push({
            id: accumulatedCall.id,
            type: accumulatedCall.type,
            index: accumulatedCall.index,
            function: {
              name: accumulatedCall.name,
              arguments: accumulatedCall.arguments
            }
          })
        }
      }
      const isCallAllowed = await isToolCallAllowed(parsedCalls)
      if (isCallAllowed) {
        chunkDelta = { ...chunkDelta, tool_calls: toolCalls }
      }
      // Clear all accumulated tool calls
      streamingToolCalls.clear()
    }
    let interceptedChunk: OpenAI.Chat.ChatCompletionChunk = {
      id: chunk.id,
      created: chunk.created,
      model: chunk.model,
      object: chunk.object,
      choices: [
        {
          index: choice.index,
          finish_reason: choice.finish_reason,
          logprobs: choice.logprobs,
          delta: chunkDelta
        }
      ]
    }

    return interceptedChunk
  }
  return {
    interceptResponse,
    interceptStream
  }
}
