import { transformGoogleDriveUrlToEmbed } from '@/utils/transformGoogleDriveUrlToEmbed'

type DriveEmbedProps = {
  drivePublicUrl: string | null | undefined
}

export function DriveEmbed({ drivePublicUrl }: DriveEmbedProps) {
  if (!drivePublicUrl?.trim()) {
    return null
  }

  const embedUrl = transformGoogleDriveUrlToEmbed(drivePublicUrl)

  if (!embedUrl) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Documento no público o permisos insuficientes.</p>
        <a
          href={drivePublicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Abrir en Google Drive
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-md border border-border aspect-video max-h-[600px]">
        <iframe
          title="Vista previa del documento de Google Drive"
          src={embedUrl}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allowFullScreen
        />
      </div>
      <a
        href={drivePublicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        Abrir en Google Drive
      </a>
    </div>
  )
}
