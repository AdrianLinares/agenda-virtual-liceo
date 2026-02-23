// Tipos para la calculadora de notas

/**
 * Categorías de evaluación
 * A: Actitudinal
 * P: Procedimental
 * C: Cognitiva
 */
export type GradeCategory = 'A' | 'P' | 'C';

/**
 * Cantidad de notas por categoría
 */
export type GradeCounts = {
    [key in GradeCategory]: number;
};

/**
 * Pesos (porcentajes) por categoría
 */
export type CategoryWeights = {
    [key in GradeCategory]: number;
};

/**
 * Resultados calculados del periodo
 */
export interface GradeResults {
    averages: { [key in GradeCategory]: number };
    weighted: { [key in GradeCategory]: number };
    final: number;
    total: number;
}

/**
 * Mapeo de nombres de categorías
 */
export const categoryLabels: { [key in GradeCategory]: string } = {
    A: 'Actitudinal',
    P: 'Procedimental',
    C: 'Cognitiva',
};

/**
 * Notas agrupadas por categoría
 */
export type GradesData = {
    [key in GradeCategory]: number[];
};
