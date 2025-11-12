'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RiskChartProps {
  riskChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function RiskDistributionChart({ riskChartData }: RiskChartProps) {
  if (riskChartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribution des Risques
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={riskChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {riskChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface EvaluationChartProps {
  evaluationChartData: Array<{
    name: string;
    points: number;
    weight: number;
  }>;
  totalPoints?: number;
}

export function EvaluationCriteriaChart({ evaluationChartData, totalPoints }: EvaluationChartProps) {
  if (evaluationChartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Critères d'Évaluation {totalPoints ? `(${totalPoints} points)` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={evaluationChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" label={{ value: 'Points', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" label={{ value: 'Poids (%)', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="points" fill="#3b82f6" name="Points max" />
            <Bar yAxisId="right" dataKey="weight" fill="#10b981" name="Poids (%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
