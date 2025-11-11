'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, AlertCircle, Info, Zap } from 'lucide-react';

interface LogEvent {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'progress';
  stage?: string;
  message: string;
  metadata?: Record<string, any>;
}

interface EventTimelineProps {
  logs: LogEvent[];
  maxEvents?: number;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  downloading: <Clock className="h-4 w-4" />,
  parsing: <Zap className="h-4 w-4" />,
  extracting: <Zap className="h-4 w-4" />,
  categorizing: <Zap className="h-4 w-4" />,
  saving: <CheckCircle2 className="h-4 w-4" />,
};

const TYPE_STYLES = {
  info: {
    icon: <Info className="h-4 w-4" />,
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-900',
    iconColor: 'text-teal-600',
    dot: 'bg-teal-400',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    iconColor: 'text-green-600',
    dot: 'bg-green-400',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    iconColor: 'text-red-600',
    dot: 'bg-red-400',
  },
  progress: {
    icon: <Clock className="h-4 w-4" />,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    iconColor: 'text-gray-600',
    dot: 'bg-gray-400',
  },
};

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

function formatRelativeTime(timestamp: string, firstTimestamp: string): string {
  try {
    const current = new Date(timestamp).getTime();
    const first = new Date(firstTimestamp).getTime();
    const diffMs = current - first;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `+${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    const remainingSec = diffSec % 60;
    return `+${diffMin}m${remainingSec}s`;
  } catch {
    return '';
  }
}

export function EventTimeline({ logs, maxEvents = 10 }: EventTimelineProps) {
  // Sort logs by timestamp (most recent first) and limit
  const sortedLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxEvents);
  }, [logs, maxEvents]);

  const firstTimestamp = logs[0]?.timestamp;

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            Historique des Événements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-sm text-gray-500 py-8">
            Aucun événement enregistré
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-600" />
          Historique des Événements
          <span className="text-xs font-normal text-gray-500 ml-auto">
            ({logs.length} événement{logs.length > 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {sortedLogs.map((log, index) => {
            const style = TYPE_STYLES[log.type];
            const isLast = index === sortedLogs.length - 1;

            return (
              <div key={index} className="relative">
                {/* Timeline connector */}
                {!isLast && (
                  <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gray-200" />
                )}

                {/* Event card */}
                <div className={`flex gap-3 ${style.bg} ${style.border} border rounded-lg p-3`}>
                  {/* Icon with dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`${style.iconColor} mt-0.5`}>
                      {log.stage && STAGE_ICONS[log.stage] ? STAGE_ICONS[log.stage] : style.icon}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-2 h-2 ${style.dot} rounded-full border-2 border-white`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium ${style.text}`}>{log.message}</p>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-xs text-gray-500 font-mono">
                          {formatTime(log.timestamp)}
                        </span>
                        {firstTimestamp && (
                          <span className="text-xs text-gray-400 font-mono">
                            {formatRelativeTime(log.timestamp, firstTimestamp)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {log.metadata.batchNumber !== undefined && (
                          <span className="text-xs bg-white/60 px-2 py-0.5 rounded">
                            Batch {log.metadata.batchNumber}/{log.metadata.totalBatches || '?'}
                          </span>
                        )}
                        {log.metadata.questionsFound !== undefined && (
                          <span className="text-xs bg-white/60 px-2 py-0.5 rounded">
                            {log.metadata.questionsFound} questions
                          </span>
                        )}
                        {log.metadata.characterCount !== undefined && (
                          <span className="text-xs bg-white/60 px-2 py-0.5 rounded">
                            {(log.metadata.characterCount / 1000).toFixed(1)}k caractères
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more indicator */}
        {logs.length > maxEvents && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              {logs.length - maxEvents} événement{logs.length - maxEvents > 1 ? 's' : ''} plus ancien
              {logs.length - maxEvents > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
