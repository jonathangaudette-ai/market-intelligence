'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onRemove: () => void;
  error?: string;
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  onRemove,
  error,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  });

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded">
              <File className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'p-3 rounded-full',
              isDragActive ? 'bg-blue-100' : 'bg-gray-100'
            )}
          >
            <Upload
              className={cn(
                'h-8 w-8',
                isDragActive ? 'text-blue-600' : 'text-gray-600'
              )}
            />
          </div>
          <div>
            <p className="text-base font-medium text-gray-900">
              {isDragActive ? 'Drop the file here' : 'Drag & drop file here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or{' '}
              <span className="text-blue-600 hover:text-blue-700 font-medium">
                click to browse
              </span>
            </p>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            <p>Supported formats: PDF, DOCX, XLSX</p>
            <p>Maximum file size: 50MB</p>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
