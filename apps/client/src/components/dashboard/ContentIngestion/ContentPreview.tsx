import React, { useRef, useState } from 'react';
import { FiCopy, FiDownload, FiInfo } from 'react-icons/fi';
import type { ContentChunk } from '../../../hooks/useContentIngestion';

type ContentPreviewProps = {
  extractedText: string;
  chunks: ContentChunk[];
  onTextSelection: (selectedText: string, range: { start: number; end: number }) => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ 
  extractedText, 
  chunks, 
  onTextSelection 
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  const handleMouseUp = () => {
    if (isProcessingSelection) return;
    
    setIsProcessingSelection(true);
    
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !textRef.current) {
        setIsProcessingSelection(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 3) {
        setIsProcessingSelection(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(textRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      
      const start = preCaretRange.toString().length;
      const end = start + selectedText.length;

      const overlapsWithChunk = chunks.some(chunk => 
        (start < chunk.endIndex && end > chunk.startIndex)
      );

      if (overlapsWithChunk) {
        selection.removeAllRanges();
        setIsProcessingSelection(false);
        return;
      }

      selection.removeAllRanges();
      onTextSelection(selectedText, { start, end });
      setIsProcessingSelection(false);
    }, 100);
  };

  const renderContentWithChunks = () => {
    if (chunks.length === 0) {
      return (
        <span className="select-text">
          {extractedText}
        </span>
      );
    }

    const sortedChunks = [...chunks].sort((a, b) => a.startIndex - b.startIndex);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedChunks.forEach((chunk, index) => {
      if (chunk.startIndex > lastIndex) {
        const beforeText = extractedText.slice(lastIndex, chunk.startIndex);
        elements.push(
          <span key={`text-${index}`} className="select-text">
            {beforeText}
          </span>
        );
      }

      const chunkText = extractedText.slice(chunk.startIndex, chunk.endIndex);
      elements.push(
        <span
          key={`chunk-${chunk.id}`}
          className="bg-primary/20 border-l-4 border-primary px-2 py-1 rounded-r-md relative group cursor-pointer inline-block select-none"
          title={`Tag: ${chunk.tag}`}
        >
          {chunkText}
          <span className="absolute -top-8 left-0 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
            {chunk.tag}
          </span>
        </span>
      );

      lastIndex = chunk.endIndex;
    });

    if (lastIndex < extractedText.length) {
      const remainingText = extractedText.slice(lastIndex);
      elements.push(
        <span key="text-end" className="select-text">
          {remainingText}
        </span>
      );
    }

    return elements;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-black">Extracted Content</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Select text to create chunks • {chunks.length} chunks created
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handleCopy}
              className="p-2 text-neutral-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              title="Copy content"
            >
              <FiCopy className="w-5 h-5" />
            </button>
            <button 
              className="p-2 text-neutral-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              title="Download content"
            >
              <FiDownload className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center space-x-2">
          <FiInfo className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-800">
            <span className="font-medium">How to create chunks:</span> 
            Select any text below to create a tagged chunk for your workspace. Highlighted text shows existing chunks.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="bg-gray-50 rounded-xl h-full overflow-y-auto">
            <div
              ref={textRef}
              className="p-6 text-neutral-800 text-sm whitespace-pre-wrap font-sans leading-relaxed cursor-text"
              onMouseUp={handleMouseUp}
              style={{ 
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text'
              }}
            >
              {renderContentWithChunks()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;