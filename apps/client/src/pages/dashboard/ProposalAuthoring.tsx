import React from 'react';
import { useParams } from 'react-router-dom';

const ProposalAuthoring: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="h-full bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-8">
          {id ? `Editing Proposal ${id}` : 'Proposal Authoring'}
        </h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <p className="text-neutral-600">
            Proposal authoring interface will be implemented here...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProposalAuthoring;