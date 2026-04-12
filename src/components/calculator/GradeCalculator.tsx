import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RotateCcw } from 'lucide-react';
import type {
    GradeCategory,
    GradeCounts,
    CategoryWeights,
    GradesData,
    GradeResults,
    RubricsData,
} from '../../types/grades';
import { calculateResults } from '../../utils/calculations';
import { GradeInput } from './GradeInput';
import { GradeTable } from './GradeTable';
import { ResultsSection } from './ResultsSection';
import { Button } from '../ui/button';

type SavedCalculatorValue = GradesData | CategoryWeights | GradeCounts | RubricsData

export interface GradeCalculatorProps {
    initialGrades?: GradesData;
    initialWeights?: CategoryWeights;
    initialRubrics?: RubricsData;
    onResultsChange?: (
        results: GradeResults,
        grades: GradesData,
        rubrics: RubricsData,
        weights: CategoryWeights
    ) => void;
}

export interface GradeCalculatorRef {
    getLatestData: () => {
        results: GradeResults;
        grades: GradesData;
        rubrics: RubricsData;
        weights: CategoryWeights;
    };
}

export const GradeCalculator = forwardRef<GradeCalculatorRef, GradeCalculatorProps>(({
    initialGrades,
    initialWeights,
    initialRubrics,
    onResultsChange,
}: GradeCalculatorProps, ref) => {

    // Función auxiliar: leer y parsear desde localStorage sin romper el flujo si falla
    const getSavedItem = <T extends SavedCalculatorValue>(key: string, defaultValue: T): T => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) as T : defaultValue;
        } catch (e) {
            console.error("Error loading " + key, e);
            return defaultValue;
        }
    };

    const [weights, setWeights] = useState<CategoryWeights>(() =>
        initialWeights || getSavedItem('gradeCalculatorWeights', { A: 10, P: 40, C: 50 })
    );

    const [gradeCounts, setGradeCounts] = useState<GradeCounts>(() => {
        if (initialGrades) return {
            A: initialGrades.A?.length || 3,
            P: initialGrades.P?.length || 3,
            C: initialGrades.C?.length || 3
        };
        return getSavedItem('gradeCalculatorCounts', { A: 3, P: 3, C: 3 });
    });

    // Prefer initialRubrics when provided (editing an existing nota). Otherwise
    // fall back to the saved descriptions in localStorage.
    const [rubricDescriptions, setRubricDescriptions] = useState<RubricsData>(() =>
        initialRubrics || getSavedItem('gradeCalculatorDescriptions', { A: [], P: [], C: [] })
    );

    const [grades, setGrades] = useState<GradesData>(
        initialGrades || {
            A: [],
            P: [],
            C: [],
        }
    );

    // Exponer una API imperativa para que el padre pueda solicitar el estado más reciente
    // en el momento del guardado y evitar condiciones de carrera.
    useImperativeHandle(ref, () => ({
        getLatestData: () => {
            const currentResults = calculateResults(grades, weights)
            // Nota: las descripciones activas se mantienen en `rubricDescriptions`.
            return {
                results: currentResults,
                grades,
                rubrics: rubricDescriptions,
                weights,
            }
        }
    }))
    useEffect(() => {
        if (!initialWeights) localStorage.setItem('gradeCalculatorWeights', JSON.stringify(weights));
    }, [weights, initialWeights]);

    useEffect(() => {
        if (!initialGrades) {
            localStorage.setItem('gradeCalculatorCounts', JSON.stringify(gradeCounts));
            localStorage.setItem('gradeCalculatorDescriptions', JSON.stringify(rubricDescriptions));
        }
    }, [gradeCounts, rubricDescriptions, initialGrades]);

    const [results, setResults] = useState<GradeResults>({
        averages: { A: 0, P: 0, C: 0 },
        weighted: { A: 0, P: 0, C: 0 },
        final: 0,
        total: 0,
    });

    // Recalcular cuando cambien las notas, pesos o las descripciones de la rúbrica
    useEffect(() => {
        const newResults = calculateResults(grades, weights);
        console.log('[diag-calc] useEffect recalculated results', newResults)
        setResults(newResults);
        // Exportar las descripciones activas (rubricDescriptions) en lugar de la
        // variable de compatibilidad `rubrics` para evitar inconsistencias cuando
        // el padre provee `initialRubrics`.
        onResultsChange?.(newResults, grades, rubricDescriptions, weights);
    }, [grades, weights, rubricDescriptions, onResultsChange]);

    const handleCountChange = (category: GradeCategory, count: number) => {
        setGradeCounts((prev) => ({ ...prev, [category]: count }));

        // Ajustar el array de notas si se reduce la cantidad
        setGrades((prev) => {
            const newGrades = [...prev[category]];
            if (count < newGrades.length) {
                return { ...prev, [category]: newGrades.slice(0, count) };
            }
            return prev;
        });

    };

    const handleWeightChange = (category: GradeCategory, weight: number) => {
        const newWeights = { ...weights, [category]: weight };
        setWeights(newWeights);
        // Recalculate immediately and notify parent so callers that read synchronously
        // (like a save handler) receive updated results.
        const newResults = calculateResults(grades, newWeights);
        onResultsChange?.(newResults, grades, rubricDescriptions, newWeights);
    };

    const handleGradeChange = (
        category: GradeCategory,
        index: number,
        value: number
    ) => {
        console.log('[diag-calc] GradeCalculator.handleGradeChange', { category, index, value })
        // Build the new grades object synchronously so we can compute results
        const newGradesForCategory = [...grades[category]];
        newGradesForCategory[index] = value;
        const newGrades = { ...grades, [category]: newGradesForCategory };
        setGrades(newGrades);
        // Notify parent immediately with computed results to avoid races when the
        // parent reads the calculator state right after a user input and save.
        const newResults = calculateResults(newGrades, weights);
        console.log('[diag-calc] GradeCalculator computed newResults', newResults)
        onResultsChange?.(newResults, newGrades, rubricDescriptions, weights);
    };

    const handleReset = () => {
        setGrades({
            A: [],
            P: [],
            C: [],
        });

        setRubricDescriptions({
            A: [],
            P: [],
            C: [],
        });
    };

    const handleRubricDescriptionChange = (
        category: GradeCategory,
        index: number,
        description: string
    ) => {
        const newArr = [...(rubricDescriptions[category] || [])];
        newArr[index] = description;
        const newRubrics = { ...rubricDescriptions, [category]: newArr };
        setRubricDescriptions(newRubrics);
        // Rubrics don't affect numeric results, but parent expects updated rubrics
        // along with the latest results object.
        onResultsChange?.(results, grades, newRubrics, weights);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Calculadora de Notas</h2>
                <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reiniciar
                </Button>
            </div>

            <GradeInput
                gradeCounts={gradeCounts}
                weights={weights}
                onCountChange={(category, count) => {
                    console.log('[diag-calc] GradeInput onCountChange wrapper', { category, count })
                    handleCountChange(category, count)
                }}
                onWeightChange={(category, weight) => {
                    console.log('[diag-calc] GradeInput onWeightChange wrapper', { category, weight })
                    handleWeightChange(category, weight)
                }}
            />

            <GradeTable
                gradeCounts={gradeCounts}
                grades={grades}
                rubrics={rubricDescriptions}
                onGradeChange={(category, index, value) => {
                    console.log('[diag-calc] GradeTable onGradeChange wrapper', { category, index, value })
                    handleGradeChange(category, index, value)
                }}
                onRubricChange={(category, index, desc) => {
                    console.log('[diag-calc] GradeTable onRubricChange wrapper', { category, index, desc })
                    handleRubricDescriptionChange(category, index, desc)
                }}
            />

            <ResultsSection results={results} weights={weights} />
        </div>
    );
});
