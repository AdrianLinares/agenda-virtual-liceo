import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import type {
    GradeCategory,
    GradeCounts,
    CategoryWeights,
    GradesData,
    GradeResults,
} from '../../types/grades';
import { calculateResults } from '../../utils/calculations';
import { GradeInput } from './GradeInput';
import { GradeTable } from './GradeTable';
import { ResultsSection } from './ResultsSection';
import { Button } from '../ui/button';

interface GradeCalculatorProps {
    initialGrades?: GradesData;
    initialWeights?: CategoryWeights;
    onResultsChange?: (results: GradeResults, grades: GradesData) => void;
}

export function GradeCalculator({
    initialGrades,
    initialWeights,
    onResultsChange,
}: GradeCalculatorProps) {
    const [gradeCounts, setGradeCounts] = useState<GradeCounts>({
        A: 3,
        P: 3,
        C: 3,
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
        onResultsChange?.(newResults, grades);
    }, [grades, weights, onResultsChange]);

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
                onGradeChange={handleGradeChange}
            />

            <ResultsSection results={results} weights={weights} />
        </div>
    );
}
