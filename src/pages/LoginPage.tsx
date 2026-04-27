import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = useAuthStore((state) => state.signIn)
  const setHydrating = useAuthStore((state) => state.setHydrating)
  const navigate = useNavigate()

  useEffect(() => {
    setHydrating(true)
  }, [setHydrating])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background via-muted to-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-40 h-40 rounded-xl mx-auto mb-4 overflow-hidden bg-muted">
            <img
              src="/images/escudo.jpg"
              alt="Escudo Liceo Ángel de la Guarda"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              width="160"
              height="160"
              decoding="async"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Liceo Ángel de la Guarda
          </h1>
          <p className="text-muted-foreground">Agenda Virtual</p>
        </div>

        {/* Card de Login */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder a la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setHydrating(true)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setHydrating(true)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-4 space-y-3 text-center text-sm">
              <div className="text-muted-foreground">
                <Link to="/recuperar-contrasena" className="text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div>
                <Link to="/">
                  <Button variant="outline" className="w-full" type="button">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Inicio
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          PQRS: soporte@liceoangeldelaguarda.education <br />
          © 2026 Liceo Ángel de la Guarda. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
