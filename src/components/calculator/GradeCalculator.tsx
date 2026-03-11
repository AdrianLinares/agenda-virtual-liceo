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
        rubrics: RubricsData
    ) => void;
}

export function GradeCalculator({
    initialGrades,
    initialWeights,
    initialRubrics,
    onResultsChange,
}: GradeCalculatorProps) {
    const getInitialCount = (category: GradeCategory) => {
        if (!initialGrades) return 3;
        const count = initialGrades[category]?.length ?? 0;
        return Math.max(1, count);
    };

    const [gradeCounts, setGradeCounts] = useState<GradeCounts>({
        A: getInitialCount('A'),
        P: getInitialCount('P'),
        C: getInitialCount('C'),
    });

    const [weights, setWeights] = useState<CategoryWeights>(
        initialWeights || {
            A: 10,
            P: 40,
            C: 50,
        }
    );

    const [grades, setGrades] = useState<GradesData>(
        initialGrades || {
            A: [],
            P: [],
            C: [],
        }
    );

    const [rubrics, setRubrics] = useState<RubricsData>(
        initialRubrics || {
            A: [],
            P: [],
            C: [],
        }
    );

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
        onResultsChange?.(newResults, grades, rubrics);
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

    const handleRubricChange = (
        category: GradeCategory,
        index: number,
        description: string
    ) => {
        setRubrics((prev) => {
            const newRubrics = [...prev[category]];
            newRubrics[index] = description;
            return { ...prev, [category]: newRubrics };
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
                rubrics={rubrics}
                onGradeChange={handleGradeChange}
                onRubricChange={handleRubricChange}
            />

            <ResultsSection results={results} weights={weights} />
        </div>
    );
}
