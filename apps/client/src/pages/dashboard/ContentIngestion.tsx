import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import IngestForm from '../../components/dashboard/ContentIngestion/IngestForm';
import ContentResults from '../../components/dashboard/ContentIngestion/ContentResults';

const ContentIngestion: React.FC = () => {
  const [contentUploaded, setContentUploaded] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  const mockWorkspaces = [
    'Marketing Proposals',
    'Technical Documents',
    'Client Presentations',
    'Research Papers'
  ];

  const handleContentUploaded = (content: any) => {
    const mockExtractedText = `This is simulated extracted text from your ${content.type === 'file' ? 'file' : 'web link'}.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Key Points:
- Important information extracted
- Relevant data for proposals
- Structured content for reuse
- Actionable insights identified

This content can now be saved to your workspace for future use in proposal creation.`;

    setExtractedText(mockExtractedText);
    setContentUploaded(true);
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
      {!contentUploaded ? (
        <div className="h-full flex items-center justify-center">
          <IngestForm onContentUploaded={handleContentUploaded} />
        </div>
      ) : (
        <ContentResults 
          extractedText={extractedText} 
          workspaces={mockWorkspaces}
        />
      )}
    </div>
  );
};

export default ContentIngestion;