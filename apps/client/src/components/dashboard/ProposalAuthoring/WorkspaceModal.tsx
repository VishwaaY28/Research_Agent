import React, { useState } from 'react';
import { FiX, FiFile, FiCheck } from 'react-icons/fi';

interface ContentChunk {
  id: string;
  title: string;
  preview: string;
  source: string;
}

interface WorkspaceModalProps {
  workspaceName: string;
  onClose: () => void;
  onChunksSelected: (chunks: ContentChunk[], workspaceName: string) => void;
}

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ workspaceName, onClose, onChunksSelected }) => {
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);

  const mockContentChunks: ContentChunk[] = [
    {
      id: '1',
      title: 'Market Analysis Overview',
      preview: 'Comprehensive analysis of market trends and competitive landscape...',
      source: 'market-research.pdf'
    },
    {
      id: '2',
      title: 'Customer Segmentation Data',
      preview: 'Detailed breakdown of customer demographics and behavior patterns...',
      source: 'customer-analysis.docx'
    },
    {
      id: '3',
      title: 'Financial Projections',
      preview: 'Revenue forecasts and budget allocations for the next fiscal year...',
      source: 'financial-report.pdf'
    },
    {
      id: '4',
      title: 'Technology Stack Overview',
      preview: 'Technical specifications and architecture recommendations...',
      source: 'tech-specs.pdf'
    },
    {
      id: '5',
      title: 'Implementation Timeline',
      preview: 'Project milestones and delivery schedule breakdown...',
      source: 'project-timeline.docx'
    }
  ];

  const toggleChunk = (chunkId: string) => {
    setSelectedChunks(prev => 
      prev.includes(chunkId) 
        ? prev.filter(id => id !== chunkId)
        : [...prev, chunkId]
    );
  };

  const handleAddSelected = () => {
    const chunksToAdd = mockContentChunks.filter(chunk => selectedChunks.includes(chunk.id));
    onChunksSelected(chunksToAdd, workspaceName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-black">{workspaceName}</h2>
            <p className="text-neutral-600 text-sm">Select content to include in your proposal</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {mockContentChunks.map((chunk) => (
              <div
                key={chunk.id}
                onClick={() => toggleChunk(chunk.id)}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedChunks.includes(chunk.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <FiFile className="w-5 h-5 text-neutral-400 mr-3" />
                      <h3 className="font-semibold text-black">{chunk.title}</h3>
                    </div>
                    <p className="text-neutral-600 text-sm mb-2">{chunk.preview}</p>
                    <p className="text-neutral-500 text-xs">Source: {chunk.source}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 ${
                    selectedChunks.includes(chunk.id)
                      ? 'bg-primary border-primary'
                      : 'border-gray-300'
                  }`}>
                    {selectedChunks.includes(chunk.id) && (
                      <FiCheck className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-neutral-600 text-sm">
              {selectedChunks.length} item{selectedChunks.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-neutral-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedChunks.length === 0}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  selectedChunks.length > 0
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add Selected ({selectedChunks.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceModal;