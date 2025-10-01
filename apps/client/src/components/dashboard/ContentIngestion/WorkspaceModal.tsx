import React, { useState } from 'react';
import { FiX, FiFolder, FiCheck } from 'react-icons/fi';
import type { ContentChunk } from '../../../hooks/useContentIngestion';

type WorkspaceModalProps = {
  isOpen: boolean;
  chunks: ContentChunk[];
  workspaces: string[];
  onSave: (workspaceName: string) => void;
  onClose: () => void;
};

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  chunks,
  workspaces,
  onSave,
  onClose,
}) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkspace) {
      onSave(selectedWorkspace);
    }
  };

  const groupedChunks = chunks.reduce(
    (acc, chunk) => {
      if (!acc[chunk.tag]) {
        acc[chunk.tag] = [];
      }
      acc[chunk.tag].push(chunk);
      return acc;
    },
    {} as Record<string, ContentChunk[]>,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-black">Save to Workspace</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-neutral-700 mb-3">
            Content Summary ({chunks.length} chunks)
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-40 overflow-y-auto">
            {Object.entries(groupedChunks).map(([tag, tagChunks]) => (
              <div key={tag} className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                  {tag}
                </span>
                <span className="text-sm text-neutral-600">
                  {tagChunks.length} chunk{tagChunks.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Select Workspace
            </label>
            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <label
                  key={workspace}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedWorkspace === workspace
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="workspace"
                    value={workspace}
                    checked={selectedWorkspace === workspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center flex-1">
                    <div
                      className={`p-2 rounded-lg mr-3 ${
                        selectedWorkspace === workspace ? 'bg-primary/20' : 'bg-gray-100'
                      }`}
                    >
                      <FiFolder
                        className={`w-5 h-5 ${
                          selectedWorkspace === workspace ? 'text-primary' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <span className="font-medium text-neutral-800">{workspace}</span>
                  </div>
                  {selectedWorkspace === workspace && <FiCheck className="w-5 h-5 text-primary" />}
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-neutral-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedWorkspace}
              className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                selectedWorkspace
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save Content
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceModal;
