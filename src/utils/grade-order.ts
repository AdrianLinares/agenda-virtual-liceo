const GRADE_ORDER = [
    'pre-jardin',
    'jardin',
    'transicion',
    'primero',
    'segundo',
    'tercero',
    'cuarto',
    'quinto',
    'sexto',
    'septimo',
    'octavo',
    'noveno',
    'decimo',
    'once'
]

const normalizeGradeName = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

const getGradeOrderIndex = (gradeName?: string | null) => {
    if (!gradeName) return Number.MAX_SAFE_INTEGER

    const normalized = normalizeGradeName(gradeName)
    const index = GRADE_ORDER.findIndex((name) => normalized === name)

    return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

export const sortByGradeAndGroupName = <T>(
    items: T[],
    getGradeName: (item: T) => string | null | undefined,
    getGroupName: (item: T) => string
) => {
    return [...items].sort((a, b) => {
        const orderA = getGradeOrderIndex(getGradeName(a))
        const orderB = getGradeOrderIndex(getGradeName(b))

        if (orderA !== orderB) return orderA - orderB

        const gradeA = getGradeName(a) ?? ''
        const gradeB = getGradeName(b) ?? ''
        const gradeComparison = gradeA.localeCompare(gradeB)
        if (gradeComparison !== 0) return gradeComparison

        return getGroupName(a).localeCompare(getGroupName(b))
    })
}
