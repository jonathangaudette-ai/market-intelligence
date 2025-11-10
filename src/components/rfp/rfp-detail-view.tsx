'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Calendar, Building2, DollarSign, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RFP {
  id: string;
  title: string;
  clientName: string;
  clientIndustry?: string;
  status: string;
  parsingStatus: string;
  submissionDeadline?: string;
  estimatedDealValue?: number;
  originalFilename?: string;
  createdAt: string;
  questions?: Array<{
    id: string;
    questionText: string;
    sectionTitle?: string;
    questionNumber?: string;
    status: string;
  }>;
}

interface RFPDetailViewProps {
  rfpId: string;
}

export function RFPDetailView({ rfpId }: RFPDetailViewProps) {
  const router = useRouter();
  const [rfp, setRfp] = useState<RFP | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRFP();
  }, [rfpId]);

  async function fetchRFP() {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/rfp/rfps/${rfpId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch RFP');
      }

      const data = await response.json();
      setRfp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFP');
    } finally {
      setLoading(false);
    }
  }

  async function startParsing() {
    try {
      setParsing(true);
      setError(null);

      const response = await fetch(`/api/v1/rfp/rfps/${rfpId}/parse`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start parsing');
      }

      // Refresh RFP data
      await fetchRFP();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start parsing');
    } finally {
      setParsing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !rfp) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!rfp) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>RFP not found</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending: 'outline',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{rfp.title}</h1>
          <p className="mt-2 text-gray-600">
            Created on {new Date(rfp.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(rfp.status)}
          {getStatusBadge(rfp.parsingStatus)}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* RFP Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Client Name</p>
                <p className="font-medium">{rfp.clientName}</p>
              </div>
            </div>
            {rfp.clientIndustry && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Industry</p>
                  <p className="font-medium">{rfp.clientIndustry}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RFP Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rfp.originalFilename && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Document</p>
                  <p className="font-medium text-sm truncate">{rfp.originalFilename}</p>
                </div>
              </div>
            )}
            {rfp.submissionDeadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Submission Deadline</p>
                  <p className="font-medium">
                    {new Date(rfp.submissionDeadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {rfp.estimatedDealValue && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Estimated Deal Value</p>
                  <p className="font-medium">
                    ${rfp.estimatedDealValue.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parsing Status */}
      {rfp.parsingStatus === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Document Parsing</CardTitle>
            <CardDescription>
              Parse the RFP document to extract questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={startParsing}
              disabled={parsing}
              className="w-full sm:w-auto"
            >
              {parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Start Parsing'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {rfp.parsingStatus === 'processing' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Parsing in progress... This may take a few minutes.
          </AlertDescription>
        </Alert>
      )}

      {/* Questions List */}
      {rfp.questions && rfp.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions ({rfp.questions.length})</CardTitle>
            <CardDescription>
              Extracted questions from the RFP document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rfp.questions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {question.sectionTitle && (
                        <p className="text-sm text-gray-500 mb-1">
                          {question.sectionTitle}
                        </p>
                      )}
                      <p className="font-medium">
                        {question.questionNumber && (
                          <span className="text-gray-500 mr-2">
                            {question.questionNumber}
                          </span>
                        )}
                        {question.questionText}
                      </p>
                    </div>
                    {getStatusBadge(question.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
