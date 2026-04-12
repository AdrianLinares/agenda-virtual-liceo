import { AlertCircle } from 'lucide-react';
import type {
    GradeCategory,
    GradeCounts,
    GradesData,
    RubricsData,
} from '../../types/grades';
import { categoryLabels } from '../../types/grades';
import { Input } from '../ui/input';

interface GradeTableProps {
    gradeCounts: GradeCounts;
    grades: GradesData;
    rubrics: RubricsData;
    onGradeChange: (category: GradeCategory, index: number, value: number) => void;
    onRubricChange: (
        category: GradeCategory,
        index: number,
        description: string
    ) => void;
}

export function GradeTable({
    gradeCounts,
    grades,
    rubrics,
    onGradeChange,
    onRubricChange,
}: GradeTableProps) {
    const categories: GradeCategory[] = ['A', 'P', 'C'];

    const isValidGrade = (value: number) => {
        return !isNaN(value) && value >= 0 && value <= 100;
    };

    const handleChange = (
        category: GradeCategory,
        index: number,
        value: string
    ) => {
        // Permitir solo números y punto decimal
        if (!/^\d*\.?\d*$/.test(value)) return;

        const numValue = parseFloat(value);
        console.log('[diag-calc] GradeTable input change:', { category, index, value, numValue });
        onGradeChange(category, index, numValue);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ingreso de notas</h3>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted">
                            <th className="border p-2 text-left font-medium">Categoría</th>
                            {Array.from({ length: Math.max(...categories.map(c => gradeCounts[c])) }, (_, i) => (
                                <th key={i} className="border p-2 text-center font-medium">
                                    N{i + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category}>
                                <td className="border p-2 font-medium bg-muted">
                                    {categoryLabels[category]}
                                </td>
                                {Array.from({ length: gradeCounts[category] }, (_, i) => {
                                    const value = grades[category][i];
                                    const isInvalid = value !== undefined && !isValidGrade(value);

                                    return (
                                        <td key={i} className="border p-2">
                                            <div className="relative">
                                                <Input
                                                    type="text"
                                                    value={value === undefined ? '' : value}
                                                    onChange={(e) =>
                                                        handleChange(category, i, e.target.value)
                                                    }
                                                    className={`w-full text-center ${isInvalid ? 'border-destructive' : ''
                                                        }`}
                                                    placeholder="0-100"
                                                />
                                                {isInvalid && (
                                                    <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                                {/* Rellenar celdas vacías si esta categoría tiene menos notas */}
                                {Array.from(
                                    { length: Math.max(...categories.map(c => gradeCounts[c])) - gradeCounts[category] },
                                    (_, i) => (
                                        <td key={`empty-${i}`} className="border p-2 bg-muted"></td>
                                    )
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <details className="rounded-lg border border-primary/20 bg-muted/30">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-primary">
                    Rubrica
                </summary>
                <div className="space-y-4 border-t border-primary/20 px-4 py-4">
                    {categories.map((category) => (
                        <div key={`rubrica-${category}`} className="rounded-md border bg-background p-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">
                                {categoryLabels[category]}
                            </p>
                            <div className="space-y-2">
                                {Array.from({ length: gradeCounts[category] }, (_, i) => (
                                    <div key={`rubrica-${category}-${i}`} className="grid grid-cols-1 gap-2 md:grid-cols-[64px_1fr] md:items-center">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            N{i + 1}
                                        </span>
                                        <Input
                                            type="text"
                                            value={rubrics[category][i] || ''}
                                            onChange={(e) =>
                                                onRubricChange(category, i, e.target.value)
                                            }
                                            placeholder={`Descripcion de N${i + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </details>
        </div>
    );
}
