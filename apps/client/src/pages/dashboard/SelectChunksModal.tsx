
import React, { useEffect, useState } from 'react';

interface SelectChunksModalProps {
  source: any;
  chunks: any[];
  fetchChunks: (sourceId: number) => Promise<any[]>;
  selected: Set<string>;
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
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl mx-4 max-h-[70vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Chunks</h3>
            <p className="text-sm text-gray-500 mt-0.5">{source.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-50"
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
            <div className="mb-3 flex items-center">
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={localSelected.size > 0}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      // Deselect all
                      setLocalSelected(new Set());
                    } else {
                      // Select all
                      const newSet = new Set<string>();
                      chunkList.forEach((chunk, idx) => {
                        const minors = Array.isArray(chunk.content) ? chunk.content : [];
                        if (minors.length === 0) {
                          newSet.add(`${idx}`);
                        } else {
                          minors.forEach((_: unknown, mIdx: number) => {
                            newSet.add(`${idx}-${mIdx}`);
                          });
                        }
                      });
                      setLocalSelected(newSet);
                    }
                  }}
                />
                <span className="text-sm text-gray-700">Select All</span>
              </label>
            </div>
            <div className="space-y-2 mb-4">
              {chunkList.map((chunk, idx) => {
                let heading = chunk.name || chunk.title || 'Untitled Section';
                const minors = Array.isArray(chunk.content) ? chunk.content : [];
                const majorState = isMajorSelected(idx, minors);
                const isExpanded = expandedMajors.has(idx);
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-2 mb-2 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      {minors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(idx)}
                          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary focus:outline-none transition-colors"
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
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium text-sm text-gray-700">{heading}</span>
                      {minors.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">({minors.length} minor chunks)</span>
                      )}
                    </div>
                    {minors.length > 0 && isExpanded && (
                      <div className="ml-7 mt-2 space-y-1.5 pl-2 border-l border-gray-100">
                        {minors.map((minor: any, mIdx: number) => (
                          <label key={mIdx} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-0.5 px-1 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={localSelected.has(`${idx}-${mIdx}`)}
                              onChange={() => handleMinorToggle(idx, mIdx)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-600">
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
        <div className="flex space-x-3 pt-4 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(localSelected)}
            className="flex-1 py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all text-sm font-medium shadow-sm"
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

