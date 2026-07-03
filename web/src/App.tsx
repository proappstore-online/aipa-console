import { initPro, ProShell, useAuth } from '@proappstore/sdk'

const app = initPro({ appId: 'aipa-console' })

export default function App() {
  return (
    <ProShell app={app} appName="aipa-console">
      <Home />
    </ProShell>
  )
}

function Home() {
  const { user } = useAuth()

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="text-center">
        <h1 className="display-font text-3xl font-bold text-[var(--ink)]">aipa-console</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Signed in as <strong>{user?.name}</strong>. Edit{' '}
          <code className="rounded bg-[var(--line)] px-1.5 py-0.5 text-xs">web/src/App.tsx</code> to start building.
        </p>
        <a
          href="https://proappstore.online"
          className="mt-6 inline-block text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Built for ProAppStore
        </a>
      </div>
    </div>
  )
}
