import { useState } from 'react'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://artistic-courage-server-test.up.railway.app'
const DEFAULT_API_KEY = import.meta.env.VITE_PROJECT_API_KEY ?? ''
const AUTH_STORAGE_KEY = 'test-api:auth-state'
const ALLOWED_PROVIDERS = ['gemini', 'openai']
const ALLOWED_ASPECT_RATIOS = ['1:1', '4:5', '16:9']
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 4096

const FIELD_LIMITS = {
  productName: 120,
  mainIngredient: 120,
  visualMood: 180,
  dynamicElements: 240,
  colorPalette: 160,
  backgroundStyle: 180,
  brandName: 120,
  ctaText: 80,
  lightingFocus: 80,
  extraNotes: 500,
  prompt: 1200,
}

const initialGenerateState = {
  prompt: '',
  productImage: '',
  referenceImage: '',
  logoImage: '',
  source: 'external_client',
  skipCaptionGeneration: false,
  strictReferenceLock: false,
  forceGeminiPlacementOnly: false,
  productName: '',
  mainIngredient: '',
  visualMood: '',
  dynamicElements: '',
  colorPalette: '',
  backgroundStyle: '',
  brandName: '',
  ctaText: '',
  aspectRatio: '',
  lightingFocus: '',
  extraNotes: '',
}

const initialAnalyzeState = {
  productImage: '',
  referenceImage: '',
  provider: 'gemini',
  pipelineName: 'gemini-edit-pipeline',
}

const analyzeSample = {
  productImage: 'data:image/png;base64,...',
  referenceImage: '',
  provider: 'gemini',
  pipelineName: 'gemini-edit-pipeline',
}

const generateSample = {
  productImage: 'data:image/png;base64,...',
  referenceImage: '',
  logoImage: '',
  source: 'external_client',
  skipCaptionGeneration: true,
  strictReferenceLock: false,
  forceGeminiPlacementOnly: false,
  productName: 'Aurora Serum',
  mainIngredient: 'vitamin C + niacinamide',
  visualMood: 'clean, modern, elegant',
  dynamicElements: 'water splash, soft particles',
  colorPalette: 'pastel peach and white',
  backgroundStyle: 'glossy studio backdrop',
  brandName: 'Prachar',
  ctaText: 'Shop Now',
  aspectRatio: '1:1',
  lightingFocus: 'softbox',
  extraNotes: 'Hero-centered packshot with premium reflections',
  prompt: '',
}

const generateReferenceSample = {
  productImage: 'data:image/png;base64,...',
  referenceImage: 'data:image/png;base64,...',
  logoImage: '',
  source: 'external_client',
  skipCaptionGeneration: true,
  strictReferenceLock: true,
  forceGeminiPlacementOnly: false,
  productName: 'Aurora Serum',
  mainIngredient: 'vitamin C + niacinamide',
  visualMood: 'clean, modern, elegant',
  dynamicElements: '',
  colorPalette: '',
  backgroundStyle: '',
  brandName: 'Prachar',
  ctaText: 'Shop Now',
  aspectRatio: '1:1',
  lightingFocus: '',
  extraNotes: '',
  prompt: '',
}

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

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to convert file to base64'))
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(imageUrl)
    }
    img.onerror = () => {
      reject(new Error('Invalid image file'))
      URL.revokeObjectURL(imageUrl)
    }
    img.src = imageUrl
  })
}

async function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid image type. Allowed: image/png, image/jpeg, image/webp')
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error('Image too large. Max file size: 10MB')
  }
  const { width, height } = await getImageDimensions(file)
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new Error('Image resolution too large. Max: 4096x4096')
  }
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (typeof value === 'boolean') return true
      return value !== '' && value !== null && value !== undefined
    }),
  )
}

function hasGenerateBuilderFields(form) {
  return Boolean(
    form.productName.trim() ||
      form.mainIngredient.trim() ||
      form.visualMood.trim() ||
      form.dynamicElements.trim() ||
      form.colorPalette.trim() ||
      form.backgroundStyle.trim() ||
      form.brandName.trim() ||
      form.ctaText.trim() ||
      form.aspectRatio.trim() ||
      form.lightingFocus.trim() ||
      form.extraNotes.trim(),
  )
}

