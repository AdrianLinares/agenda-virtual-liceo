import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Bell, Clock, Users } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Bienvenido, {profile?.nombre_completo}!
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí encontrarás un resumen de tu actividad académica
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Calendario
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              eventos esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Anuncios
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              anuncios nuevos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Asistencia
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">
              este periodo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cumpleaños
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendario Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Calendario de esta semana</CardTitle>
            <CardDescription>
              Próximos eventos y fechas importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-600 text-white flex flex-col items-center justify-center">
                <span className="text-xs font-medium">Lun</span>
                <span className="text-lg font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Reunión de padres</p>
                <p className="text-sm text-gray-600">4:00 PM - Auditorio</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-600 text-white flex flex-col items-center justify-center">
                <span className="text-xs font-medium">Mié</span>
                <span className="text-lg font-bold">5</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Examen de Matemáticas</p>
                <p className="text-sm text-gray-600">8:00 AM - Salón 201</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-600 text-white flex flex-col items-center justify-center">
                <span className="text-xs font-medium">Vie</span>
                <span className="text-lg font-bold">7</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Día Cultural</p>
                <p className="text-sm text-gray-600">Todo el día - Patio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anuncios Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Anuncios recientes</CardTitle>
            <CardDescription>
              Últimas novedades del colegio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-blue-600 pl-4 py-2">
              <p className="font-medium text-gray-900">
                Nuevos horarios de atención
              </p>
              <p className="text-sm text-gray-600 mt-1">
                A partir de la próxima semana, el horario de atención será de 7:00 AM a 3:00 PM.
              </p>
              <p className="text-xs text-gray-500 mt-2">Hace 2 horas</p>
            </div>

            <div className="border-l-4 border-purple-600 pl-4 py-2">
              <p className="font-medium text-gray-900">
                Recordatorio: Entrega de boletines
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Los boletines del primer periodo estarán disponibles el viernes.
              </p>
              <p className="text-xs text-gray-500 mt-2">Hace 1 día</p>
            </div>

            <div className="border-l-4 border-green-600 pl-4 py-2">
              <p className="font-medium text-gray-900">
                Inscripciones abiertas para actividades extracurriculares
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Ya están abiertas las inscripciones para deportes y artes.
              </p>
              <p className="text-xs text-gray-500 mt-2">Hace 2 días</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumpleaños de la semana */}
      <Card>
        <CardHeader>
          <CardTitle>🎉 Cumpleaños de esta semana</CardTitle>
          <CardDescription>
            Felicitemos a nuestros compañeros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-100">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                JS
              </div>
              <div>
                <p className="font-medium">Juan Sánchez</p>
                <p className="text-sm text-gray-600">Miércoles 5 de Feb</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-cyan-100">
              <div className="w-12 h-12 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold">
                MG
              </div>
              <div>
                <p className="font-medium">María González</p>
                <p className="text-sm text-gray-600">Viernes 7 de Feb</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
