import React from 'react';
import { FiPlus, FiEdit3, FiCalendar, FiClock, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface Proposal {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: 'draft' | 'completed' | 'in-progress';
  wordCount: number;
}

const ProposalGrid: React.FC = () => {
  const navigate = useNavigate();

  const mockProposals: Proposal[] = [
    {
      id: '1',
      title: 'Marketing Strategy Proposal',
      description: 'Comprehensive digital marketing strategy for Q4 campaign launch',
      createdAt: '2025-06-28',
      status: 'completed',
      wordCount: 2450
    },
    {
      id: '2',
      title: 'Technical Implementation Plan',
      description: 'Software development proposal for client management system',
      createdAt: '2025-06-30',
      status: 'in-progress',
      wordCount: 1850
    },
    {
      id: '3',
      title: 'Research Partnership Proposal',
      description: 'Collaboration proposal for academic research initiative',
      createdAt: '2025-07-01',
      status: 'draft',
      wordCount: 950
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in-progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proposal Authoring</h1>
              <p className="text-gray-600 mt-1">Create and manage your proposals with AI assistance</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Create Proposal
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {mockProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => navigate(`/dashboard/proposal-authoring/${proposal.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                        {proposal.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {proposal.description}
                      </p>
                    </div>
                    <FiEdit3 className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                        {proposal.status.replace('-', ' ')}
                      </span>
                      <div className="flex items-center text-gray-500 text-sm">
                        <FiFileText className="w-4 h-4 mr-1" />
                        {proposal.wordCount.toLocaleString()} words
                      </div>
                    </div>

                    <div className="flex items-center text-gray-500 text-sm">
                      <FiCalendar className="w-4 h-4 mr-2" />
                      {formatDate(proposal.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiEdit3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No proposals yet</h3>
                <p className="text-gray-600 mb-8">
                  Start creating your first proposal with AI assistance
                </p>
                <button
                  onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
                  className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Your First Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalGrid;