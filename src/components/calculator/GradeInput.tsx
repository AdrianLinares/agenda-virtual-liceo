import { MinusCircle, PlusCircle, Percent } from 'lucide-react';
import type { GradeCategory, GradeCounts, CategoryWeights } from '../../types/grades';
import { categoryLabels } from '../../types/grades';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface GradeInputProps {
    gradeCounts: GradeCounts;
    weights: CategoryWeights;
    onCountChange: (category: GradeCategory, count: number) => void;
    onWeightChange: (category: GradeCategory, weight: number) => void;
}

export function GradeInput({
    gradeCounts,
    weights,
    onCountChange,
    onWeightChange,
}: GradeInputProps) {
    const categories: GradeCategory[] = ['A', 'P', 'C'];
    const totalWeight = weights.A + weights.P + weights.C;

    const handleCountChange = (category: GradeCategory, delta: number) => {
        const newCount = Math.max(1, Math.min(20, gradeCounts[category] + delta));
        onCountChange(category, newCount);
    };

    const handleWeightChange = (category: GradeCategory, value: string) => {
        const numValue = parseFloat(value) || 0;
        const otherCategories = categories.filter((c) => c !== category);
        const otherWeightsSum = otherCategories.reduce(
            (sum, c) => sum + weights[c],
            0
        );

        // Evitar que el total supere 100%
        if (otherWeightsSum + numValue <= 100) {
            onWeightChange(category, numValue);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Configuración de categorías</h3>
                <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-md ${totalWeight > 100
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                >
                    <Percent className="h-4 w-4" />
                    <span className="font-semibold">Total: {totalWeight}%</span>
                </div>
            </div>

            <div className="grid gap-4">
                {categories.map((category) => (
                    <div
                        key={category}
                        className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg"
                    >
                        <div className="flex-1">
                            <label className="font-medium text-sm">
                                {categoryLabels[category]}
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Porcentaje:</span>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={weights[category]}
                                onChange={(e) => handleWeightChange(category, e.target.value)}
                                className="w-20"
                            />
                            <span className="text-sm">%</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Cantidad de notas:</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCountChange(category, -1)}
                                disabled={gradeCounts[category] <= 1}
                            >
                                <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input
                                type="number"
                                min="1"
                                max="20"
                                value={gradeCounts[category]}
                                onChange={(e) =>
                                    onCountChange(category, parseInt(e.target.value) || 1)
                                }
                                className="w-16 text-center"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCountChange(category, 1)}
                                disabled={gradeCounts[category] >= 20}
                            >
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
