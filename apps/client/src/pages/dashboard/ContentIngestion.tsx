import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ContentResults from '../../components/dashboard/ContentIngestion/ContentResults';
import IngestForm from '../../components/dashboard/ContentIngestion/IngestForm';

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

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleProcessingEnd = () => {
    setIsProcessing(false);
  };

  const handleContentUploaded = (results: ExtractedContent[]) => {
    setExtractedResults((prev) => [...prev, ...results]);
    setIsProcessing(false);
  };

  return (
    <div className="h-full bg-white">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      {extractedResults.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <IngestForm
            onContentUploaded={handleContentUploaded}
            onProcessingStart={handleProcessingStart}
            onProcessingEnd={handleProcessingEnd}
            isProcessing={isProcessing}
          />
        </div>
      ) : (
        <ContentResults
          extractedResults={extractedResults}
          onReset={() => setExtractedResults([])}
        />
      )}
    </div>
  );
};

export default ContentIngestion;
