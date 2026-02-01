export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'
export type AsistenciaEstado = 'presente' | 'ausente' | 'tarde' | 'excusa'
export type PermisoEstado = 'pendiente' | 'aprobado' | 'rechazado'
export type MensajeEstado = 'enviado' | 'leido' | 'archivado'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nombre_completo: string
          rol: UserRole
          telefono: string | null
          direccion: string | null
          foto_url: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nombre_completo: string
          rol: UserRole
          telefono?: string | null
          direccion?: string | null
          foto_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre_completo?: string
          rol?: UserRole
          telefono?: string | null
          direccion?: string | null
          foto_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      grados: {
        Row: {
          id: string
          nombre: string
          nivel: string
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          nivel: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          nivel?: string
          created_at?: string
        }
      }
      grupos: {
        Row: {
          id: string
          grado_id: string
          nombre: string
          año_academico: number
          director_grupo_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grado_id: string
          nombre: string
          año_academico: number
          director_grupo_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grado_id?: string
          nombre?: string
          año_academico?: number
          director_grupo_id?: string | null
          created_at?: string
        }
      }
      asignaturas: {
        Row: {
          id: string
          nombre: string
          codigo: string | null
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          codigo?: string | null
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          codigo?: string | null
          descripcion?: string | null
          created_at?: string
        }
      }
      estudiantes_grupos: {
        Row: {
          id: string
          estudiante_id: string
          grupo_id: string
          año_academico: number
          estado: string
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          grupo_id: string
          año_academico: number
          estado?: string
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          grupo_id?: string
          año_academico?: number
          estado?: string
          created_at?: string
        }
      }
      padres_estudiantes: {
        Row: {
          id: string
          padre_id: string
          estudiante_id: string
          parentesco: string
          principal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          padre_id: string
          estudiante_id: string
          parentesco: string
          principal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          padre_id?: string
          estudiante_id?: string
          parentesco?: string
          principal?: boolean
          created_at?: string
        }
      }
      asignaciones_docentes: {
        Row: {
          id: string
          docente_id: string
          grupo_id: string
          asignatura_id: string
          año_academico: number
          created_at: string
        }
        Insert: {
          id?: string
          docente_id: string
          grupo_id: string
          asignatura_id: string
          año_academico: number
          created_at?: string
        }
        Update: {
          id?: string
          docente_id?: string
          grupo_id?: string
          asignatura_id?: string
          año_academico?: number
          created_at?: string
        }
      }
      periodos: {
        Row: {
          id: string
          nombre: string
          numero: number
          año_academico: number
          fecha_inicio: string
          fecha_fin: string
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          numero: number
          año_academico: number
          fecha_inicio: string
          fecha_fin: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          numero?: number
          año_academico?: number
          fecha_inicio?: string
          fecha_fin?: string
          created_at?: string
        }
      }
      notas: {
        Row: {
          id: string
          estudiante_id: string
          asignatura_id: string
          periodo_id: string
          grupo_id: string
          docente_id: string | null
          nota: number
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          asignatura_id: string
          periodo_id: string
          grupo_id: string
          docente_id?: string | null
          nota: number
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          asignatura_id?: string
          periodo_id?: string
          grupo_id?: string
          docente_id?: string | null
          nota?: number
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      boletines: {
        Row: {
          id: string
          estudiante_id: string
          periodo_id: string
          grupo_id: string
          promedio_general: number | null
          observaciones_generales: string | null
          observaciones_director: string | null
          fecha_generacion: string
          generado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          periodo_id: string
          grupo_id: string
          promedio_general?: number | null
          observaciones_generales?: string | null
          observaciones_director?: string | null
          fecha_generacion?: string
          generado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          periodo_id?: string
          grupo_id?: string
          promedio_general?: number | null
          observaciones_generales?: string | null
          observaciones_director?: string | null
          fecha_generacion?: string
          generado_por?: string | null
          created_at?: string
        }
      }
      asistencias: {
        Row: {
          id: string
          estudiante_id: string
          grupo_id: string
          fecha: string
          estado: AsistenciaEstado
          asignatura_id: string | null
          observaciones: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          grupo_id: string
          fecha: string
          estado: AsistenciaEstado
          asignatura_id?: string | null
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          grupo_id?: string
          fecha?: string
          estado?: AsistenciaEstado
          asignatura_id?: string | null
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
        }
      }
      horarios: {
        Row: {
          id: string
          grupo_id: string
          asignatura_id: string
          docente_id: string | null
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          aula: string | null
          año_academico: number
          created_at: string
        }
        Insert: {
          id?: string
          grupo_id: string
          asignatura_id: string
          docente_id?: string | null
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          aula?: string | null
          año_academico: number
          created_at?: string
        }
        Update: {
          id?: string
          grupo_id?: string
          asignatura_id?: string
          docente_id?: string | null
          dia_semana?: number
          hora_inicio?: string
          hora_fin?: string
          aula?: string | null
          año_academico?: number
          created_at?: string
        }
      }
      anuncios: {
        Row: {
          id: string
          titulo: string
          contenido: string
          autor_id: string
          destinatarios: string[]
          importante: boolean
          fecha_publicacion: string
          fecha_expiracion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          titulo: string
          contenido: string
          autor_id: string
          destinatarios: string[]
          importante?: boolean
          fecha_publicacion?: string
          fecha_expiracion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          contenido?: string
          autor_id?: string
          destinatarios?: string[]
          importante?: boolean
          fecha_publicacion?: string
          fecha_expiracion?: string | null
          created_at?: string
        }
      }
      mensajes: {
        Row: {
          id: string
          remitente_id: string
          destinatario_id: string
          asunto: string
          contenido: string
          estado: MensajeEstado
          leido_en: string | null
          created_at: string
        }
        Insert: {
          id?: string
          remitente_id: string
          destinatario_id: string
          asunto: string
          contenido: string
          estado?: MensajeEstado
          leido_en?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          remitente_id?: string
          destinatario_id?: string
          asunto?: string
          contenido?: string
          estado?: MensajeEstado
          leido_en?: string | null
          created_at?: string
        }
      }
      permisos: {
        Row: {
          id: string
          estudiante_id: string
          tipo: string
          fecha_inicio: string
          fecha_fin: string
          motivo: string
          descripcion: string | null
          soporte_url: string | null
          estado: PermisoEstado
          solicitado_por: string | null
          revisado_por: string | null
          fecha_revision: string | null
          observaciones_revision: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          tipo: string
          fecha_inicio: string
          fecha_fin: string
          motivo: string
          descripcion?: string | null
          soporte_url?: string | null
          estado?: PermisoEstado
          solicitado_por?: string | null
          revisado_por?: string | null
          fecha_revision?: string | null
          observaciones_revision?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          tipo?: string
          fecha_inicio?: string
          fecha_fin?: string
          motivo?: string
          descripcion?: string | null
          soporte_url?: string | null
          estado?: PermisoEstado
          solicitado_por?: string | null
          revisado_por?: string | null
          fecha_revision?: string | null
          observaciones_revision?: string | null
          created_at?: string
        }
      }
      seguimientos: {
        Row: {
          id: string
          estudiante_id: string
          tipo: string
          titulo: string
          descripcion: string
          fecha_registro: string
          registrado_por: string | null
          acciones_tomadas: string | null
          requiere_seguimiento: boolean
          fecha_seguimiento: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          tipo: string
          titulo: string
          descripcion: string
          fecha_registro?: string
          registrado_por?: string | null
          acciones_tomadas?: string | null
          requiere_seguimiento?: boolean
          fecha_seguimiento?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          tipo?: string
          titulo?: string
          descripcion?: string
          fecha_registro?: string
          registrado_por?: string | null
          acciones_tomadas?: string | null
          requiere_seguimiento?: boolean
          fecha_seguimiento?: string | null
          created_at?: string
        }
      }
      citaciones: {
        Row: {
          id: string
          estudiante_id: string
          citado: string
          motivo: string
          descripcion: string | null
          fecha_citacion: string
          lugar: string | null
          creado_por: string | null
          asistio: boolean | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          citado: string
          motivo: string
          descripcion?: string | null
          fecha_citacion: string
          lugar?: string | null
          creado_por?: string | null
          asistio?: boolean | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          citado?: string
          motivo?: string
          descripcion?: string | null
          fecha_citacion?: string
          lugar?: string | null
          creado_por?: string | null
          asistio?: boolean | null
          observaciones?: string | null
          created_at?: string
        }
      }
      eventos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          tipo: string
          fecha_inicio: string
          fecha_fin: string | null
          todo_el_dia: boolean
          lugar: string | null
          destinatarios: string[]
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion?: string | null
          tipo: string
          fecha_inicio: string
          fecha_fin?: string | null
          todo_el_dia?: boolean
          lugar?: string | null
          destinatarios: string[]
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string | null
          tipo?: string
          fecha_inicio?: string
          fecha_fin?: string | null
          todo_el_dia?: boolean
          lugar?: string | null
          destinatarios?: string[]
          creado_por?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      asistencia_estado: AsistenciaEstado
      permiso_estado: PermisoEstado
      mensaje_estado: MensajeEstado
    }
  }
}
