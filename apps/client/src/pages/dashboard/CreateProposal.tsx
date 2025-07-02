import React, { useState } from 'react';
import { FiFolder, FiX, FiSend, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import WorkspaceModal from '../../components/dashboard/ProposalAuthoring/WorkspaceModal';

interface ContentChunk {
  id: string;
  title: string;
  preview: string;
  source: string;
}

interface SelectedChunk extends ContentChunk {
  workspaceName: string;
}

const CreateProposal: React.FC = () => {
  const navigate = useNavigate();
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedChunks, setSelectedChunks] = useState<SelectedChunk[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');

  const mockWorkspaces = [
    'Marketing Proposals',
    'Technical Documents',
    'Client Presentations',
    'Research Papers',
    'Financial Reports'
  ];

  const handleWorkspaceClick = (workspace: string) => {
    setSelectedWorkspace(workspace);
    setIsModalOpen(true);
  };

  const handleChunksSelected = (chunks: ContentChunk[], workspaceName: string) => {
    const chunksWithWorkspace = chunks.map(chunk => ({
      ...chunk,
      workspaceName
    }));
    setSelectedChunks(prev => [...prev, ...chunksWithWorkspace]);
    setIsModalOpen(false);
  };

  const removeChunk = (chunkId: string) => {
    setSelectedChunks(prev => prev.filter(chunk => chunk.id !== chunkId));
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) return;

    setIsGenerating(true);
    
    setTimeout(() => {
      const mockResult = `# Generated Proposal

## Executive Summary

Based on your prompt: "${userPrompt}"

This proposal has been generated using the selected content from your workspaces. The AI has analyzed and synthesized information from ${selectedChunks.length} content pieces to create this comprehensive proposal.

## Key Recommendations

1. **Strategic Implementation**: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

2. **Technical Approach**: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

3. **Timeline & Milestones**: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Detailed Analysis

${selectedChunks.length > 0 ? `This proposal incorporates insights from the following sources:
${selectedChunks.map(chunk => `- ${chunk.title} (from ${chunk.workspaceName})`).join('\n')}` : ''}

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.

## Implementation Plan

- **Phase 1**: Initial setup and planning (2 weeks)
- **Phase 2**: Core development and testing (6 weeks)
- **Phase 3**: Deployment and optimization (2 weeks)

## Budget Considerations

Total estimated investment: $XXX,XXX
Expected ROI: XX% within 12 months

## Conclusion

This proposal presents a comprehensive solution that addresses your specific requirements while leveraging best practices and proven methodologies. We are confident this approach will deliver exceptional results within the proposed timeline and budget.`;

      setGeneratedResult(mockResult);
      setIsGenerating(false);
    }, 2000);
  };

  if (generatedResult) {
    return (
      <div className="min-h-full bg-white">
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard/proposal-authoring')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Generated Proposal</h1>
              </div>
              <button
                onClick={() => {
                  setGeneratedResult('');
                  setUserPrompt('');
                  setSelectedChunks([]);
                }}
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Create New Proposal
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                {generatedResult.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-3xl font-bold text-gray-900 mb-6 first:mt-0">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-2xl font-semibold text-gray-900 mb-4 mt-8">{line.substring(3)}</h2>;
                  } else if (line.startsWith('- ')) {
                    return <li key={index} className="text-gray-700 mb-2">{line.substring(2)}</li>;
                  } else if (line.trim() === '') {
                    return <br key={index} />;
                  } else {
                    return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/proposal-authoring')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Proposal</h1>
              <p className="text-gray-600 mt-1">Describe your proposal needs and select relevant content</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Describe Your Proposal</h2>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Describe what kind of proposal you want to create. Be specific about the goals, audience, and key points you want to include..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none text-gray-900 placeholder-gray-500"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Content from Workspaces</h2>
            <p className="text-gray-600 text-sm mb-6">Choose relevant content from your workspaces to enhance your proposal</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {mockWorkspaces.map((workspace) => (
                <button
                  key={workspace}
                  onClick={() => handleWorkspaceClick(workspace)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left group"
                >
                  <FiFolder className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-gray-900 text-sm">{workspace}</p>
                </button>
              ))}
            </div>

            {selectedChunks.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Selected Content ({selectedChunks.length})</h3>
                <div className="space-y-3">
                  {selectedChunks.map((chunk) => (
                    <div key={chunk.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{chunk.title}</p>
                        <p className="text-gray-600 text-xs mt-1">from {chunk.workspaceName}</p>
                      </div>
                      <button
                        onClick={() => removeChunk(chunk.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!userPrompt.trim() || isGenerating}
            className={`w-full py-4 px-8 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
              userPrompt.trim() && !isGenerating
                ? 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating Proposal...
              </>
            ) : (
              <>
                <FiSend className="w-5 h-5" />
                Generate Proposal
              </>
            )}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <WorkspaceModal
          workspaceName={selectedWorkspace}
          onClose={() => setIsModalOpen(false)}
          onChunksSelected={handleChunksSelected}
        />
      )}
    </div>
  );
};

export default CreateProposal;