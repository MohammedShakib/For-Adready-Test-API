import { useState } from 'react'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://artistic-courage-server-test.up.railway.app'
const DEFAULT_API_KEY = import.meta.env.VITE_PROJECT_API_KEY ?? ''
const AUTH_STORAGE_KEY = 'test-api:auth-state'

function readStoredAuth() {
  try {
    const localAuth = localStorage.getItem(AUTH_STORAGE_KEY)
    if (localAuth) return JSON.parse(localAuth)

    const sessionAuth = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (sessionAuth) return JSON.parse(sessionAuth)
  } catch {
    return null
  }

  return null
}

function persistAuth(auth) {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)

    const serialized = JSON.stringify(auth)
    if (auth.rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized)
      return
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, serialized)
  } catch {
    // Keep the gate usable even if storage is unavailable.
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function InputField({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  autoComplete,
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  )
}

function WorkspaceCard({ title, description, badge }) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-5 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.42)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-slate-950">{title}</h2>
        {badge ? (
          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function App() {
  const [authState, setAuthState] = useState(() => readStoredAuth())
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
    rememberMe: true,
  })
  const [signInError, setSignInError] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL)
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY)

  const signedInEmail = typeof authState?.email === 'string' ? authState.email : 'workspace user'

  const setSignInValue = (field, value) => {
    setSignInForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSignIn = (event) => {
    event.preventDefault()
    setSignInError('')

    const email = signInForm.email.trim()
    const password = signInForm.password.trim()

    if (!email || !password) {
      setSignInError('Enter an email and password to continue.')
      return
    }

    const nextAuth = {
      email,
      rememberMe: signInForm.rememberMe,
      signedInAt: new Date().toISOString(),
    }

    persistAuth(nextAuth)
    setAuthState(nextAuth)
  }

  const handleSignOut = () => {
    clearAuth()
    setAuthState(null)
  }

  if (!authState) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(145deg,#020617_0%,#07111f_45%,#0f172a_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl motion-orb motion-orb-a" />
        <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl motion-orb motion-orb-b" />

        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="fade-up motion-panel motion-panel-left flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/8 p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-10">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Part 2 push
                </span>
                <h1 className="mt-5 font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Sign in to the workspace.
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                  This branch now carries the auth gate and the connection panel only. Analyze and
                  generate flows are intentionally held for Part 3.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                <WorkspaceCard
                  title="Auth Gate"
                  description="Local sign-in state is stored in browser storage so the workspace stays gated."
                  badge="Ready"
                />
                <WorkspaceCard
                  title="Part 3 Pending"
                  description="Analyze and generate flows will be added in the next push."
                  badge="Pending"
                />
              </div>
            </section>

            <section className="fade-up motion-panel motion-panel-right rounded-[32px] border border-white/10 bg-white/92 p-5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      Test Branch
                    </p>
                    <h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950">
                      Sign in
                    </h2>
                  </div>
                </div>

                <form className="mt-6 grid gap-4" onSubmit={handleSignIn}>
                  <InputField
                    label="Email"
                    value={signInForm.email}
                    onChange={(event) => setSignInValue('email', event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <InputField
                    label="Password"
                    type="password"
                    value={signInForm.password}
                    onChange={(event) => setSignInValue('password', event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={signInForm.rememberMe}
                      onChange={(event) => setSignInValue('rememberMe', event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Remember me on this device
                  </label>

                  {signInError ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {signInError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-800 motion-cta"
                  >
                    Continue to workspace
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs leading-5 text-cyan-800">
                  After sign-in, Part 2 will expose the connection panel. Part 3 will add the
                  analyze and generate requests.
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.14),transparent_32%),linear-gradient(165deg,#f8fbff_0%,#eef7ff_45%,#f8fafc_100%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="fade-up flex flex-col gap-4 rounded-[32px] border border-white/80 bg-white/78 p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Test Branch
            </p>
            <h1 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Part 2 Workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Auth gate and connection settings are live here. Analyze and generate flows stay for
              the next push.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              Signed in as <span className="font-semibold text-slate-900">{signedInEmail}</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="fade-up stagger-1 grid gap-4 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_55px_-36px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-slate-950">
              Connection
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Header used: <code>x-project-api-key</code>
            </p>
          </div>
          <InputField
            label="Base URL"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
          />
          <InputField
            label="Project API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceCard
            title="What Part 2 Covers"
            description="The branch now includes the sign-in gate, auth persistence, and the connection settings panel."
            badge="Included"
          />
          <WorkspaceCard
            title="What Comes Next"
            description="Part 3 will add analyze, generate, upload handling, and result rendering."
            badge="Next"
          />
        </div>
      </div>
    </main>
  )
}

export default App
