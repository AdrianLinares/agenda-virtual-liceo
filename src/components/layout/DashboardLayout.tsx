import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  FileText,
  ClipboardCheck,
  BookOpen,
  Bell,
  Mail,
  Calendar,
  FileCheck,
  UserSearch,
  Clock,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

interface MenuItem {
  title: string
  href: string
  icon: ReactNode
  roles: string[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Principal',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Boletines de Notas',
    href: '/dashboard/boletines',
    icon: <FileText className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Registro de Asistencia',
    href: '/dashboard/asistencia',
    icon: <ClipboardCheck className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Notas Parciales',
    href: '/dashboard/notas',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Anuncios',
    href: '/dashboard/anuncios',
    icon: <Bell className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Mensajes',
    href: '/dashboard/mensajes',
    icon: <Mail className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Calendario',
    href: '/dashboard/calendario',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Permisos y Excusas',
    href: '/dashboard/permisos',
    icon: <FileCheck className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Seguimiento',
    href: '/dashboard/seguimiento',
    icon: <UserSearch className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Horarios',
    href: '/dashboard/horarios',
    icon: <Clock className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Citaciones',
    href: '/dashboard/citaciones',
    icon: <Users className="w-5 h-5" />,
    roles: ['administrador', 'administrativo', 'docente', 'estudiante', 'padre'],
  },
  {
    title: 'Editar Sitio',
    href: '/dashboard/admin',
    icon: <Settings className="w-5 h-5" />,
    roles: ['administrador'],
  },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const filteredMenuItems = menuItems.filter((item) => {
    const userRole = profile?.rol
    // Si no hay rol, mostrar todos los items (para testing)
    if (!userRole) {
      return true
    }
    return item.roles.includes(userRole)
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  Liceo Ángel de la Guarda
                </h1>
                <p className="text-xs text-gray-500">Agenda Virtual</p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={profile?.foto_url || undefined} />
                  <AvatarFallback>
                    {profile?.nombre_completo ? getInitials(profile.nombre_completo) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.nombre_completo}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {profile?.rol}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
            transform transition-transform duration-200 ease-in-out lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            mt-[57px] lg:mt-0
          `}
        >
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-57px)]">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Overlay para móviles */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
