import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'

export default function RestablecerContrasenaPage() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [slowRequestNotice, setSlowRequestNotice] = useState(false)
    const [validatingRecovery, setValidatingRecovery] = useState(true)
    const [recoveryReady, setRecoveryReady] = useState(false)

    const updatePasswordWithRecovery = useAuthStore((state) => state.updatePasswordWithRecovery)
    const loading = useAuthStore((state) => state.loading)
    const navigate = useNavigate()

    useEffect(() => {
        let cancelled = false

        const ensureRecoverySession = async () => {
            setValidatingRecovery(true)

            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession()

                if (sessionError) {
                    throw sessionError
                }

                if (session?.user) {
                    if (!cancelled) {
                        setRecoveryReady(true)
                        setError('')
                    }
                    return
                }

                const hash = window.location.hash.startsWith('#')
                    ? window.location.hash.slice(1)
                    : window.location.hash
                const hashParams = new URLSearchParams(hash)
                const searchParams = new URLSearchParams(window.location.search)

                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const code = searchParams.get('code')

                if (accessToken && refreshToken) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    })

                    if (setSessionError) {
                        throw setSessionError
                    }

                    if (!cancelled) {
                        setRecoveryReady(true)
                        setError('')
                    }
                    return
                }

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

                    if (exchangeError) {
                        throw exchangeError
                    }

                    if (!cancelled) {
                        setRecoveryReady(true)
                        setError('')
                    }
                    return
                }

                if (!cancelled) {
                    setRecoveryReady(false)
                    setError('El enlace de recuperación es inválido o expiró. Solicita uno nuevo.')
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'No se pudo validar la sesión de recuperación'

                if (!cancelled) {
                    setRecoveryReady(false)
                    setError(message || 'No se pudo validar la sesión de recuperación')
                }
            } finally {
                if (!cancelled) {
                    setValidatingRecovery(false)
                }
            }
        }

        void ensureRecoverySession()

        return () => {
            cancelled = true
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSlowRequestNotice(false)

        if (!recoveryReady) {
            setError('La sesión de recuperación no está activa. Abre nuevamente el enlace del correo.')
            return
        }

        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('La confirmación de la nueva contraseña no coincide')
            return
        }

        const slowNoticeTimer = window.setTimeout(() => {
            setSlowRequestNotice(true)
        }, 5000)

        try {
            await updatePasswordWithRecovery(newPassword)
            setSuccess('Tu contraseña fue restablecida. Ahora puedes iniciar sesión.')
            setTimeout(() => {
                navigate('/login')
            }, 1500)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo restablecer la contraseña'
            setError(message)
        } finally {
            window.clearTimeout(slowNoticeTimer)
            setSlowRequestNotice(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-secondary p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle>Restablecer Contraseña</CardTitle>
                        <CardDescription>
                            Define una nueva contraseña para tu cuenta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nueva contraseña</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading || Boolean(success)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading || Boolean(success)}
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700 [&>svg]:text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>{success}</AlertDescription>
                                </Alert>
                            )}

                            {loading && slowRequestNotice && !error && !success && (
                                <Alert className="border-amber-200 bg-amber-50 text-amber-700 [&>svg]:text-amber-700">
                                    <Clock3 className="h-4 w-4" />
                                    <AlertDescription>
                                        Estamos procesando el cambio. Puede tardar unos segundos adicionales.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full" disabled={loading || validatingRecovery || !recoveryReady || Boolean(success)}>
                                {validatingRecovery ? 'Validando enlace...' : loading ? 'Guardando...' : 'Restablecer contraseña'}
                            </Button>
                        </form>

                        <div className="mt-4 text-center text-sm text-muted-foreground">
                            <Link to="/login" className="text-primary hover:underline">
                                Volver a iniciar sesión
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
