import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
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
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
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
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Boletines de Notas</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/asistencia"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Registro de Asistencia</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/notas"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Notas Parciales</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/anuncios"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Anuncios</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/mensajes"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Mensajes</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/calendario"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Calendario</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/permisos"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Permisos y Excusas</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/seguimiento"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Seguimiento del Estudiante</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/horarios"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Horarios</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/citaciones"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Citaciones</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Editar Sitio</h2>
                  <p className="text-gray-600">Módulo en desarrollo</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
                <a href="/dashboard" className="text-blue-600 hover:underline">
                  Volver al inicio
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
