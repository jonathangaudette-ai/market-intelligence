'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface BatchData {
  batchNumber: number;
  questionsFound: number;
  timestamp: string;
}

interface BatchChartProps {
  logs: Array<{
    timestamp: string;
    type: string;
    stage?: string;
    message: string;
    metadata?: {
      batchNumber?: number;
      questionsFound?: number;
      totalBatches?: number;
    };
  }>;
}

export function BatchChart({ logs }: BatchChartProps) {
  // Extract batch data from logs
  const batchData = useMemo(() => {
    const batches: BatchData[] = [];
    let lastTotal = 0;

    logs
      .filter((log) => log.stage === 'extracting' && log.metadata?.batchNumber)
      .forEach((log) => {
        const batchNumber = log.metadata!.batchNumber!;
        const totalQuestions = log.metadata?.questionsFound || 0;
        const questionsInThisBatch = totalQuestions - lastTotal;

        batches.push({
          batchNumber,
          questionsFound: questionsInThisBatch,
          timestamp: log.timestamp,
        });

        lastTotal = totalQuestions;
      });

    return batches;
  }, [logs]);

  if (batchData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            Questions par Batch GPT-5
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-gray-500">
            En attente de l'extraction par GPT-5...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalQuestions = batchData.reduce((sum, b) => sum + b.questionsFound, 0);
  const maxBatch = Math.max(...batchData.map((b) => b.questionsFound));
  const avgQuestions = (totalQuestions / batchData.length).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-teal-600" />
          Questions par Batch GPT-5
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-teal-100 rounded p-2">
            <p className="text-teal-600 font-medium">{totalQuestions}</p>
            <p className="text-teal-700">Total</p>
          </div>
          <div className="bg-green-50 rounded p-2">
            <p className="text-green-600 font-medium">{maxBatch}</p>
            <p className="text-green-700">Max/batch</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-gray-600 font-medium">{avgQuestions}</p>
            <p className="text-gray-700">Moyenne</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={batchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="batchNumber"
              tick={{ fontSize: 12 }}
              label={{ value: 'Batch #', position: 'insideBottom', offset: -5, fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value} questions`, 'Trouvées']}
              labelFormatter={(label) => `Batch ${label}`}
            />
            <Bar dataKey="questionsFound" radius={[6, 6, 0, 0]}>
              {batchData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.questionsFound === maxBatch ? '#0d9488' : '#5eead4'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-teal-600" />
            <span className="text-gray-600">Batch max</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-teal-300" />
            <span className="text-gray-600">Autres batches</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
