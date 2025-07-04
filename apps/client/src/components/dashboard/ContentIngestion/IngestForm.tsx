/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BiTrash } from 'react-icons/bi';
import { FiFile, FiGlobe, FiLoader, FiUpload } from 'react-icons/fi';
import { useSources } from '../../../hooks/useSources';

type IngestFormProps = {
  onContentUploaded: (results: any[]) => void;
  onProcessingStart: () => void;
  onProcessingEnd?: () => void;
  isProcessing: boolean;
};

const IngestForm: React.FC<IngestFormProps> = ({
  onContentUploaded,
  onProcessingStart,
  isProcessing,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [webLinks, setWebLinks] = useState<string>('');
  const [errors, setErrors] = useState<{ file?: string; url?: string }>({});
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');

  const { uploadSources } = useSources(1);

  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedTypes.includes(file.type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter(validateFile);

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    setErrors((prev) => ({
      ...prev,
      file: validFiles.length !== files.length ? 'Only PDF and DOCX files are allowed' : undefined,
    }));

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWebLinks(e.target.value);
    setErrors((prev) => ({ ...prev, url: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      onProcessingStart();

      let results;
      if (uploadType === 'file' && selectedFiles.length > 0) {
        results = await uploadSources({ files: selectedFiles });
      } else if (uploadType === 'url' && webLinks.trim()) {
        const urls = webLinks
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        results = await uploadSources({ urls });
      }

      if (results) {
        const successfulResults = results.filter((r: any) => r.success);
        const failedResults = results.filter((r: any) => !r.success);

        if (successfulResults.length > 0) {
          toast.success(`Successfully processed ${successfulResults.length} source(s)`);
          onContentUploaded(results);
        }

        if (failedResults.length > 0) {
          failedResults.forEach((r: any) => {
            toast.error(`Failed: ${r.error}`);
          });
        }

        setSelectedFiles([]);
        setWebLinks('');
        setErrors({});
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process content. Please try again.');
    } finally {
      onProcessingStart();
    }
  };

  const canSubmit =
    !isProcessing &&
    ((uploadType === 'file' && selectedFiles.length > 0 && !errors.file) ||
      (uploadType === 'url' && webLinks.trim().length > 0 && !errors.url));

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-black mb-3">Content Ingestion</h2>
        <p className="text-neutral-600">
          Upload documents or web content to extract valuable insights for your proposals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div
          className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'file'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => !isProcessing && setUploadType('file')}
        >
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary/10 rounded-xl mr-4">
              <FiFile className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-black">File Upload</h3>
          </div>
          <p className="text-neutral-600 text-sm mb-6">
            Upload PDF or DOCX documents for intelligent content extraction and analysis
          </p>

          {uploadType === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                  disabled={isProcessing}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-neutral-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-neutral-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                </label>
              </div>

              {errors.file && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.file}</p>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">
                    Selected Files ({selectedFiles.length}):
                  </p>
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <span className="text-green-700 text-sm">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          disabled={isProcessing}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <BiTrash className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'url'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => !isProcessing && setUploadType('url')}
        >
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary/10 rounded-xl mr-4">
              <FiGlobe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-black">Web Link</h3>
          </div>
          <p className="text-neutral-600 text-sm mb-6">
            Extract content from web pages, articles, and online resources
          </p>

          {uploadType === 'url' && (
            <div className="space-y-4">
              <textarea
                placeholder="https://example.com/article (one per line or comma separated)"
                value={webLinks}
                onChange={handleUrlChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                rows={4}
                disabled={isProcessing}
              />
              {errors.url && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.url}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-4 px-8 rounded-xl font-semibold transition-all duration-200 ${
            canSubmit
              ? 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <FiLoader className="w-5 h-5 inline mr-3 animate-spin" />
              Processing Content...
            </>
          ) : (
            <>
              <FiUpload className="w-5 h-5 inline mr-3" />
              Process Content
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default IngestForm;
