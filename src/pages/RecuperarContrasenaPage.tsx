import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset)
    const loading = useAuthStore((state) => state.loading)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        try {
            const redirectTo = `${window.location.origin}/restablecer-contrasena`
            await requestPasswordReset(email.trim(), redirectTo)
            setSubmitted(true)
        } catch (err: any) {
            setError(err.message || 'No se pudo procesar la solicitud')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-secondary p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle>Recuperar Contraseña</CardTitle>
                        <CardDescription>
                            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading || submitted}
                                />
                            </div>

                            {error && (
                                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                                    {error}
                                </div>
                            )}

                            {submitted && (
                                <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/30 rounded-md">
                                    Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading || submitted}>
                                {loading ? 'Enviando...' : 'Enviar enlace'}
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
