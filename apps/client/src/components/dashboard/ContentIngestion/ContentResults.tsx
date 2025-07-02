import React from 'react';
import { FiTag, FiTrash2, FiSave } from 'react-icons/fi';
import ContentPreview from './ContentPreview';
import AddChunkModal from './AddChunkModal';
import WorkspaceModal from './WorkspaceModal';
import { useContentIngestion } from '../../../hooks/useContentIngestion';

interface ContentResultsProps {
  extractedText: string;
  workspaces: string[];
}

const ContentResults: React.FC<ContentResultsProps> = ({ extractedText, workspaces }) => {
  const {
    chunks,
    selectedText,
    showChunkModal,
    showWorkspaceModal,
    usedTags,
    handleTextSelection,
    addChunk,
    removeChunk,
    openWorkspaceModal,
    saveToWorkspace,
    closeModals
  } = useContentIngestion();

  return (
    <div className="h-full bg-gray-50">
      <div className="h-full flex">
        <div className="flex-1 p-8">
          <ContentPreview
            extractedText={extractedText}
            chunks={chunks}
            onTextSelection={handleTextSelection}
          />
        </div>

        <div className="w-1/3 p-8 pl-4">
          <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-black">Content Chunks</h3>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                  {chunks.length}
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                Select text from the preview to create tagged chunks
              </p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {chunks.length === 0 ? (
                <div className="text-center py-8">
                  <FiTag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">
                    No chunks created yet. Select text from the preview to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                          {chunk.tag}
                        </span>
                        <button
                          onClick={() => removeChunk(chunk.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-neutral-700 line-clamp-3">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {chunks.length > 0 && (
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={openWorkspaceModal}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save to Workspace</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddChunkModal
        isOpen={showChunkModal}
        selectedText={selectedText}
        usedTags={usedTags}
        onAddChunk={addChunk}
        onClose={closeModals}
      />

      <WorkspaceModal
        isOpen={showWorkspaceModal}
        chunks={chunks}
        workspaces={workspaces}
        onSave={saveToWorkspace}
        onClose={closeModals}
      />
    </div>
  );
};

export default ContentResults;