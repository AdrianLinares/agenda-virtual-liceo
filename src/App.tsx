import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
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
  const { profile, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!profile || !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Home Page - Public */}
          <Route path="/" element={<HomePage />} />

          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
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

          {/* Placeholder routes for other modules */}
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
                <DashboardLayout>
                  <AdminPage />
                </DashboardLayout>
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
