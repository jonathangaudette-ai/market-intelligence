'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from './file-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, StepContent, type Step, type StepStatus } from '@/components/ui/stepper';
import { Loader2, FileText, Settings, CheckCircle } from 'lucide-react';

const STEPS: Step[] = [
  { id: 'files', label: 'Fichiers' },
  { id: 'metadata', label: 'Métadonnées' },
  { id: 'processing', label: 'Traitement' },
];

export function HistoricalImportForm({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    files: 'in_progress',
    metadata: 'pending',
    processing: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('');

  // Files
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [responseFile, setResponseFile] = useState<File | null>(null);

  // Metadata
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientIndustry: '',
    submittedAt: '',
    result: 'won' as 'won' | 'lost' | 'pending',
    qualityScore: '80',
    dealValue: '',
  });

  // Extract slug from params
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  const handleNextStep = () => {
    // Validate current step
    if (currentStep === 0) {
      if (!rfpFile || !responseFile) {
        setError('Les deux fichiers PDF sont requis');
        return;
      }
      setStepStatuses({
        files: 'completed',
        metadata: 'in_progress',
        processing: 'pending',
      });
      setError(null);
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!formData.title || !formData.clientName) {
        setError('Le titre et le nom du client sont requis');
        return;
      }
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
      setStepStatuses({
        files: currentStep === 1 ? 'in_progress' : 'completed',
        metadata: 'pending',
        processing: 'pending',
      });
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate slug is loaded
    if (!slug) {
      setError('Contexte de l\'entreprise non chargé. Veuillez attendre un moment et réessayer.');
      return;
    }

    if (!rfpFile || !responseFile) {
      setError('Les deux fichiers sont requis');
      return;
    }

    if (!formData.title || !formData.clientName) {
      setError('Le titre et le nom du client sont requis');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(2);
    setStepStatuses({
      files: 'completed',
      metadata: 'completed',
      processing: 'in_progress',
    });

    try {
      // Debug logging
      console.log('[Historical Import] Starting import with slug:', slug);

      setProcessingProgress('Téléversement des fichiers...');

      const formDataToSend = new FormData();
      formDataToSend.append('rfpPdf', rfpFile);
      formDataToSend.append('responsePdf', responseFile);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('clientName', formData.clientName);
      formDataToSend.append('result', formData.result);
      formDataToSend.append('qualityScore', formData.qualityScore);

      if (formData.clientIndustry) {
        formDataToSend.append('clientIndustry', formData.clientIndustry);
      }
      if (formData.submittedAt) {
        formDataToSend.append('submittedAt', formData.submittedAt);
      }
      if (formData.dealValue) {
        formDataToSend.append('dealValue', formData.dealValue);
      }

      setProcessingProgress('Extraction du texte des PDFs...');

      const response = await fetch(`/api/companies/${slug}/rfps/import-historical`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || 'Échec de l\'importation du RFP historique');
        throw new Error(errorMessage);
      }

      setProcessingProgress('Import réussi!');
      setStepStatuses({
        files: 'completed',
        metadata: 'completed',
        processing: 'completed',
      });

      console.log('[Historical Import] Success:', data);

      // Wait a bit to show success state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to RFP detail page
      router.push(`/companies/${slug}/rfps/${data.rfpId}`);
    } catch (err) {
      console.error('[Historical Import] Error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStepStatuses({
        files: 'completed',
        metadata: 'completed',
        processing: 'failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} stepStatuses={stepStatuses} />

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Step 1: Files */}
      {currentStep === 0 && (
        <StepContent
          currentStep={0}
          totalSteps={STEPS.length}
          title="Téléverser les documents"
          description="Sélectionnez le PDF du RFP original et le PDF de votre réponse soumise"
          icon={<FileText className="h-8 w-8 text-teal-600" />}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document RFP (PDF) <span className="text-red-500">*</span>
              </label>
              <FileDropzone
                selectedFile={rfpFile}
                onFileSelect={setRfpFile}
                onRemove={() => setRfpFile(null)}
                error={rfpFile === null && error ? 'Fichier RFP requis' : undefined}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document de réponse (PDF) <span className="text-red-500">*</span>
              </label>
              <FileDropzone
                selectedFile={responseFile}
                onFileSelect={setResponseFile}
                onRemove={() => setResponseFile(null)}
                error={responseFile === null && error ? 'Fichier de réponse requis' : undefined}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={!rfpFile || !responseFile}
              >
                Suivant
              </Button>
            </div>
          </div>
        </StepContent>
      )}

      {/* Step 2: Metadata */}
      {currentStep === 1 && (
        <StepContent
          currentStep={1}
          totalSteps={STEPS.length}
          title="Informations sur le RFP"
          description="Fournissez les métadonnées pour améliorer la qualité de la correspondance"
          icon={<Settings className="h-8 w-8 text-teal-600" />}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titre du RFP <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ex: Plateforme SaaS Entreprise"
                required
              />
            </div>

            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom du client <span className="text-red-500">*</span>
              </label>
              <Input
                id="clientName"
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="ex: Corporation Acme"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientIndustry" className="block text-sm font-medium text-gray-700 mb-2">
                  Industrie
                </label>
                <Input
                  id="clientIndustry"
                  type="text"
                  value={formData.clientIndustry}
                  onChange={(e) => setFormData({ ...formData, clientIndustry: e.target.value })}
                  placeholder="ex: Services financiers"
                />
              </div>

              <div>
                <label htmlFor="submittedAt" className="block text-sm font-medium text-gray-700 mb-2">
                  Date de soumission
                </label>
                <Input
                  id="submittedAt"
                  type="date"
                  value={formData.submittedAt}
                  onChange={(e) => setFormData({ ...formData, submittedAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="result" className="block text-sm font-medium text-gray-700 mb-2">
                  Résultat
                </label>
                <select
                  id="result"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value as 'won' | 'lost' | 'pending' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="won">Gagné</option>
                  <option value="lost">Perdu</option>
                  <option value="pending">En attente</option>
                </select>
              </div>

              <div>
                <label htmlFor="qualityScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Score de qualité (0-100)
                </label>
                <Input
                  id="qualityScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.qualityScore}
                  onChange={(e) => setFormData({ ...formData, qualityScore: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dealValue" className="block text-sm font-medium text-gray-700 mb-2">
                Valeur de la transaction ($)
              </label>
              <Input
                id="dealValue"
                type="number"
                value={formData.dealValue}
                onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                placeholder="ex: 500000"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting || !formData.title || !formData.clientName}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  'Importer le RFP'
                )}
              </Button>
            </div>
          </div>
        </StepContent>
      )}

      {/* Step 3: Processing */}
      {currentStep === 2 && (
        <StepContent
          currentStep={2}
          totalSteps={STEPS.length}
          title="Traitement en cours"
          description={processingProgress}
          icon={stepStatuses.processing === 'completed' ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          )}
        >
          <div className="space-y-4">
            {stepStatuses.processing === 'in_progress' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-gray-600">
                  L'IA analyse vos documents et fait correspondre les questions aux réponses...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Cela peut prendre quelques minutes selon la taille des documents.
                </p>
              </div>
            )}

            {stepStatuses.processing === 'completed' && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-green-600 font-medium">
                  Import réussi!
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Redirection vers le RFP...
                </p>
              </div>
            )}

            {stepStatuses.processing === 'failed' && (
              <div className="text-center py-8">
                <p className="text-red-600 font-medium">
                  Une erreur est survenue lors du traitement
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setStepStatuses({
                      files: 'completed',
                      metadata: 'in_progress',
                      processing: 'pending',
                    });
                    setError(null);
                  }}
                  className="mt-4"
                  variant="outline"
                >
                  Retour aux métadonnées
                </Button>
              </div>
            )}
          </div>
        </StepContent>
      )}
    </div>
  );
}
