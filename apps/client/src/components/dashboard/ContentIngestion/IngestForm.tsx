/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BiTrash } from 'react-icons/bi';
import { FiFile, FiGlobe, FiLoader, FiSearch, FiUpload } from 'react-icons/fi';
import { useSources } from '../../../hooks/useSources';
import { API } from '../../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

type IngestFormProps = {
  onContentUploaded: (results: any[]) => void;
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
  isProcessing: boolean;
};

const IngestForm: React.FC<IngestFormProps> = ({
  onContentUploaded,
  onProcessingStart,
  isProcessing,
  onProcessingEnd,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [webLinks, setWebLinks] = useState<string>('');
  const [errors, setErrors] = useState<{ file?: string; url?: string }>({});
  // Restore all state and logic for existing sources
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [existingSources, setExistingSources] = useState<ContentSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<ContentSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);

  const { uploadSources } = useSources();

  // Fetch existing sources when switching to 'existing' tab
  useEffect(() => {
    if (uploadType === 'existing') {
      fetchExistingSources();
    }
  }, [uploadType]);

  const fetchExistingSources = async () => {
    setLoadingExisting(true);
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.LIST()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setExistingSources(data.sources || []);
      }
    } catch (error) {
      console.error('Error fetching existing sources:', error);
      toast.error('Failed to load existing sources');
    } finally {
      setLoadingExisting(false);
    }
  };

  const fetchSourceContent = async (sourceId: number) => {
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.BY_ID(sourceId)}`,
      );
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          content_source_id: data.source.id,
          chunks: data.chunks,
          images: data.images,
          tables: data.tables,
          filename: data.source.name,
          type: data.source.type,
        };
      }
    } catch (error) {
      console.error('Error fetching source content:', error);
    }
    return null;
  };

  const toggleSourceSelection = (source: ContentSource) => {
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.id === source.id);
      if (exists) {
        return prev.filter((s) => s.id !== source.id);
      } else {
        return [...prev, source];
      }
    });
  };

  const filteredExistingSources = existingSources.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FiFile className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FiFile className="w-4 h-4 text-blue-500" />;
      case 'web':
        return <FiGlobe className="w-4 h-4 text-green-500" />;
      default:
        return <FiFile className="w-4 h-4 text-gray-500" />;
    }
  };

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

      let results: any[] = [];

      if (uploadType === 'file' && selectedFiles.length > 0) {
        results = await uploadSources({ files: selectedFiles });
      } else if (uploadType === 'url' && webLinks.trim()) {
        const urls = webLinks
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        results = await uploadSources({ urls });
      } else if (uploadType === 'existing' && selectedSources.length > 0) {
        results = await Promise.all(
          selectedSources.map(async (source) => {
            const sourceContent = await fetchSourceContent(source.id);
            if (sourceContent) {
              return sourceContent;
            }
            return {
              success: false,
              error: `Failed to fetch content for source ID: ${source.id}`,
            };
          }),
        );
      }

      if (results.length > 0) {
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
        setSelectedSources([]); // Clear selected sources after processing
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process content. Please try again.');
    } finally {
      if (onProcessingEnd) {
        onProcessingEnd();
      }
    }
  };

  const canSubmit =
    !isProcessing &&
    ((uploadType === 'file' && selectedFiles.length > 0 && !errors.file) ||
      (uploadType === 'url' && webLinks.trim().length > 0 && !errors.url));

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-black mb-3">Content Ingestion</h2>
        <p className="text-neutral-600">Upload new documents or web content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
          className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'file'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => !isProcessing && setUploadType('file')}
        >
          <div className="flex items-center mb-4">
            <div className="p-2 bg-primary/10 rounded-lg mr-3">
              <FiFile className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">File Upload</h3>
          </div>
          <p className="text-neutral-600 text-sm">Upload PDF or DOCX documents for extraction</p>
        </div>

        <div
          className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'url'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => !isProcessing && setUploadType('url')}
        >
          <div className="flex items-center mb-4">
            <div className="p-2 bg-primary/10 rounded-lg mr-3">
              <FiGlobe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">Web Link</h3>
          </div>
          <p className="text-neutral-600 text-sm">Extract content from web pages and articles</p>
        </div>
      </div>

      <div className="mb-8">
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
                        <BiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

        {uploadType === 'existing' && (
          <div className="space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search existing sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {loadingExisting ? (
              <div className="text-center py-8">
                <FiLoader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-gray-500">Loading existing sources...</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredExistingSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {existingSources.length === 0
                      ? 'No existing sources found'
                      : 'No sources match your search'}
                  </div>
                ) : (
                  filteredExistingSources.map((source) => (
                    <div
                      key={source.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedSources.find((s) => s.id === source.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSourceSelection(source)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getSourceIcon(source.type)}
                          <div>
                            <h4 className="font-medium text-black">{source.name}</h4>
                            <p className="text-sm text-gray-500">
                              {source.type.toUpperCase()} •{' '}
                              {new Date(source.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!selectedSources.find((s) => s.id === source.id)}
                          onChange={() => toggleSourceSelection(source)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedSources.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        )}
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
