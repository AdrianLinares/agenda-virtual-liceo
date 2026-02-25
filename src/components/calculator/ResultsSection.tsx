import type { GradeCategory, GradeResults, CategoryWeights } from '../../types/grades';
import { categoryLabels } from '../../types/grades';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ResultsSectionProps {
    results: GradeResults;
    weights: CategoryWeights;
}

export function ResultsSection({ results, weights }: ResultsSectionProps) {
    const categories: GradeCategory[] = ['A', 'P', 'C'];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resultados</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                    <Card key={category}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                {categoryLabels[category]}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Promedio:</span>
                                <span className="font-semibold">
                                    {results.averages[category].toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Ponderación ({weights[category]}%):
                                </span>
                                <span className="font-semibold">
                                    {results.weighted[category].toFixed(2)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-2 border-primary bg-secondary">
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Nota Final</p>
                            <p className="text-3xl font-bold text-primary">
                                {results.final.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Total</p>
                            <p className="text-2xl font-semibold text-primary">
                                {results.total.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
