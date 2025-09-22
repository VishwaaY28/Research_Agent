import React, { useState } from 'react';
import { useChunkStatus } from '../../hooks/useChunkStatus';
import { useLocation, useParams } from 'react-router-dom';
import ContentResults from '../../components/dashboard/ContentIngestion/ContentResults';
import IngestForm from '../../components/dashboard/ContentIngestion/IngestForm';
import ContentSources from './ContentSources';

type ExtractedContent = {
  success: boolean;
  content_source_id: number;
  chunks: Array<{
    content: string;
    label: string;
    file_source?: string;
    page?: number;
    section_type?: string;
  }>;
  figures?: Array<{
    path: string;
    page: number;
    caption?: string;
  }>;
  filename?: string;
  url?: string;
  error?: string;
};

const ContentIngestion: React.FC = () => {
  const [extractedResults, setExtractedResults] = useState<ExtractedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingestion' | 'sources'>('ingestion');
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  // Try to get workspaceId from params or location.state
  const workspaceId = params.id || location.state?.workspaceId;

  // Assume you get contentSourceId from upload response
  const [contentSourceId] = useState<number | undefined>(undefined);
  const { status, chunks } = useChunkStatus(contentSourceId);

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  // Example: set contentSourceId after upload (replace with actual logic)
  // setContentSourceId(uploadResponse.content_source_id);

  // Notify user when chunking is complete
  React.useEffect(() => {
    if (status === 'complete') {
      setExtractedResults([{ success: true, content_source_id: contentSourceId!, chunks }]);
      setIsProcessing(false);
    }
  }, [status, contentSourceId, chunks]);

  const handleProcessingEnd = () => {
    setIsProcessing(false);
  };

  const handleContentUploaded = (results: ExtractedContent[]) => {
    setExtractedResults(results); // Only keep the latest results, no duplicates
    setIsProcessing(false);
  };

  const handleReset = () => {
    setExtractedResults([]);
    setIsProcessing(false);
  };

  return (
    <div className="h-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'ingestion'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
             Ingestion
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'sources'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
             Sources
            </button>
          </div>

          {/* Content Area */}
          <div className="w-full">
            {activeTab === 'ingestion' ? (
              extractedResults.length === 0 ? (
                <IngestForm
                  onContentUploaded={handleContentUploaded}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                  isProcessing={isProcessing}
                />
              ) : (
                <ContentResults
                  extractedResults={extractedResults}
                  onReset={handleReset}
                  workspaceId={workspaceId}
                />
              )
            ) : (
              <div className="bg-white rounded-xl">
                <ContentSources />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentIngestion;