function pickString(result, paths) {
  if (!result || typeof result !== 'object') return undefined

  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => {
      if (!acc || typeof acc !== 'object') return undefined
      return acc[key]
    }, result)
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function formatApiError(error) {
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return 'Request failed.'

  const code = typeof error.code === 'string' ? `[${error.code}] ` : ''
  const message = typeof error.message === 'string' ? error.message : 'Request failed.'
  const field = typeof error.field === 'string' ? `\nfield: ${error.field}` : ''
  const details = typeof error.details === 'string' ? `\ndetails: ${error.details}` : ''
  return `${code}${message}${field}${details}`
}

async function postJson({ apiBaseUrl, apiKey, endpoint, payload }) {
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-project-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let data

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    if (data && typeof data === 'object') {
      throw data
    }
    throw {
      code: 'HTTP_ERROR',
      message: `Request failed with status ${response.status}`,
      details: typeof data === 'string' ? data : JSON.stringify(data),
    }
  }

  return data
}

function InputField({
  label,
  value,
  onChange,
  placeholder = '',
  maxLength,
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
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder = '', maxLength }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        maxLength={maxLength}
        className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  )
}

function StatCard({ label, title, description, delayClass = '' }) {
  return (
    <div className={`motion-stat rounded-2xl border border-white/10 bg-white/6 p-4 ${delayClass}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 font-['Space_Grotesk'] text-lg font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
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
  const [generateForm, setGenerateForm] = useState(initialGenerateState)
  const [analyzeForm, setAnalyzeForm] = useState(initialAnalyzeState)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [generateResult, setGenerateResult] = useState(null)
  const [error, setError] = useState('')

  const generatedImageUrl =
    generateResult && typeof generateResult.imageUrl === 'string' ? generateResult.imageUrl : null
  const signedInEmail = typeof authState?.email === 'string' ? authState.email : 'workspace user'

  const setGenerateValue = (field, value) => {
    setGenerateForm((prev) => ({ ...prev, [field]: value }))
  }

  const setAnalyzeValue = (field, value) => {
    setAnalyzeForm((prev) => ({ ...prev, [field]: value }))
  }

  const setSignInValue = (field, value) => {
    setSignInForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = async (event, field, setValue) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await validateImageFile(file)
      const dataUrl = await toDataUrl(file)
      setValue(field, dataUrl)
      setError('')
    } catch (fileError) {
      setError(formatApiError(fileError))
    }
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
    setGenerateResult(null)
    setAnalyzeResult(null)
    setError('')
  }

  const ensureConnection = () => {
    if (!apiKey.trim()) {
      setError('API key is required.')
      return false
    }
    return true
  }

  const submitAnalyze = async () => {
    setError('')
    setAnalyzeResult(null)

    if (!ensureConnection()) return

    if (!analyzeForm.productImage.trim() && !analyzeForm.referenceImage.trim()) {
      setError('Analyze requires productImage OR referenceImage.')
      return
    }
    if (!ALLOWED_PROVIDERS.includes(analyzeForm.provider.trim())) {
      setError('Invalid provider. Allowed values: gemini, openai')
      return
    }

    setAnalyzeLoading(true)
    try {
      const payload = cleanPayload(analyzeForm)
      const data = await postJson({
        apiBaseUrl,
        apiKey,
        endpoint: '/api/external/analyze',
        payload,
      })
      setAnalyzeResult(data)
    } catch (requestError) {
      setError(formatApiError(requestError))
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const submitGenerate = async () => {
    setError('')
    setGenerateResult(null)

    if (!ensureConnection()) return

    if (!generateForm.productImage.trim()) {
      setError('Generate requires productImage.')
      return
    }

    if (
      !generateForm.prompt.trim() &&
      !generateForm.referenceImage.trim() &&
      !hasGenerateBuilderFields(generateForm)
    ) {
      setError('Generate requires prompt OR referenceImage (or builder fields to auto-build prompt).')
      return
    }
    if (
      generateForm.aspectRatio.trim() &&
      !ALLOWED_ASPECT_RATIOS.includes(generateForm.aspectRatio.trim())
    ) {
      setError('Invalid aspectRatio value. Allowed values: 1:1, 4:5, 16:9')
      return
    }

    setGenerateLoading(true)
    try {
      const payload = cleanPayload(generateForm)
      const data = await postJson({
        apiBaseUrl,
        apiKey,
        endpoint: '/api/external/generate',
        payload,
      })
      setGenerateResult(data)
    } catch (requestError) {
      setError(formatApiError(requestError))
    } finally {
      setGenerateLoading(false)
    }
  }

  const applyAnalyzeToGenerate = () => {
    if (!analyzeResult) return

    const suggested =
      analyzeResult.suggestedGeneratePayload &&
      typeof analyzeResult.suggestedGeneratePayload === 'object'
        ? analyzeResult.suggestedGeneratePayload
        : null

    const mapped = {
      productName: pickString(analyzeResult, [
        'productName',
        'productIdentity.productName',
        'product.productName',
      ]),
      mainIngredient: pickString(analyzeResult, [
        'mainIngredient',
        'ingredients.main',
        'productIdentity.mainIngredient',
      ]),
      visualMood: pickString(analyzeResult, ['visualMood', 'style.visualMood']),
      dynamicElements: pickString(analyzeResult, ['dynamicElements', 'composition.dynamicElements']),
      colorPalette: pickString(analyzeResult, ['colorPalette', 'style.colorPalette']),
      backgroundStyle: pickString(analyzeResult, ['backgroundStyle', 'style.backgroundStyle']),
      brandName: pickString(analyzeResult, ['brandName', 'productIdentity.brandName']),
      ctaText: pickString(analyzeResult, ['ctaText', 'cta', 'copy.ctaText']),
      aspectRatio: pickString(analyzeResult, ['aspectRatio', 'composition.aspectRatio']),
      lightingFocus: pickString(analyzeResult, ['lightingFocus', 'lighting.focus']),
      extraNotes: pickString(analyzeResult, ['extraNotes', 'notes', 'creativePlan']),
    }

    setGenerateForm((prev) => ({
      ...prev,
      productImage: prev.productImage || analyzeForm.productImage,
      source: pickString(suggested, ['source']) ?? prev.source,
      skipCaptionGeneration:
        typeof suggested?.skipCaptionGeneration === 'boolean'
          ? suggested.skipCaptionGeneration
          : prev.skipCaptionGeneration,
      strictReferenceLock:
        typeof suggested?.strictReferenceLock === 'boolean'
          ? suggested.strictReferenceLock
          : prev.strictReferenceLock,
      forceGeminiPlacementOnly:
        typeof suggested?.forceGeminiPlacementOnly === 'boolean'
          ? suggested.forceGeminiPlacementOnly
          : prev.forceGeminiPlacementOnly,
      productName: pickString(suggested, ['productName']) ?? mapped.productName ?? prev.productName,
      mainIngredient:
        pickString(suggested, ['mainIngredient']) ?? mapped.mainIngredient ?? prev.mainIngredient,
      visualMood: pickString(suggested, ['visualMood']) ?? mapped.visualMood ?? prev.visualMood,
      dynamicElements:
        pickString(suggested, ['dynamicElements']) ?? mapped.dynamicElements ?? prev.dynamicElements,
      colorPalette:
        pickString(suggested, ['colorPalette']) ?? mapped.colorPalette ?? prev.colorPalette,
      backgroundStyle:
        pickString(suggested, ['backgroundStyle']) ?? mapped.backgroundStyle ?? prev.backgroundStyle,
      brandName: pickString(suggested, ['brandName']) ?? mapped.brandName ?? prev.brandName,
      ctaText: pickString(suggested, ['ctaText']) ?? mapped.ctaText ?? prev.ctaText,
      aspectRatio: pickString(suggested, ['aspectRatio']) ?? mapped.aspectRatio ?? prev.aspectRatio,
      lightingFocus:
        pickString(suggested, ['lightingFocus']) ?? mapped.lightingFocus ?? prev.lightingFocus,
      extraNotes: pickString(suggested, ['extraNotes']) ?? mapped.extraNotes ?? prev.extraNotes,
    }))
  }

  if (!authState) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(145deg,#020617_0%,#07111f_45%,#0f172a_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl motion-orb motion-orb-a" />
        <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl motion-orb motion-orb-b" />
        <div className="pointer-events-none absolute bottom-[-6rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl motion-orb motion-orb-c" />

        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="fade-up motion-panel motion-panel-left flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/8 p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-10">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Part 3 push
                </span>
                <h1 className="mt-5 font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Sign in to the workspace.
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                  This branch now carries the auth gate, connection panel, analyze flow, and
                  generate flow. The final push keeps the whole client together on `test`.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Flow"
                  title="Analyze"
                  description="Upload product images and extract structured data."
                  delayClass="stagger-1"
                />
                <StatCard
                  label="Flow"
                  title="Generate"
                  description="Build prompts from fields or analyze suggestions."
                  delayClass="stagger-2"
                />
                <StatCard
                  label="Status"
                  title="Complete"
                  description="Part 1 and Part 2 already live on the test branch."
                  delayClass="stagger-3"
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
                    autoComplete="current-password"
                    value={signInForm.password}
                    onChange={(event) => setSignInValue('password', event.target.value)}
                    placeholder="Enter your password"
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
                  After sign-in, the workspace exposes the connection panel plus the analyze and
                  generate flows.
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
              Analyze to Generate Studio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Analyze images, fill the generator, and send final requests from one modern workspace.
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
          <section className="fade-up stagger-2 grid gap-4 rounded-[28px] border border-slate-200/70 bg-white/88 p-5 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-slate-950">
                Step 1: Analyze
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                productImage OR referenceImage
              </span>
            </div>

            <TextAreaField
              label="productImage (data URL)"
              value={analyzeForm.productImage}
              onChange={(event) => setAnalyzeValue('productImage', event.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event, 'productImage', setAnalyzeValue)}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-700"
            />

            <TextAreaField
              label="referenceImage (data URL)"
              value={analyzeForm.referenceImage}
              onChange={(event) => setAnalyzeValue('referenceImage', event.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event, 'referenceImage', setAnalyzeValue)}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-700"
            />

            <InputField
              label="provider"
              value={analyzeForm.provider}
              onChange={(event) => setAnalyzeValue('provider', event.target.value)}
              placeholder="gemini | openai"
            />
            <InputField
              label="pipelineName"
              value={analyzeForm.pipelineName}
              onChange={(event) => setAnalyzeValue('pipelineName', event.target.value)}
              placeholder="gemini-edit-pipeline | openai-analyze-pipeline"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAnalyzeForm(analyzeSample)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Load Analyze Sample
              </button>
              <button
                type="button"
                disabled={analyzeLoading}
                onClick={submitAnalyze}
                className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
              >
                {analyzeLoading ? 'Analyzing...' : 'Send Analyze Request'}
              </button>
            </div>

            {analyzeResult ? (
              <div className="grid gap-2">
                {typeof analyzeResult.schemaVersion === 'string' ? (
                  <p className="text-xs text-slate-500">
                    schemaVersion: <span className="font-semibold">{analyzeResult.schemaVersion}</span>
                  </p>
                ) : null}
                <pre className="max-h-64 overflow-auto rounded-2xl border border-slate-900/90 bg-slate-950 p-4 text-xs text-emerald-300">
                  {JSON.stringify(analyzeResult, null, 2)}
                </pre>
              </div>
            ) : null}
          </section>

          <section className="fade-up stagger-3 grid gap-4 rounded-[28px] border border-slate-200/70 bg-white/88 p-5 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-slate-950">
                Step 2: Generate
              </h2>
              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-semibold text-lime-700">
                productImage + prompt/reference/fields
              </span>
            </div>
            <p className="text-xs text-slate-600">
              The generate pipeline is selected server-side, so the client does not need a{' '}
              <code>pipelineName</code> field.
            </p>

            <TextAreaField
              label="prompt (optional)"
              value={generateForm.prompt}
              onChange={(event) => setGenerateValue('prompt', event.target.value)}
              placeholder="Optional: leave empty to auto-build from builder fields"
              maxLength={FIELD_LIMITS.prompt}
            />

            <TextAreaField
              label="productImage (data URL)"
              value={generateForm.productImage}
              onChange={(event) => setGenerateValue('productImage', event.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event, 'productImage', setGenerateValue)}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
            />

            <TextAreaField
              label="referenceImage (data URL)"
              value={generateForm.referenceImage}
              onChange={(event) => setGenerateValue('referenceImage', event.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event, 'referenceImage', setGenerateValue)}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
            />

            <TextAreaField
              label="logoImage (data URL)"
              value={generateForm.logoImage}
              onChange={(event) => setGenerateValue('logoImage', event.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event, 'logoImage', setGenerateValue)}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
            />

            <InputField
              label="source"
              value={generateForm.source}
              onChange={(event) => setGenerateValue('source', event.target.value)}
            />

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={generateForm.skipCaptionGeneration}
                  onChange={(event) => setGenerateValue('skipCaptionGeneration', event.target.checked)}
                />
                skipCaptionGeneration
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={generateForm.strictReferenceLock}
                  onChange={(event) => setGenerateValue('strictReferenceLock', event.target.checked)}
                />
                strictReferenceLock
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={generateForm.forceGeminiPlacementOnly}
                  onChange={(event) =>
                    setGenerateValue('forceGeminiPlacementOnly', event.target.checked)
                  }
                />
                forceGeminiPlacementOnly
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="productName"
                value={generateForm.productName}
                onChange={(event) => setGenerateValue('productName', event.target.value)}
                maxLength={FIELD_LIMITS.productName}
              />
              <InputField
                label="mainIngredient"
                value={generateForm.mainIngredient}
                onChange={(event) => setGenerateValue('mainIngredient', event.target.value)}
                maxLength={FIELD_LIMITS.mainIngredient}
              />
              <InputField
                label="visualMood"
                value={generateForm.visualMood}
                onChange={(event) => setGenerateValue('visualMood', event.target.value)}
                maxLength={FIELD_LIMITS.visualMood}
              />
              <InputField
                label="dynamicElements"
                value={generateForm.dynamicElements}
                onChange={(event) => setGenerateValue('dynamicElements', event.target.value)}
                maxLength={FIELD_LIMITS.dynamicElements}
              />
              <InputField
                label="colorPalette"
                value={generateForm.colorPalette}
                onChange={(event) => setGenerateValue('colorPalette', event.target.value)}
                maxLength={FIELD_LIMITS.colorPalette}
              />
              <InputField
                label="backgroundStyle"
                value={generateForm.backgroundStyle}
                onChange={(event) => setGenerateValue('backgroundStyle', event.target.value)}
                maxLength={FIELD_LIMITS.backgroundStyle}
              />
              <InputField
                label="brandName"
                value={generateForm.brandName}
                onChange={(event) => setGenerateValue('brandName', event.target.value)}
                maxLength={FIELD_LIMITS.brandName}
              />
              <InputField
                label="ctaText"
                value={generateForm.ctaText}
                onChange={(event) => setGenerateValue('ctaText', event.target.value)}
                maxLength={FIELD_LIMITS.ctaText}
              />
              <InputField
                label="aspectRatio"
                value={generateForm.aspectRatio}
                onChange={(event) => setGenerateValue('aspectRatio', event.target.value)}
                placeholder="1:1, 4:5, 16:9..."
              />
              <InputField
                label="lightingFocus"
                value={generateForm.lightingFocus}
                onChange={(event) => setGenerateValue('lightingFocus', event.target.value)}
                maxLength={FIELD_LIMITS.lightingFocus}
              />
            </div>

            <TextAreaField
              label="extraNotes"
              value={generateForm.extraNotes}
              onChange={(event) => setGenerateValue('extraNotes', event.target.value)}
              maxLength={FIELD_LIMITS.extraNotes}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGenerateForm(generateSample)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Load Sample (No Ref)
              </button>
              <button
                type="button"
                onClick={() => setGenerateForm(generateReferenceSample)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Load Sample (With Ref)
              </button>
              <button
                type="button"
                disabled={!analyzeResult}
                onClick={applyAnalyzeToGenerate}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Fill From Analyze
              </button>
              <button
                type="button"
                disabled={generateLoading}
                onClick={submitGenerate}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {generateLoading ? 'Generating...' : 'Send Generate Request'}
              </button>
            </div>

            {generateResult ? (
              <div className="grid gap-3">
                {typeof generateResult.schemaVersion === 'string' ? (
                  <p className="text-xs text-slate-500">
                    schemaVersion: <span className="font-semibold">{generateResult.schemaVersion}</span>
                  </p>
                ) : null}
                <pre className="max-h-64 overflow-auto rounded-2xl border border-slate-900/90 bg-slate-950 p-4 text-xs text-cyan-300">
                  {JSON.stringify(generateResult, null, 2)}
                </pre>
                {generatedImageUrl ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                      Generated Image Preview
                    </p>
                    <img
                      src={generatedImageUrl}
                      alt="Generated output"
                      className="max-h-[420px] w-full rounded-xl border border-slate-200 object-contain"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceCard
            title="Part 3 Coverage"
            description="Analyze and generate are now live together with image validation, payload cleaning, and response rendering."
            badge="Included"
          />
          <WorkspaceCard
            title="Push Rule"
            description="This part is only being pushed to `test`. `main` stays untouched until promotion."
            badge="Test"
          />
        </div>

        {error ? (
          <pre className="fade-up mt-2 overflow-auto rounded-[24px] border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
            {error}
          </pre>
        ) : null}
      </div>
    </main>
  )
}

export default App
