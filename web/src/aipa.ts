// Data layer: reads the AIPA control-plane worker through the PAS proxy.
//
// app.proxy.fetch injects the read-only bearer (CONSOLE_READ_KEY) server-side —
// the key never reaches the browser. The AIPA worker exposes GET /api/data with
// ?section=context|messages|conversations|topics|logs (KV snapshot the control
// plane holds). Host is allowlisted via `pas proxy allow`.

import type { ProAppStore } from '@proappstore/sdk'

const AIPA_HOST = 'aipa-mcp.serge-the-dev.workers.dev'

export interface MemoryEntry {
  text: string
  type?: string
  source?: string
  tags?: string[]
  referenceCount?: number
}

export interface Channel {
  id: string
  name: string
  isDM: boolean
  messageCount?: number
}

export interface Agent {
  id: string
  name: string
  connectionName?: string
  platform?: string
  readOnly: boolean
  channels?: Channel[]
  memory?: MemoryEntry[]
}

export interface Connection {
  id: string
  name: string
  platform: string
  enabled: boolean
  hasToken: boolean
  isPersonal?: boolean
}

export interface VoiceSettings {
  model?: string
  voice?: string
  language?: string
  autoBrief?: boolean
  globalReadOnly?: boolean
}

export interface LLMProvider {
  provider: string
  enabled: boolean
  authMethod?: string
}

export interface AppContext {
  exportedAt?: string
  buildTag?: string
  totalMessages?: number
  agents?: Agent[]
  connections?: Connection[]
  voiceSettings?: VoiceSettings
  llmProviders?: LLMProvider[]
  syncCursors?: Record<string, string>
  error?: string
}

export interface ChannelMessage {
  id: string
  channelId: string
  channelName: string
  author: string
  text: string
  timestamp: number
  platform: string
  isBot: boolean
  isDM: boolean
}

export interface ConversationEntry {
  agentId: string
  agentName: string
  role: string
  text: string
  timestamp: number
}

export interface Topic {
  id: string
  title: string
  summary: string
  status: string
  participants?: string[]
  lastUpdated: number
}

/** Fetch one KV section from the AIPA worker via the secret-injecting proxy. */
async function section<T>(app: ProAppStore, name: string): Promise<T | null> {
  const res = await app.proxy.fetch(`${AIPA_HOST}/api/data?section=${name}`)
  if (!res.ok) throw new Error(`AIPA ${name}: HTTP ${res.status}`)
  return (await res.json()) as T | null
}

export const fetchContext = (app: ProAppStore) => section<AppContext>(app, 'context')
export const fetchMessages = (app: ProAppStore) => section<ChannelMessage[]>(app, 'messages')
export const fetchConversations = (app: ProAppStore) => section<ConversationEntry[]>(app, 'conversations')
export const fetchTopics = (app: ProAppStore) => section<Topic[]>(app, 'topics')
export const fetchLogs = (app: ProAppStore) => section<string>(app, 'logs')
