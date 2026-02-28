import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RestablecerContrasenaPage() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const updatePasswordWithRecovery = useAuthStore((state) => state.updatePasswordWithRecovery)
    const loading = useAuthStore((state) => state.loading)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('La confirmación de la nueva contraseña no coincide')
            return
        }

        try {
            await updatePasswordWithRecovery(newPassword)
            setSuccess('Tu contraseña fue restablecida. Ahora puedes iniciar sesión.')
            setTimeout(() => {
                navigate('/login')
            }, 1500)
        } catch (err: any) {
            setError(err.message || 'No se pudo restablecer la contraseña')
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
                                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/30 rounded-md">
                                    {success}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading || Boolean(success)}>
                                {loading ? 'Guardando...' : 'Restablecer contraseña'}
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
