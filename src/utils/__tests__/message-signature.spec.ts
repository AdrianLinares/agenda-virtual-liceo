import { describe, expect, it } from 'vitest'
import { SIGNATURE_ROLES, buildMessageSignature } from '../message-signature'

describe('buildMessageSignature', () => {
    it('compone nombre y titulo en dos lineas para docentes', () => {
        const firma = buildMessageSignature({
            nombre_completo: 'Ximena Patricia Ávila Díaz',
            titulo_profesional: 'Lic. Ciencias Naturales y Educación Ambiental',
            rol: 'docente'
        })

        expect(firma).toBe(
            'Ximena Patricia Ávila Díaz\nLic. Ciencias Naturales y Educación Ambiental'
        )
    })

    it('compone para administrativos', () => {
        const firma = buildMessageSignature({
            nombre_completo: 'Carlos Ramírez',
            titulo_profesional: 'Lic. Administración Educativa',
            rol: 'administrativo'
        })

        expect(firma).toBe('Carlos Ramírez\nLic. Administración Educativa')
    })

    it('compone para administradores', () => {
        const firma = buildMessageSignature({
            nombre_completo: 'Administrador Sistema',
            titulo_profesional: 'Tnlgo. Análisis y Desarrollo de Software',
            rol: 'administrador'
        })

        expect(firma).toBe('Administrador Sistema\nTnlgo. Análisis y Desarrollo de Software')
    })

    it.each(['estudiante', 'padre'])(
        'no genera firma para el rol %s',
        (rol) => {
            expect(
                buildMessageSignature({
                    nombre_completo: 'Ximena Patricia Ávila Díaz',
                    titulo_profesional: 'Lic. Ciencias Naturales',
                    rol
                })
            ).toBeNull()
        }
    )

    it('devuelve solo el nombre cuando no hay titulo profesional', () => {
        const firma = buildMessageSignature({
            nombre_completo: 'Ximena Patricia Ávila Díaz',
            titulo_profesional: null,
            rol: 'docente'
        })

        expect(firma).toBe('Ximena Patricia Ávila Díaz')
    })

    it('normaliza espacios sobrantes en nombre y titulo', () => {
        const firma = buildMessageSignature({
            nombre_completo: '  Ximena   Patricia Ávila Díaz  ',
            titulo_profesional: '  Lic. Ciencias   Naturales  ',
            rol: 'docente'
        })

        expect(firma).toBe('Ximena Patricia Ávila Díaz\nLic. Ciencias Naturales')
    })

    it('colapsa saltos de linea internos para no romper el formato de dos lineas', () => {
        const firma = buildMessageSignature({
            nombre_completo: 'Ximena Ávila',
            titulo_profesional: 'Lic.\nCiencias Naturales',
            rol: 'docente'
        })

        expect(firma).toBe('Ximena Ávila\nLic. Ciencias Naturales')
    })

    it('devuelve null cuando el nombre esta vacio', () => {
        expect(
            buildMessageSignature({
                nombre_completo: '   ',
                titulo_profesional: 'Lic. Ciencias Naturales',
                rol: 'docente'
            })
        ).toBeNull()
    })

    it('devuelve null cuando no hay perfil', () => {
        expect(buildMessageSignature(null)).toBeNull()
        expect(buildMessageSignature(undefined)).toBeNull()
    })

    it('expone exactamente los roles con firma', () => {
        expect(SIGNATURE_ROLES).toEqual(['docente', 'administrativo', 'administrador'])
    })
})
