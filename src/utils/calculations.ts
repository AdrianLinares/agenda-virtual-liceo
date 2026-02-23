import type {
    GradeCategory,
    CategoryWeights,
    GradeResults,
    GradesData,
} from '../types/grades';

/**
 * Calcula el promedio de un array de notas
 */
export function calculateAverage(grades: number[]): number {
    const validGrades = grades.filter((g) => g !== null && g !== undefined && !isNaN(g));
    if (validGrades.length === 0) return 0;

    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    return Math.round((sum / validGrades.length) * 100) / 100;
}

/**
 * Calcula el valor ponderado de un promedio
 */
export function calculateWeighted(average: number, weight: number): number {
    return Math.round(average * (weight / 100) * 100) / 100;
}

/**
 * Calcula todos los resultados: promedios, ponderaciones y nota final
 */
export function calculateResults(
    grades: GradesData,
    weights: CategoryWeights
): GradeResults {
    const categories: GradeCategory[] = ['A', 'P', 'C'];

    const averages: Record<GradeCategory, number> = {
        A: 0,
        P: 0,
        C: 0,
    };

    const weighted: Record<GradeCategory, number> = {
        A: 0,
        P: 0,
        C: 0,
    };

    let final = 0;

    categories.forEach((category) => {
        const avg = calculateAverage(grades[category]);
        const weightedValue = calculateWeighted(avg, weights[category]);

        averages[category] = avg;
        weighted[category] = weightedValue;
        final += weightedValue;
    });

    final = Math.round(final * 100) / 100;

    return {
        averages,
        weighted,
        final,
        total: final,
    };
}
