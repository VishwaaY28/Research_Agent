import React, { useEffect, useState } from 'react';

interface SelectChunksModalProps {
  source: any;
  chunks: any[];
  fetchChunks: (sourceId: number) => Promise<any[]>;
  selected: Set<number>;
  onSave: (selected: Set<number>) => void;
  onClose: () => void;
}

const SelectChunksModal: React.FC<SelectChunksModalProps> = ({
  source,
  chunks,
  fetchChunks,
  selected,
  onSave,
  onClose,
}) => {
  const [localSelected, setLocalSelected] = useState<Set<number>>(new Set(selected));
  const [loading, setLoading] = useState(false);
  const [chunkList, setChunkList] = useState<any[]>(chunks);

  useEffect(() => {
    if (!chunks.length && source?.id) {
      setLoading(true);
      fetchChunks(source.id).then((data) => {
        setChunkList(data);
        setLoading(false);
      });
    } else {
      setChunkList(chunks);
    }
  }, [chunks, source, fetchChunks]);

  const handleToggle = (idx: number) => {
    setLocalSelected((prev) => {
      const set = new Set(prev);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      return set;
    });
  };

  if (!source) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-black">Select Chunks from {source.name}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        {loading ? (
          <div className="text-gray-500">Loading chunks...</div>
        ) : chunkList.length === 0 ? (
          <div className="text-gray-400">No chunks found for this file.</div>
        ) : (
          <>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="select-all-chunks"
                checked={localSelected.size === chunkList.length && chunkList.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalSelected(new Set(chunkList.map((_, idx) => idx)));
                  } else {
                    setLocalSelected(new Set());
                  }
                }}
                className="mr-2"
              />
              <label
                htmlFor="select-all-chunks"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Select All
              </label>
            </div>
            <div className="space-y-2 mb-6">
              {chunkList.map((chunk, idx) => {
                let heading = chunk.name || chunk.title || 'Untitled Section';
                return (
                  <label
                    key={idx}
                    className="flex flex-col gap-1 p-2 border rounded mb-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localSelected.has(idx)}
                        onChange={() => handleToggle(idx)}
                      />
                      <span className="font-bold text-base text-gray-900">{heading}</span>
                    </div>
                    <div className="text-sm text-gray-700 ml-6">
                      {Array.isArray(chunk.content)
                        ? `${chunk.content.length} minor chunks • -`
                        : 'No content'}
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-neutral-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(localSelected)}
            className="flex-1 py-3 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            disabled={localSelected.size === 0}
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectChunksModal;
