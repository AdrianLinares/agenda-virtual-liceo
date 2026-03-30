import { useState, useEffect } from 'react';
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

interface GradeCalculatorProps {
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

export function GradeCalculator({
    initialGrades,
    initialWeights,
    initialRubrics,
    onResultsChange,
}: GradeCalculatorProps) {

    // Función de ayuda para lectura segura
    const getSavedItem = (key: string, defaultValue: any) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
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

    const [rubricDescriptions, setRubricDescriptions] = useState<Record<string, string[]>>(() =>
        getSavedItem('gradeCalculatorDescriptions', { A: [], P: [], C: [] })
    );

    const [grades, setGrades] = useState<GradesData>(
        initialGrades || {
            A: [],
            P: [],
            C: [],
        }
    );

    // rubrics se mantiene para compatibilidad, pero se usará rubricDescriptions para las descripciones
    const [rubrics, setRubrics] = useState<RubricsData>(
        initialRubrics || {
            A: [],
            P: [],
            C: [],
        }
    );
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

    // Recalcular cuando cambien las notas o los pesos
    useEffect(() => {
        const newResults = calculateResults(grades, weights);
        setResults(newResults);
        onResultsChange?.(newResults, grades, rubrics, weights);
    }, [grades, weights, rubrics, onResultsChange]);

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

        setRubrics((prev) => {
            const newRubrics = [...prev[category]];
            if (count < newRubrics.length) {
                return { ...prev, [category]: newRubrics.slice(0, count) };
            }
            return prev;
        });
    };

    const handleWeightChange = (category: GradeCategory, weight: number) => {
        setWeights((prev) => ({ ...prev, [category]: weight }));
    };

    const handleGradeChange = (
        category: GradeCategory,
        index: number,
        value: number
    ) => {
        setGrades((prev) => {
            const newGrades = [...prev[category]];
            newGrades[index] = value;
            return { ...prev, [category]: newGrades };
        });
    };

    const handleReset = () => {
        setGrades({
            A: [],
            P: [],
            C: [],
        });

        setRubrics({
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
        setRubricDescriptions((prev) => {
            const newArr = [...(prev[category] || [])];
            newArr[index] = description;
            return { ...prev, [category]: newArr };
        });
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
                onCountChange={handleCountChange}
                onWeightChange={handleWeightChange}
            />

            <GradeTable
                gradeCounts={gradeCounts}
                grades={grades}
                rubrics={rubricDescriptions}
                onGradeChange={handleGradeChange}
                onRubricChange={handleRubricDescriptionChange}
            />

            <ResultsSection results={results} weights={weights} />
        </div>
    );
}
