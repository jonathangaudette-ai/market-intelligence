'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  History,
  ChevronRight,
  RotateCcw,
  Clock,
  User,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ResponseVersion {
  id: string;
  version: number;
  responseText: string;
  responseHtml: string | null;
  wordCount: number | null;
  wasAiGenerated: boolean;
  aiModel: string | null;
  status: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface ResponseVersionHistoryProps {
  questionId: string;
  slug: string;
  rfpId: string;
  currentVersionId?: string;
  onVersionRestored?: () => void;
}

export function ResponseVersionHistory({
  questionId,
  slug,
  rfpId,
  currentVersionId,
  onVersionRestored,
}: ResponseVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<ResponseVersion | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{
    versions: ResponseVersion[];
  }>(
    `/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/versions`,
    fetcher
  );

  const handleRestoreVersion = async (version: ResponseVersion) => {
    setIsRestoring(true);
    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responseText: version.responseText,
            responseHtml: version.responseHtml,
            wordCount: version.wordCount,
            restoreFromVersion: version.version,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      toast.success(`Version ${version.version} restaurée avec succès`);
      setIsRestoreDialogOpen(false);
      mutate();
      onVersionRestored?.();
    } catch (error) {
      console.error('[Restore Version Error]', error);
      toast.error('Erreur lors de la restauration de la version');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Erreur lors du chargement de l'historique
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucune version disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </CardTitle>
          <CardDescription>
            {data.versions.length} version{data.versions.length > 1 ? 's' : ''} disponible{data.versions.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.versions.map((version, index) => {
              const isLatest = index === 0;
              const isCurrent = version.id === currentVersionId;

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg p-3 ${
                    isCurrent ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={isLatest ? 'default' : 'outline'}>
                          Version {version.version}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Actuelle
                          </Badge>
                        )}
                        {version.wasAiGenerated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            IA
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{version.createdBy.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(version.createdAt), 'PPp', { locale: fr })}
                          </span>
                        </div>
                        {version.wordCount && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span>{version.wordCount} mots</span>
                          </div>
                        )}
                      </div>

                      {/* Preview */}
                      <div className="mt-2 text-xs text-gray-600 line-clamp-2 bg-muted/30 rounded p-2">
                        {version.responseText.substring(0, 150)}...
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVersion(version)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      {!isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            setIsRestoreDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Version Detail Dialog */}
      <Dialog
        open={selectedVersion !== null && !isRestoreDialogOpen}
        onOpenChange={(open) => !open && setSelectedVersion(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {selectedVersion?.version}</DialogTitle>
            <DialogDescription>
              Créée par {selectedVersion?.createdBy.name} le{' '}
              {selectedVersion &&
                format(new Date(selectedVersion.createdAt), 'PPp', { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {selectedVersion.wasAiGenerated && (
                  <Badge variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Généré par IA {selectedVersion.aiModel && `(${selectedVersion.aiModel})`}
                  </Badge>
                )}
                <Badge variant="outline">{selectedVersion.wordCount} mots</Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedVersion.status}
                </Badge>
              </div>

              <hr className="my-4 border-gray-200" />

              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                  {selectedVersion.responseText}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedVersion && selectedVersion.id !== currentVersionId && (
              <Button
                onClick={() => {
                  setIsRestoreDialogOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer cette version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer la version {selectedVersion?.version}?</DialogTitle>
            <DialogDescription>
              Cette action créera une nouvelle version basée sur la version {selectedVersion?.version}.
              Votre version actuelle ne sera pas supprimée.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRestoreDialogOpen(false)}
              disabled={isRestoring}
            >
              Annuler
            </Button>
            <Button
              onClick={() => selectedVersion && handleRestoreVersion(selectedVersion)}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Restauration...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
