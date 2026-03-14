import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'

export default function CambiarContrasenaPage() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [slowRequestNotice, setSlowRequestNotice] = useState(false)

    const changePassword = useAuthStore((state) => state.changePassword)
    const loading = useAuthStore((state) => state.loading)

    const resetFormForAnotherChange = () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setError('')
        setSuccess('')
        setSlowRequestNotice(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSlowRequestNotice(false)

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
            await changePassword(currentPassword, newPassword)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setSuccess('Contraseña actualizada correctamente')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo cambiar la contraseña'
            setError(message)
        } finally {
            window.clearTimeout(slowNoticeTimer)
            setSlowRequestNotice(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>
                        Ingresa tu contraseña actual para poder definir una nueva contraseña.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Contraseña actual</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading || Boolean(success)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nueva contraseña</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading || Boolean(success)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
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
                            <div className="space-y-3">
                                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700 [&>svg]:text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>{success}</AlertDescription>
                                </Alert>
                                <Button type="button" variant="outline" className="w-full" onClick={resetFormForAnotherChange}>
                                    Cambiar de nuevo
                                </Button>
                            </div>
                        )}

                        {loading && slowRequestNotice && !error && !success && (
                            <Alert className="border-amber-200 bg-amber-50 text-amber-700 [&>svg]:text-amber-700">
                                <Clock3 className="h-4 w-4" />
                                <AlertDescription>
                                    Estamos procesando el cambio. Puede tardar unos segundos adicionales.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={loading || Boolean(success)}>
                            {loading ? 'Guardando...' : 'Actualizar contraseña'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
