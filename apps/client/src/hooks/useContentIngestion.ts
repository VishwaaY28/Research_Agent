import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export type ContentChunk = {
  id: string;
  text: string;
  tag: string;
  startIndex: number;
  endIndex: number;
}

export type ContentIngestionState = {
  chunks: ContentChunk[];
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  showChunkModal: boolean;
  showWorkspaceModal: boolean;
  usedTags: string[];
}

export const useContentIngestion = () => {
  const [state, setState] = useState<ContentIngestionState>({
    chunks: [],
    selectedText: '',
    selectionRange: null,
    showChunkModal: false,
    showWorkspaceModal: false,
    usedTags: []
  });

  const handleTextSelection = useCallback((selectedText: string, range: { start: number; end: number }) => {
    setState(prev => ({
      ...prev,
      selectedText,
      selectionRange: range,
      showChunkModal: true
    }));
  }, []);

  const addChunk = useCallback((tag: string) => {
    setState(prev => {
      if (!prev.selectionRange || !prev.selectedText) return prev;

      const newChunk: ContentChunk = {
        id: Date.now().toString(),
        text: prev.selectedText,
        tag,
        startIndex: prev.selectionRange.start,
        endIndex: prev.selectionRange.end
      };

      return {
        ...prev,
        chunks: [...prev.chunks, newChunk],
        usedTags: prev.usedTags.includes(tag) ? prev.usedTags : [...prev.usedTags, tag],
        showChunkModal: false,
        selectedText: '',
        selectionRange: null
      };
    });

    toast.success('Chunk added successfully!');
  }, []);

  const removeChunk = useCallback((chunkId: string) => {
    setState(prev => ({
      ...prev,
      chunks: prev.chunks.filter(chunk => chunk.id !== chunkId)
    }));
    toast.success('Chunk removed');
  }, []);

  const openWorkspaceModal = useCallback(() => {
    setState(prev => {
      if (prev.chunks.length === 0) {
        toast.error('Please add at least one chunk before saving');
        return prev;
      }
      return { ...prev, showWorkspaceModal: true };
    });
  }, []);

  const saveToWorkspace = useCallback((workspaceName: string) => {
    setState(prev => ({
      ...prev,
      showWorkspaceModal: false
    }));
    toast.success(`Content saved to ${workspaceName}!`);
  }, []);

  const closeModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      showChunkModal: false,
      showWorkspaceModal: false,
      selectedText: '',
      selectionRange: null
    }));
  }, []);

  return {
    ...state,
    handleTextSelection,
    addChunk,
    removeChunk,
    openWorkspaceModal,
    saveToWorkspace,
    closeModals
  };
};