import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DriveEmbed } from '@/components/anuncios/DriveEmbed'

describe('DriveEmbed', () => {
  it('renders iframe when a valid Google Drive URL is provided', () => {
    render(
      <DriveEmbed drivePublicUrl="https://drive.google.com/file/d/abc123XYZ/view?usp=sharing" />,
    )

    const iframe = screen.getByTitle('Vista previa del documento de Google Drive')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/abc123XYZ/preview',
    )
  })

  it('shows fallback message when provided URL is not embeddable', () => {
    render(<DriveEmbed drivePublicUrl="https://example.com/documento" />)

    expect(screen.getByText('Documento no público o permisos insuficientes.')).toBeInTheDocument()
    const fallbackLink = screen.getByRole('link', { name: 'Abrir en Google Drive' })
    expect(fallbackLink).toHaveAttribute('href', 'https://example.com/documento')
  })
})
