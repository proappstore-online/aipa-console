import { initPro, ProShell, useAuth } from '@proappstore/sdk'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchContext,
  fetchMessages,
  fetchConversations,
  fetchTopics,
  fetchLogs,
  type AppContext,
  type ChannelMessage,
  type ConversationEntry,
  type Topic,
} from './aipa'

const app = initPro({ appId: 'aipa-console' })

const TABS = ['Overview', 'Messages', 'Conversations', 'Topics', 'Logs'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  return (
    <ProShell app={app} appName="AIPA Console" allowFree>
      <OwnerGate />
    </ProShell>
  )
}

// ── Owner gate ────────────────────────────────────────────────────────────────
// The console surfaces the owner's private Slack/agent data, so only the app
// owner (auto-assigned to the creator) may view it. Any other signed-in PAS
// user is denied.
function OwnerGate() {
  const { user } = useAuth(app)
  const [state, setState] = useState<'checking' | 'owner' | 'denied'>('checking')

  useEffect(() => {
    let alive = true
    app.roles
      .check('owner')
      .then((ok) => alive && setState(ok ? 'owner' : 'denied'))
      .catch(() => alive && setState('denied'))
    return () => {
      alive = false
    }
  }, [user?.id])

  if (state === 'checking') return <Centered>Checking access…</Centered>
  if (state === 'denied')
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--ink)]">Not authorized</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This console is private to its owner.
          </p>
        </div>
      </Centered>
    )
  return <Dashboard />
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [tab, setTab] = useState<Tab>('Overview')
  const [context, setContext] = useState<AppContext | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[] | null>(null)
  const [conversations, setConversations] = useState<ConversationEntry[] | null>(null)
  const [topics, setTopics] = useState<Topic[] | null>(null)
  const [logs, setLogs] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ctx, msgs, convs, tops, lg] = await Promise.all([
        fetchContext(app).catch(() => null),
        fetchMessages(app).catch(() => null),
        fetchConversations(app).catch(() => null),
        fetchTopics(app).catch(() => null),
        fetchLogs(app).catch(() => null),
      ])
      setContext(ctx)
      setMessages(msgs)
      setConversations(convs)
      setTopics(tops)
      setLogs(lg)
      if (!ctx && !msgs && !convs && !tops && !lg)
        setError('Could not reach the AIPA worker. Check the proxy allowlist and read key.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="display-font text-xl font-bold text-[var(--ink)]">AIPA Console</h1>
        {context?.buildTag && <Badge>{context.buildTag}</Badge>}
        <span className="text-xs text-[var(--muted)]">
          {context?.exportedAt
            ? `Synced ${new Date(context.exportedAt).toLocaleString()}`
            : 'Not synced'}
        </span>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--warning)]">
          {error}
        </div>
      )}

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-3 py-2 text-sm font-medium transition-colors ' +
              (tab === t
                ? 'border-b-2 border-[var(--accent)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]')
            }
          >
            {t}
          </button>
        ))}
      </nav>

      {loading && !context ? (
        <Centered>Loading AIPA data…</Centered>
      ) : (
        <>
          {tab === 'Overview' && <Overview ctx={context} />}
          {tab === 'Messages' && <MessagesView messages={messages} />}
          {tab === 'Conversations' && <ConversationsView entries={conversations} />}
          {tab === 'Topics' && <TopicsView topics={topics} />}
          {tab === 'Logs' && <LogsView logs={logs} />}
        </>
      )}

      <footer className="mt-10 text-center">
        <a
          href="https://proappstore.online"
          className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Built for proappstore.online
        </a>
      </footer>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function Overview({ ctx }: { ctx: AppContext | null }) {
  if (!ctx) return <Empty>No context synced yet.</Empty>
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Agents" value={ctx.agents?.length ?? 0} />
        <Stat label="Connections" value={ctx.connections?.length ?? 0} />
        <Stat label="Messages" value={ctx.totalMessages ?? 0} />
      </div>

      <Section title="Connections">
        {ctx.connections?.length ? (
          <div className="space-y-2">
            {ctx.connections.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">{c.name}</span>
                  <Badge>{c.platform}</Badge>
                  {c.isPersonal && <Badge>personal</Badge>}
                  <span className="ml-auto text-xs text-[var(--muted)]">
                    {c.enabled ? 'enabled' : 'disabled'} · {c.hasToken ? 'token ✓' : 'no token'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No connections.</Empty>
        )}
      </Section>

      <Section title="Agents">
        {ctx.agents?.length ? (
          <div className="space-y-2">
            {ctx.agents.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">{a.name}</span>
                  {a.platform && <Badge>{a.platform}</Badge>}
                  {a.readOnly && <Badge>read-only</Badge>}
                  <span className="ml-auto text-xs text-[var(--muted)]">
                    {a.channels?.length ?? 0} channels · {a.memory?.length ?? 0} memories
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No agents.</Empty>
        )}
      </Section>
    </div>
  )
}

function MessagesView({ messages }: { messages: ChannelMessage[] | null }) {
  const [channel, setChannel] = useState<string>('')
  if (!messages?.length) return <Empty>No messages synced.</Empty>
  const channels = Array.from(new Set(messages.map((m) => m.channelName))).sort()
  const shown = [...messages]
    .filter((m) => !channel || m.channelName === channel)
    .sort((a, b) => b.timestamp - a.timestamp)
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        <FilterChip active={!channel} onClick={() => setChannel('')} label="All" />
        {channels.map((c) => (
          <FilterChip key={c} active={channel === c} onClick={() => setChannel(c)} label={c} />
        ))}
      </div>
      <div className="space-y-2">
        {shown.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-[var(--ink)]">{m.author}</span>
              <span className="text-xs text-[var(--muted)]">#{m.channelName}</span>
              {m.isBot && <Badge>bot</Badge>}
              <span className="ml-auto text-xs text-[var(--muted)]">{fmt(m.timestamp)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{m.text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ConversationsView({ entries }: { entries: ConversationEntry[] | null }) {
  if (!entries?.length) return <Empty>No voice conversations synced.</Empty>
  const shown = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  return (
    <div className="space-y-2">
      {shown.map((e, i) => (
        <Card key={i}>
          <div className="flex flex-wrap items-baseline gap-2">
            <Badge>{e.role}</Badge>
            <span className="text-xs text-[var(--muted)]">{e.agentName}</span>
            <span className="ml-auto text-xs text-[var(--muted)]">{fmt(e.timestamp)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{e.text}</p>
        </Card>
      ))}
    </div>
  )
}

function TopicsView({ topics }: { topics: Topic[] | null }) {
  if (!topics?.length) return <Empty>No topics synced.</Empty>
  const shown = [...topics].sort((a, b) => b.lastUpdated - a.lastUpdated)
  return (
    <div className="space-y-2">
      {shown.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--ink)]">{t.title}</span>
            <Badge>{t.status}</Badge>
            <span className="ml-auto text-xs text-[var(--muted)]">{fmt(t.lastUpdated)}</span>
          </div>
          {t.summary && <p className="mt-1 text-sm text-[var(--muted)]">{t.summary}</p>}
        </Card>
      ))}
    </div>
  )
}

function LogsView({ logs }: { logs: string | null }) {
  if (!logs) return <Empty>No logs synced.</Empty>
  return (
    <pre className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--ink)]">
      {logs}
    </pre>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
      {children}
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-2xl font-bold text-[var(--ink)]">{value}</div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </Card>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
      {children}
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        'rounded-full px-3 py-1 text-xs font-medium ' +
        (active
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]')
      }
    >
      {label}
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-[var(--muted)]">{children}</div>
}

// AIPA stores timestamps in unix seconds; tolerate ms too.
function fmt(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts
  return new Date(ms).toLocaleString()
}
