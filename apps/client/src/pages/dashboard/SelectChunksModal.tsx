import React, { useEffect, useState } from 'react';

interface SelectChunksModalProps {
  source: any;
  chunks: any[];
  fetchChunks: (sourceId: number) => Promise<any[]>;
  selected: Set<string>; // Use string keys: 'majorIdx' or 'majorIdx-minorIdx'
  onSave: (selected: Set<string>) => void;
  onClose: () => void;
}

// Add a simple ChevronDown SVG icon
const ChevronDown = ({ className = '', style = {}, rotated = false }) => (
  <svg
    className={className}
    style={{ transform: rotated ? 'rotate(180deg)' : undefined, ...style }}
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SelectChunksModal: React.FC<SelectChunksModalProps> = ({
  source,
  chunks,
  fetchChunks,
  selected,
  onSave,
  onClose,
}) => {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected));
  const [loading, setLoading] = useState(false);
  const [chunkList, setChunkList] = useState<any[]>(chunks);
  const [expandedMajors, setExpandedMajors] = useState<Set<number>>(new Set());

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

  // Helper to get selection state
  const isMajorSelected = (idx: number, minors: any[]) => {
    if (!Array.isArray(minors) || minors.length === 0) {
      return localSelected.has(`${idx}`);
    }
    const all = minors.every((_, mIdx) => localSelected.has(`${idx}-${mIdx}`));
    const some = minors.some((_, mIdx) => localSelected.has(`${idx}-${mIdx}`));
    return all ? true : some ? 'indeterminate' : false;
  };

  const handleMajorToggle = (idx: number, minors: any[]) => {
    setLocalSelected((prev) => {
      const set = new Set(prev);
      if (!Array.isArray(minors) || minors.length === 0) {
        if (set.has(`${idx}`)) set.delete(`${idx}`);
        else set.add(`${idx}`);
      } else {
        const allSelected = minors.every((_: any, mIdx: number) => set.has(`${idx}-${mIdx}`));
        minors.forEach((_: any, mIdx: number) => {
          if (allSelected) set.delete(`${idx}-${mIdx}`);
          else set.add(`${idx}-${mIdx}`);
        });
      }
      return set;
    });
  };

  const handleMinorToggle = (idx: number, mIdx: number) => {
    setLocalSelected((prev) => {
      const set = new Set(prev);
      const key = `${idx}-${mIdx}`;
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return set;
    });
  };

  const toggleExpand = (idx: number) => {
    setExpandedMajors((prev) => {
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
            <div className="space-y-2 mb-6">
              {chunkList.map((chunk, idx) => {
                let heading = chunk.name || chunk.title || 'Untitled Section';
                const minors = Array.isArray(chunk.content) ? chunk.content : [];
                const majorState = isMajorSelected(idx, minors);
                const isExpanded = expandedMajors.has(idx);
                return (
                  <div key={idx} className="border rounded p-2 mb-2 bg-white">
                    <div className="flex items-center gap-2">
                      {minors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(idx)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary focus:outline-none"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown rotated={isExpanded} />
                        </button>
                      )}
                      <input
                        type="checkbox"
                        checked={majorState === true}
                        ref={el => {
                          if (el) el.indeterminate = majorState === 'indeterminate';
                        }}
                        onChange={() => handleMajorToggle(idx, minors)}
                      />
                      <span className="font-bold text-base text-gray-900">{heading}</span>
                      {minors.length > 0 && (
                        <span className="text-xs text-gray-500 ml-2">({minors.length} minor chunks)</span>
                      )}
                    </div>
                    {minors.length > 0 && isExpanded && (
                      <div className="ml-7 mt-2 space-y-1">
                        {minors.map((minor: any, mIdx: number) => (
                          <label key={mIdx} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSelected.has(`${idx}-${mIdx}`)}
                              onChange={() => handleMinorToggle(idx, mIdx)}
                            />
                            <span className="text-sm text-gray-800">
                              {minor.tag || minor.title || minor.name || `Minor Chunk ${mIdx + 1}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
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
