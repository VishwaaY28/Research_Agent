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
  const [uploadType, setUploadType] = useState<'file' | 'url' | 'existing'>('file');
  const [existingSources, setExistingSources] = useState<ContentSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<ContentSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [topics, setTopics] = useState<string>('');
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [approvedUrls, setApprovedUrls] = useState<string[]>([]);
  const [isFindingUrls, setIsFindingUrls] = useState<boolean>(false);

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

  const handleTopicsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopics(e.target.value);
  };

  const handleToggleApprove = (url: string) => {
    setApprovedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
    setWebLinks((prev) => {
      const list = prev
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      const set = new Set(list);
      if (set.has(url)) {
        // unapprove => remove
        set.delete(url);
      } else {
        // approve => add at top
        set.add(url);
      }
      return Array.from(set).join('\n');
    });
  };

  const handleFindUrls = async () => {
    const topicList = topics
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (topicList.length === 0) {
      toast.error('Please enter at least one topic');
      return;
    }

    try {
      setIsFindingUrls(true);
      setDiscoveredUrls([]);
      setApprovedUrls([]);

      const res = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.FIND_URLS()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topics: topicList, limit: 10 }),
        },
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.urls)) {
        setDiscoveredUrls(data.urls);
        toast.success(`Found ${data.urls.length} URLs`);
      } else {
        toast.error(data.error || 'Failed to find URLs');
      }
    } catch (err) {
      console.error('Find URLs error', err);
      toast.error('Failed to find URLs');
    } finally {
      setIsFindingUrls(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      onProcessingStart();

      let results: any[] = [];

      if (uploadType === 'file' && selectedFiles.length > 0) {
        const uploadResponse = await uploadSources({ files: selectedFiles });
        // Convert single response to array for consistency
        results = [uploadResponse];
      } else if (uploadType === 'url' && webLinks.trim()) {
        const urls = webLinks
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        const allUrls = Array.from(new Set([...approvedUrls, ...urls]));
        const uploadResponse = await uploadSources({ urls: allUrls });
        // For URLs, the response might be an array or single object
        results = Array.isArray(uploadResponse) ? uploadResponse : [uploadResponse];
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

      let finalResults: any[] = [];

      if (uploadType === 'file' && results.length > 0) {
        // For file uploads, we need to wait for background processing to create content sources
        const response = results[0]; // File upload returns single response

        if (response.success && response.message === 'Chunking started in background.') {
          // Show processing toast
          toast.loading('Processing content...', { id: 'processing' });

          // Poll for new content sources to be created
          const pollInterval = 10000; // 2 seconds
          const maxPollAttempts = 200; // 2 minutes max

          async function pollForNewSources(attempt = 0): Promise<any[]> {
            try {
              // Get list of all sources to find newly created ones
              const sourcesResponse = await fetch(
                `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.LIST()}`,
              );

              if (!sourcesResponse.ok) {
                throw new Error('Failed to fetch sources');
              }

              const sourcesData = await sourcesResponse.json();
              const sources = sourcesData.sources || [];

              // Find sources that match our uploaded filenames
              const matchingSources = sources.filter(
                (source: any) => response.filenames && response.filenames.includes(source.name),
              );

              if (matchingSources.length > 0) {
                // Found sources, now poll for chunks
                const chunkResults = await Promise.all(
                  matchingSources.map(async (source: any) => {
                    const chunksResponse = await fetch(
                      `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}/${source.id}/chunks`,
                    );
                    if (chunksResponse.ok) {
                      const chunksData = await chunksResponse.json();
                      if (chunksData.success && chunksData.chunks && chunksData.chunks.length > 0) {
                        return {
                          success: true,
                          content_source_id: source.id,
                          chunks: chunksData.chunks,
                          filename: source.name,
                          type: source.type,
                        };
                      }
                    }
                    return null;
                  }),
                );

                const validResults = chunkResults.filter((r) => r !== null);
                if (validResults.length > 0) {
                  return validResults;
                }
              }

              if (attempt < maxPollAttempts) {
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
                return pollForNewSources(attempt + 1);
              } else {
                throw new Error('Processing timed out');
              }
            } catch (error) {
              if (attempt < maxPollAttempts) {
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
                return pollForNewSources(attempt + 1);
              } else {
                throw error;
              }
            }
          }

          try {
            finalResults = await pollForNewSources();
            if (finalResults.length > 0) {
              toast.success('Content processing completed! You can now select chunks.', {
                id: 'processing',
              });
              onContentUploaded(finalResults);
            } else {
              toast.error('Failed to process content. Please try again.', { id: 'processing' });
            }
          } catch (error) {
            console.error('Error polling for new sources:', error);
            toast.error('Processing timed out. Please try again.', { id: 'processing' });
          }
        } else {
          toast.error('Failed to start processing. Please try again.');
        }
        onProcessingEnd();
      } else if (uploadType === 'url' && results.length > 0) {
        // For URL uploads, results should contain content_source_id immediately
        const urlResults = results.filter((r: any) => r.success && r.content_source_id);
        if (urlResults.length > 0) {
          toast.success('Content processing completed! You can now select chunks.');
          onContentUploaded(urlResults);
        } else {
          toast.error('Failed to process URLs. Please try again.');
        }
        onProcessingEnd();
      } else if (uploadType === 'existing' && results.length > 0) {
        // For existing sources, just show results
        onContentUploaded(results);
        onProcessingEnd();
      } else {
        toast.error('No content to process. Please select files, URLs, or existing sources.');
        onProcessingEnd();
      }

      setSelectedFiles([]);
      setWebLinks('');
      setErrors({});
      setSelectedSources([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process content. Please try again.');
      onProcessingEnd();
    }
  };

  const canSubmit =
    !isProcessing &&
    ((uploadType === 'file' && selectedFiles.length > 0 && !errors.file) ||
      (uploadType === 'url' && webLinks.trim().length > 0 && !errors.url) ||
      (uploadType === 'existing' && selectedSources.length > 0));

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-black mb-3">Content Ingestion</h2>
        <p className="text-neutral-600">Upload new documents or web content</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 px-8 mb-8">
        {/* Left: Cards stacked vertically */}
        <div className="flex flex-col gap-3 md:w-1/3">
          <div
            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
              uploadType === 'file'
                ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !isProcessing && setUploadType('file')}
            style={{ minWidth: 0 }}
          >
            <div className="flex items-center mb-2">
              <div className="p-1 bg-primary/10 rounded mr-2">
                <FiFile className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-black">File Upload</h3>
            </div>
            <p className="text-neutral-600 text-xs">Upload PDF or DOCX documents</p>
          </div>
          <div
            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
              uploadType === 'url'
                ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !isProcessing && setUploadType('url')}
            style={{ minWidth: 0 }}
          >
            <div className="flex items-center mb-2">
              <div className="p-1 bg-primary/10 rounded mr-2">
                <FiGlobe className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-black">Web Link</h3>
            </div>
            <p className="text-neutral-600 text-xs">Extract from web pages</p>
          </div>
        </div>

        {/* Right: Upload area */}
        <div className="flex-1">
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
            <div className="space-y-3 max-w-xl">
              {/* <label className="block text-xs font-semibold text-neutral-700 mb-1">Web Links</label> */}
              <textarea
                placeholder="https://example.com/article (one per line or comma separated)"
                value={webLinks}
                onChange={handleUrlChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                rows={4}
                disabled={isProcessing}
              />
              {errors.url && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="text-red-600">{errors.url}</p>
                </div>
              )}

              <label className="block text-xs font-semibold text-neutral-700 mt-2 mb-1">
                Topics (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., sustainability, annual report, privacy policy"
                value={topics}
                onChange={handleTopicsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={handleFindUrls}
                disabled={isFindingUrls || isProcessing || topics.trim().length === 0}
                className={`py-2 rounded font-semibold text-sm transition-all duration-200 mt-2 ${
                  isFindingUrls || isProcessing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                style={{ minWidth: '220px' }}
              >
                {isFindingUrls ? (
                  <>
                    <FiLoader className="w-4 h-4 inline mr-2 animate-spin" /> Finding URLs...
                  </>
                ) : (
                  <>
                    <FiSearch className="w-4 h-4 inline mr-2" /> Find URLs
                  </>
                )}
              </button>

              {discoveredUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-700 mb-1">Discovered URLs</p>
                  <div
                    className="overflow-y-auto border border-gray-200 rounded divide-y bg-white"
                    style={{ maxHeight: '90px' }}
                  >
                    {discoveredUrls.map((u) => (
                      <div key={u} className="flex items-center justify-between px-2 py-1">
                        <div className="truncate text-xs text-neutral-700 pr-2" title={u}>
                          {u}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleApprove(u)}
                          className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            approvedUrls.includes(u)
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {approvedUrls.includes(u) ? 'Approved' : 'Approve'}
                        </button>
                      </div>
                    ))}
                  </div>
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
                    {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''}{' '}
                    selected
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex justify-center mt-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`py-3 px-12 rounded-xl font-semibold transition-all duration-200 block ${
            canSubmit
              ? 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } ml-[-180px]`}
          style={{ minWidth: '220px' }}
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
