import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { jsPDF } from 'jspdf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { FileText, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '../components/ui/alert'

interface Periodo {
  id: string
  nombre: string
  numero: number
  año_academico: number
}

interface Boletin {
  id: string
  estudiante_id: string
  periodo_id: string
  promedio_general: number | null
  observaciones_generales: string | null
  observaciones_director: string | null
  fecha_generacion: string
  estudiante: {
    nombre_completo: string
    email: string
  }
  periodo: {
    nombre: string
    numero: number
  }
  grupo: {
    nombre: string
    grado: {
      nombre: string
    }
  }
}

interface NotaDetalle {
  nota: number
  observaciones: string | null
  asignatura: {
    nombre: string
    codigo: string | null
  }
}

export default function BoletinesPage() {
  const { profile } = useAuthStore()
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('')
  const [boletines, setBoletines] = useState<Boletin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)

  // Cargar periodos
  useEffect(() => {
    loadPeriodos()
  }, [])

  // Cargar boletines cuando cambia el periodo
  useEffect(() => {
    if (selectedPeriodo) {
      loadBoletines()
    }
  }, [selectedPeriodo, profile])

  const loadPeriodos = async () => {
    try {
      const { data, error } = await supabase
        .from('periodos')
        .select('*')
        .eq('año_academico', 2026)
        .order('numero', { ascending: true })
        .returns<Periodo[]>()

      if (error) throw error
      setPeriodos(data || [])

      // Seleccionar el primer periodo por defecto
      if (data && data.length > 0) {
        setSelectedPeriodo(data[0].id)
      }
    } catch (err) {
      console.error('Error loading periodos:', err)
      setError('Error al cargar los periodos')
    }
  }

  const loadBoletines = async () => {
    if (!selectedPeriodo || !profile) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('boletines')
        .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email),
          periodo:periodo_id (nombre, numero),
          grupo:grupo_id (
            nombre,
            grado:grado_id (nombre)
          )
        `)
        .eq('periodo_id', selectedPeriodo)

      // Filtrar según el rol
      if (profile.rol === 'estudiante') {
        query = query.eq('estudiante_id', profile.id)
      } else if (profile.rol === 'padre') {
        // Obtener IDs de hijos
        const { data: hijos } = await supabase
          .from('padres_estudiantes')
          .select('estudiante_id')
          .eq('padre_id', profile.id)
          .returns<Array<{ estudiante_id: string }>>()

        const hijosIds = hijos?.map(h => h.estudiante_id) || []
        if (hijosIds.length > 0) {
          query = query.in('estudiante_id', hijosIds)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setBoletines(data || [])
    } catch (err) {
      console.error('Error loading boletines:', err)
      setError('Error al cargar los boletines')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (boletinId: string) => {
    setGeneratingPDF(boletinId)

    try {
      // Obtener datos completos del boletín
      const { data: boletin, error: boletinError } = await supabase
        .from('boletines')
        .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email),
          periodo:periodo_id (nombre, numero, fecha_inicio, fecha_fin),
          grupo:grupo_id (
            nombre,
            grado:grado_id (nombre, nivel)
          )
        `)
        .eq('id', boletinId)
        .single()
        .returns<Boletin>()

      if (boletinError) throw boletinError

      if (!boletin) {
        throw new Error('Boletín no encontrado')
      }

      const boletinData = boletin as Boletin

      // Obtener notas del periodo
      const { data: notas, error: notasError } = await supabase
        .from('notas')
        .select(`
          nota,
          observaciones,
          asignatura:asignatura_id (nombre, codigo)
        `)
        .eq('estudiante_id', boletinData.estudiante_id)
        .eq('periodo_id', boletinData.periodo_id)
        .order('asignatura(nombre)')

      if (notasError) throw notasError

      const notasDetalle = (notas || []) as NotaDetalle[]
      const pdf = generateBoletinPDF(boletinData, notasDetalle)
      const studentName = boletinData.estudiante.nombre_completo
        .toLowerCase()
        .replace(/\s+/g, '-')
      pdf.save(`boletin-${studentName}-${boletinData.periodo.nombre}.pdf`)
      setGeneratingPDF(null)

    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Error al generar el PDF')
      setGeneratingPDF(null)
    }
  }

  const generateBoletinPDF = (boletinData: Boletin, notasDetalle: NotaDetalle[]) => {
    const doc = new jsPDF()

    const pageWidth = doc.internal.pageSize.getWidth()
    const leftMargin = 14
    let currentY = 18

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Liceo Ángel de la Guarda', pageWidth / 2, currentY, { align: 'center' })

    currentY += 8
    doc.setFontSize(12)
    doc.text('Boletín de Notas', pageWidth / 2, currentY, { align: 'center' })

    currentY += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Estudiante: ${boletinData.estudiante.nombre_completo}`, leftMargin, currentY)
    currentY += 6
    doc.text(`Correo: ${boletinData.estudiante.email}`, leftMargin, currentY)
    currentY += 6
    doc.text(
      `Grupo: ${boletinData.grupo.grado.nombre} - ${boletinData.grupo.nombre}`,
      leftMargin,
      currentY
    )
    currentY += 6
    doc.text(
      `Periodo: ${boletinData.periodo.nombre} (Nº ${boletinData.periodo.numero})`,
      leftMargin,
      currentY
    )
    currentY += 6
    doc.text(
      `Fecha de generación: ${new Date(boletinData.fecha_generacion).toLocaleDateString()}`,
      leftMargin,
      currentY
    )

    currentY += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Promedio general:', leftMargin, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(
      boletinData.promedio_general?.toFixed(1) || 'N/A',
      leftMargin + 40,
      currentY
    )

    currentY += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Notas por asignatura', leftMargin, currentY)

    currentY += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    if (notasDetalle.length === 0) {
      doc.text('No hay notas registradas para este periodo.', leftMargin, currentY)
      return doc
    }

    notasDetalle.forEach((nota) => {
      if (currentY > 270) {
        doc.addPage()
        currentY = 18
      }

      const asignaturaText = `${nota.asignatura.nombre} (${nota.asignatura.codigo || 'Sin código'})`
      doc.text(asignaturaText, leftMargin, currentY)
      doc.text(nota.nota.toFixed(1), pageWidth - leftMargin, currentY, { align: 'right' })
      currentY += 5

      if (nota.observaciones) {
        const lines = doc.splitTextToSize(`Obs: ${nota.observaciones}`, pageWidth - leftMargin * 2)
        doc.text(lines, leftMargin, currentY)
        currentY += lines.length * 4
      } else {
        currentY += 2
      }
    })

    currentY += 4
    if (boletinData.observaciones_generales) {
      doc.setFont('helvetica', 'bold')
      doc.text('Observaciones generales', leftMargin, currentY)
      currentY += 5
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(
        boletinData.observaciones_generales,
        pageWidth - leftMargin * 2
      )
      doc.text(lines, leftMargin, currentY)
      currentY += lines.length * 4
    }

    if (boletinData.observaciones_director) {
      currentY += 4
      doc.setFont('helvetica', 'bold')
      doc.text('Observaciones del director', leftMargin, currentY)
      currentY += 5
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(
        boletinData.observaciones_director,
        pageWidth - leftMargin * 2
      )
      doc.text(lines, leftMargin, currentY)
    }

    return doc
  }

  const renderEstudianteView = () => (
    <div className="space-y-6">
      {boletines.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay boletines disponibles para este periodo.
          </AlertDescription>
        </Alert>
      ) : (
        boletines.map((boletin) => (
          <Card key={boletin.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Boletín - {boletin.periodo.nombre}
                  </CardTitle>
                  <CardDescription>
                    {boletin.grupo.grado.nombre} - Grupo {boletin.grupo.nombre}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleGeneratePDF(boletin.id)}
                  disabled={generatingPDF === boletin.id}
                >
                  {generatingPDF === boletin.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Promedio General */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Promedio General</p>
                    <p className="text-4xl font-bold text-blue-600">
                      {boletin.promedio_general?.toFixed(1) || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Generado el {new Date(boletin.fecha_generacion).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Observaciones */}
                {boletin.observaciones_generales && (
                  <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50">
                    <p className="font-medium text-sm text-gray-900 mb-1">
                      Observaciones Generales
                    </p>
                    <p className="text-sm text-gray-700">
                      {boletin.observaciones_generales}
                    </p>
                  </div>
                )}

                {boletin.observaciones_director && (
                  <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                    <p className="font-medium text-sm text-gray-900 mb-1">
                      Observaciones del Director
                    </p>
                    <p className="text-sm text-gray-700">
                      {boletin.observaciones_director}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  const renderAdminView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Boletines</CardTitle>
          <CardDescription>
            Genera y administra los boletines de los estudiantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Funcionalidad de generación masiva de boletines en desarrollo.
              Por ahora, los boletines se generan automáticamente cuando los docentes registran las notas.
            </AlertDescription>
          </Alert>

          {boletines.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">
                Boletines generados en este periodo: {boletines.length}
              </p>
              <div className="grid gap-3">
                {boletines.map((boletin) => (
                  <div
                    key={boletin.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">
                        {boletin.estudiante.nombre_completo}
                      </p>
                      <p className="text-sm text-gray-600">
                        {boletin.grupo.grado.nombre} - Grupo {boletin.grupo.nombre} •
                        Promedio: {boletin.promedio_general?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGeneratePDF(boletin.id)}
                      disabled={generatingPDF === boletin.id}
                    >
                      {generatingPDF === boletin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Boletines de Notas</h1>
        <p className="text-gray-600 mt-1">
          {profile?.rol === 'estudiante' && 'Consulta tus boletines académicos'}
          {profile?.rol === 'padre' && 'Consulta los boletines de tus hijos'}
          {(profile?.rol === 'administrador' || profile?.rol === 'administrativo') &&
            'Gestiona los boletines de los estudiantes'}
          {profile?.rol === 'docente' && 'Consulta los boletines de tus estudiantes'}
        </p>
      </div>

      {/* Selector de Periodo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              Seleccionar Periodo:
            </label>
            <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecciona un periodo" />
              </SelectTrigger>
              <SelectContent>
                {periodos.map((periodo) => (
                  <SelectItem key={periodo.id} value={periodo.id}>
                    {periodo.nombre} - {periodo.año_academico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Content based on role */}
      {!loading && (
        <>
          {(profile?.rol === 'estudiante' || profile?.rol === 'padre') && renderEstudianteView()}
          {(profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente') && renderAdminView()}
        </>
      )}
    </div>
  )
}
