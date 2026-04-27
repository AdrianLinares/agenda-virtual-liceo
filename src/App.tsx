import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { getAuthResumeStrategy } from '@/config/feature-flags'

const HomePage = lazy(() => import('@/pages/HomePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'))
const BoletinesPage = lazy(() => import('@/pages/BoletinesPage'))
const NotasPage = lazy(() => import('@/pages/NotasPage'))
const AsistenciaPage = lazy(() => import('@/pages/AsistenciaPage'))
const AnunciosPage = lazy(() => import('@/pages/AnunciosPage'))
const CalendarioPage = lazy(() => import('@/pages/CalendarioPage'))
const MensajesPage = lazy(() => import('@/pages/MensajesPage'))
const PermisosPage = lazy(() => import('@/pages/PermisosPage'))
const SeguimientoPage = lazy(() => import('@/pages/SeguimientoPage'))
const HorariosPage = lazy(() => import('@/pages/HorariosPage'))
const CitacionesPage = lazy(() => import('@/pages/CitacionesPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const CambiarContrasenaPage = lazy(() => import('@/pages/CambiarContrasenaPage'))
const RecuperarContrasenaPage = lazy(() => import('@/pages/RecuperarContrasenaPage'))
const RestablecerContrasenaPage = lazy(() => import('@/pages/RestablecerContrasenaPage'))

function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}

// Blocks private routes until auth is initialized and a user is present.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const { profile, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // If the profile is not loaded or role is not allowed, keep user in dashboard root.
  if (!profile || !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function RecoveryLinkRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash)
    const searchParams = new URLSearchParams(location.search)
    const recoveryType = hashParams.get('type') || searchParams.get('type')

    if (recoveryType === 'recovery' && location.pathname !== '/restablecer-contrasena') {
      navigate(`/restablecer-contrasena${location.search}${location.hash}`, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

  return null
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)
  const syncSession = useAuthStore((state) => state.syncSession)
  const markAppResumed = useAuthStore((state) => state.markAppResumed)
  const lastResumeTriggerRef = useRef(0)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const wakeAuth = (reason: 'visibilitychange' | 'online') => {
      const now = Date.now()
      // Prevent duplicate resume work when browser fires visibility and focus together.
      if (now - lastResumeTriggerRef.current < 3000) {
        return
      }

      lastResumeTriggerRef.current = now

      // En entorno de desarrollo se registra el motivo del resume para depuración.
      if (import.meta.env.DEV) {
        console.info('[app] resume trigger detected:', reason)
      }

      if (getAuthResumeStrategy() === 'stable') {
        void syncSession(reason).finally(() => {
          markAppResumed()
        })
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        wakeAuth('visibilitychange')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const handleOnline = () => wakeAuth('online')
    const handleFocus = () => wakeAuth('visibilitychange')
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
    }
  }, [markAppResumed, syncSession])

  return (
    <BrowserRouter>
      <RecoveryLinkRedirect />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Home Page - Public */}
          <Route path="/" element={<HomePage />} />

          {/* Public Routes */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/recuperar-contrasena"
            element={<RecuperarContrasenaPage />}
          />

          <Route
            path="/restablecer-contrasena"
            element={<RestablecerContrasenaPage />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected module routes */}
          <Route
            path="/dashboard/boletines"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['administrador']}>
                  <DashboardLayout>
                    <BoletinesPage />
                  </DashboardLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/asistencia"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AsistenciaPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/notas"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NotasPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/anuncios"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnunciosPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/mensajes"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MensajesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/calendario"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CalendarioPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/permisos"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PermisosPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/seguimiento"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SeguimientoPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/horarios"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HorariosPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/citaciones"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CitacionesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['administrador']}>
                  <DashboardLayout>
                    <AdminPage />
                  </DashboardLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/cambiar-contrasena"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CambiarContrasenaPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
                  <p className="text-xl text-muted-foreground mb-8">Página no encontrada</p>
                  <a href="/" className="text-primary hover:underline">
                    Volver al inicio
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
