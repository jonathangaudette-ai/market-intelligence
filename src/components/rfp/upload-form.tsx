'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from './file-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function RFPUploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientIndustry: '',
    submissionDeadline: '',
    estimatedDealValue: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.title || !formData.clientName) {
      setError('Title and client name are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('clientName', formData.clientName);
      if (formData.clientIndustry) {
        formDataToSend.append('clientIndustry', formData.clientIndustry);
      }
      if (formData.submissionDeadline) {
        formDataToSend.append('submissionDeadline', formData.submissionDeadline);
      }
      if (formData.estimatedDealValue) {
        formDataToSend.append('estimatedDealValue', formData.estimatedDealValue);
      }

      const response = await fetch('/api/v1/rfp/rfps', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || 'Failed to upload RFP');
        throw new Error(errorMessage);
      }

      // Redirect to RFP detail page
      router.push(`/dashboard/rfps/${data.rfp.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>RFP Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              RFP Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Enterprise SaaS Platform RFP"
              required
            />
          </div>

          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="clientName"
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="e.g., Acme Corporation"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientIndustry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <Input
                id="clientIndustry"
                type="text"
                value={formData.clientIndustry}
                onChange={(e) => setFormData({ ...formData, clientIndustry: e.target.value })}
                placeholder="e.g., Financial Services"
              />
            </div>

            <div>
              <label htmlFor="estimatedDealValue" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Deal Value ($)
              </label>
              <Input
                id="estimatedDealValue"
                type="number"
                value={formData.estimatedDealValue}
                onChange={(e) => setFormData({ ...formData, estimatedDealValue: e.target.value })}
                placeholder="e.g., 500000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="submissionDeadline" className="block text-sm font-medium text-gray-700 mb-2">
              Submission Deadline
            </label>
            <Input
              id="submissionDeadline"
              type="date"
              value={formData.submissionDeadline}
              onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RFP Document</CardTitle>
        </CardHeader>
        <CardContent>
          <FileDropzone
            selectedFile={file}
            onFileSelect={setFile}
            onRemove={() => setFile(null)}
            error={file === null && error ? 'File is required' : undefined}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload & Parse RFP'
          )}
        </Button>
      </div>
    </form>
  );
}
