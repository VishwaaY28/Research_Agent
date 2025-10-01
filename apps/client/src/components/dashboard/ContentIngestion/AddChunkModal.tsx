import React, { useState, useEffect } from 'react';
import { FiX, FiTag } from 'react-icons/fi';

type AddChunkModalProps = {
  isOpen: boolean;
  selectedText: string;
  usedTags: string[];
  onAddChunk: (tag: string) => void;
  onClose: () => void;
}

const AddChunkModal: React.FC<AddChunkModalProps> = ({
  isOpen,
  selectedText,
  usedTags,
  onAddChunk,
  onClose
}) => {
  const [tag, setTag] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTag('');
      setShowSuggestions(false);
    }
  }, [isOpen]);

  const filteredTags = usedTags.filter(usedTag => 
    usedTag.toLowerCase().includes(tag.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tag.trim()) {
      onAddChunk(tag.trim());
    }
  };

  const selectTag = (selectedTag: string) => {
    setTag(selectedTag);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Add Content Chunk</h3>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Selected Text
          </label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-neutral-800 max-h-32 overflow-y-auto">
            "{selectedText}"
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tag
            </label>
            <div className="relative">
              <FiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setShowSuggestions(e.target.value.length > 0 && filteredTags.length > 0);
                }}
                onFocus={() => setShowSuggestions(tag.length > 0 && filteredTags.length > 0)}
                placeholder="Enter a tag for this chunk"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            
            {showSuggestions && filteredTags.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                <div className="p-2">
                  <div className="text-xs text-neutral-500 mb-2">Previously used tags:</div>
                  {filteredTags.map((suggestedTag, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectTag(suggestedTag)}
                      className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-primary/5 rounded-md transition-colors"
                    >
                      {suggestedTag}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Chunk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChunkModal;