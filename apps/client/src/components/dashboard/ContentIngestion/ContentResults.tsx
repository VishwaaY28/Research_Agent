import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCheck, FiEye, FiFile, FiSave, FiSearch, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSections } from '../../../hooks/useSections';
import { type Tag, useTags } from '../../../hooks/useTags';
import { useWorkspace } from '../../../hooks/useWorkspace';

type Chunk = {
  content: string;
  label: string;
  file_source?: string;
  page?: number;
  section_type?: string;
};

type ExtractedContent = {
  success: boolean;
  content_source_id: number;
  chunks: Chunk[];
  figures?: Array<{
    path: string;
    page: number;
    caption?: string;
  }>;
  filename?: string;
  url?: string;
  error?: string;
};

type SelectedChunk = Chunk & {
  sourceId: number;
  sourceName: string;
  name: string;
  tags: string[];
  uniqueId: string;
};

interface ContentResultsProps {
  extractedResults: ExtractedContent[];
  onReset: () => void;
}

const ContentResults: React.FC<ContentResultsProps> = ({ extractedResults, onReset }) => {
  const [selectedChunks, setSelectedChunks] = useState<SelectedChunk[]>([]);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewingChunk, setViewingChunk] = useState<{ chunk: Chunk; sourceName: string } | null>(
    null,
  );
  const [showTagModal, setShowTagModal] = useState<{ chunkIndex: number } | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [selectedWorkspaceTags, setSelectedWorkspaceTags] = useState<string[]>([]);

  const navigate = useNavigate();
  const { createSections } = useSections();
  const { tags, fetchAllSectionTags, searchTags } = useTags();
  const { workspaces, fetchWorkspaces } = useWorkspace();

  const debouncedTagSearch = useDebounce(tagSearchQuery, 300);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        if (mounted) {
          await Promise.all([fetchAllSectionTags(), fetchWorkspaces()]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const searchForTags = async () => {
      try {
        if (debouncedTagSearch.trim()) {
          const results = await searchTags(debouncedTagSearch);
          if (mounted) {
            setSuggestedTags(results);
          }
        } else {
          if (mounted) {
            setSuggestedTags(tags.slice(0, 10));
          }
        }
      } catch (error) {
        console.error('Error searching tags:', error);
      }
    };

    searchForTags();

    return () => {
      mounted = false;
    };
  }, [debouncedTagSearch]);

  useEffect(() => {
    if (!tagSearchQuery.trim() && tags.length > 0) {
      setSuggestedTags(tags.slice(0, 10));
    }
  }, [tags]);

  const getAllWorkspaceTags = useMemo(() => {
    const allTags = new Set<string>();
    workspaces.forEach((workspace) => {
      workspace.tags.forEach((tag) => allTags.add(tag));
    });
    return Array.from(allTags);
  }, [workspaces]);

  const filteredWorkspaces = useMemo(() => {
    let filtered = workspaces;

    if (workspaceSearchQuery.trim()) {
      filtered = filtered.filter(
        (ws) =>
          ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase()) ||
          (ws.clientName &&
            ws.clientName.toLowerCase().includes(workspaceSearchQuery.toLowerCase())),
      );
    }

    if (selectedWorkspaceTags.length > 0) {
      filtered = filtered.filter((ws) =>
        selectedWorkspaceTags.some((tag) => ws.tags.includes(tag)),
      );
    }

    return filtered;
  }, [workspaces, workspaceSearchQuery, selectedWorkspaceTags]);

  const generateChunkId = (chunk: Chunk, sourceId: number, chunkIndex: number) => {
    return `${sourceId}-${chunkIndex}-${chunk.content.length}`;
  };

  const handleChunkToggle = (
    chunk: Chunk,
    sourceId: number,
    sourceName: string,
    chunkIndex: number,
  ) => {
    const uniqueId = generateChunkId(chunk, sourceId, chunkIndex);
    const isSelected = selectedChunks.some((c) => c.uniqueId === uniqueId);

    if (isSelected) {
      setSelectedChunks((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
    } else {
      const newChunk: SelectedChunk = {
        ...chunk,
        sourceId,
        sourceName,
        name: chunk.label || chunk.content.substring(0, 50) + '...',
        tags: [],
        uniqueId,
      };
      setSelectedChunks((prev) => [...prev, newChunk]);
    }
  };

  const getSourceName = (result: ExtractedContent) => {
    if (result.chunks && result.chunks.length > 0 && result.chunks[0].file_source) {
      return result.chunks[0].file_source;
    }
    return result.filename || result.url || 'Unknown Source';
  };

  const handleChunkNameChange = (index: number, name: string) => {
    setSelectedChunks((prev) => prev.map((chunk, i) => (i === index ? { ...chunk, name } : chunk)));
  };

  const handleRemoveTag = (chunkIndex: number, tagIndex: number) => {
    setSelectedChunks((prev) =>
      prev.map((chunk, i) => {
        if (i === chunkIndex) {
          const newTags = chunk.tags.filter((_, ti) => ti !== tagIndex);
          return { ...chunk, tags: newTags };
        }
        return chunk;
      }),
    );
  };

  const handleShowTagModal = (chunkIndex: number) => {
    setShowTagModal({ chunkIndex });
    setTagSearchQuery('');
    setSuggestedTags(tags.slice(0, 10));
  };

  const handleSelectSuggestedTag = (tagName: string, chunkIndex: number) => {
    setSelectedChunks((prev) =>
      prev.map((chunk, i) => {
        if (i === chunkIndex) {
          const newTags = chunk.tags.includes(tagName) ? chunk.tags : [...chunk.tags, tagName];
          return { ...chunk, tags: newTags };
        }
        return chunk;
      }),
    );
    setShowTagModal(null);
  };

  const handleAddCustomTag = (chunkIndex: number) => {
    const tagValue = tagSearchQuery.trim();
    if (!tagValue) return;

    setSelectedChunks((prev) =>
      prev.map((chunk, i) => {
        if (i === chunkIndex) {
          const newTags = chunk.tags.includes(tagValue) ? chunk.tags : [...chunk.tags, tagValue];
          return { ...chunk, tags: newTags };
        }
        return chunk;
      }),
    );
    setShowTagModal(null);
  };

  const handleWorkspaceTagToggle = (tag: string) => {
    setSelectedWorkspaceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSaveToWorkspace = async () => {
    if (!selectedWorkspace || selectedChunks.length === 0) return;

    const workspace = workspaces.find((ws) => ws.id === selectedWorkspace);
    if (!workspace) return;

    setIsSaving(true);
    try {
      const chunksBySource = selectedChunks.reduce(
        (acc, chunk) => {
          if (!acc[chunk.sourceName]) {
            acc[chunk.sourceName] = [];
          }
          acc[chunk.sourceName].push({
            content: chunk.content,
            name: chunk.name,
            tags: chunk.tags,
          });
          return acc;
        },
        {} as Record<string, Array<{ content: string; name: string; tags: string[] }>>,
      );

      for (const [sourceName, chunks] of Object.entries(chunksBySource)) {
        await createSections(parseInt(workspace.id), sourceName, chunks);
      }

      toast.success(`Successfully saved ${selectedChunks.length} chunks to ${workspace.name}`);
      setShowWorkspaceModal(false);
      setSelectedChunks([]);
      setSelectedWorkspace('');

      navigate(`/dashboard/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save chunks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isChunkSelected = (chunk: Chunk, sourceId: number, chunkIndex: number) => {
    const uniqueId = generateChunkId(chunk, sourceId, chunkIndex);
    return selectedChunks.some((c) => c.uniqueId === uniqueId);
  };

  const handleViewChunk = (chunk: Chunk, sourceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingChunk({ chunk, sourceName });
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onReset}
                className="p-2 text-neutral-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                title="Upload more files"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-black">Extracted Content</h2>
                <p className="text-neutral-600">
                  {extractedResults.length} source(s) processed • {selectedChunks.length} chunks
                  selected
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onReset}
                className="px-4 py-2 border border-gray-300 text-neutral-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Upload More
              </button>
              {selectedChunks.length > 0 && (
                <button
                  onClick={() => setShowWorkspaceModal(true)}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center space-x-2"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save to Workspace</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {extractedResults.map((result, resultIndex) => (
                  <div key={resultIndex} className="bg-white rounded-xl border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FiFile className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-black">
                            {getSourceName(result).split('/')[1]}
                          </h3>
                          <p className="text-sm text-neutral-600">
                            {result.chunks.length} chunks extracted
                          </p>
                        </div>
                        {!result.success && (
                          <div className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-md">
                            Failed: {result.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {result.success && result.chunks.length > 0 && (
                      <div className="p-6">
                        <div className="grid gap-4">
                          {result.chunks.map((chunk, chunkIndex) => (
                            <div
                              key={chunkIndex}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                isChunkSelected(chunk, result.content_source_id, chunkIndex)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() =>
                                handleChunkToggle(
                                  chunk,
                                  result.content_source_id,
                                  getSourceName(result),
                                  chunkIndex,
                                )
                              }
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                                    isChunkSelected(chunk, result.content_source_id, chunkIndex)
                                      ? 'border-primary bg-primary'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {isChunkSelected(chunk, result.content_source_id, chunkIndex) && (
                                    <FiCheck className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  {chunk.label && (
                                    <h4 className="font-medium text-black mb-2">{chunk.label}</h4>
                                  )}
                                  <p className="text-sm text-neutral-700 line-clamp-3">
                                    {chunk.content}
                                  </p>
                                  {(chunk.page || chunk.section_type || chunk.file_source) && (
                                    <div className="flex items-center space-x-2 mt-2">
                                      {chunk.page && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                          Page {chunk.page}
                                        </span>
                                      )}
                                      {chunk.section_type && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                                          {chunk.section_type}
                                        </span>
                                      )}
                                      {chunk.file_source && (
                                        <span className="px-2 py-1 bg-blue-100 text-primary text-xs rounded">
                                          {chunk.file_source.split('/').pop()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={(e) =>
                                    handleViewChunk(chunk, getSourceName(result).split('/')[1], e)
                                  }
                                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="View full content"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedChunks.length > 0 && (
              <div className="w-1/3 border-l border-gray-200 bg-white p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-black mb-4">
                  Selected Chunks ({selectedChunks.length})
                </h3>
                <div className="space-y-4">
                  {selectedChunks.map((chunk, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Chunk Name
                          </label>
                          <input
                            type="text"
                            value={chunk.name}
                            onChange={(e) => handleChunkNameChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter chunk name..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Tags
                          </label>

                          {chunk.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {chunk.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTag(index, tagIndex)}
                                    className="ml-1 text-primary/60 hover:text-primary"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleShowTagModal(index)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            + Add tag...
                          </button>
                        </div>

                        <p className="text-xs text-neutral-600 line-clamp-2">{chunk.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingChunk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  {viewingChunk.chunk.label || 'Chunk Content'}
                </h3>
                <p className="text-sm text-neutral-600">
                  Source: {viewingChunk.sourceName}
                  {viewingChunk.chunk.page && ` • Page ${viewingChunk.chunk.page}`}
                  {viewingChunk.chunk.file_source &&
                    ` • ${viewingChunk.chunk.file_source.split('/').pop()}`}
                </p>
              </div>
              <button
                onClick={() => setViewingChunk(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans leading-relaxed">
                  {viewingChunk.chunk.content}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setViewingChunk(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-semibold text-black mb-4">Add Tag</h3>

            <div className="mb-4">
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Search or type new tag..."
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {suggestedTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 mb-2">Suggested tags:</p>
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectSuggestedTag(tag.name, showTagModal.chunkIndex)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <span className="font-medium">{tag.name}</span>
                      <span className="text-gray-500 ml-2">({tag.usage_count} uses)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowTagModal(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-neutral-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {tagSearchQuery.trim() &&
                !suggestedTags.some(
                  (tag) => tag.name.toLowerCase() === tagSearchQuery.toLowerCase(),
                ) && (
                  <button
                    onClick={() => handleAddCustomTag(showTagModal.chunkIndex)}
                    className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create "{tagSearchQuery}"
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-semibold text-black mb-4">Save to Workspace</h3>

            <div className="mb-2 p-2 bg-gray-100 text-xs text-gray-600 rounded">
              Debug: {workspaces.length} total workspaces, {filteredWorkspaces.length} filtered
            </div>

            <div className="space-y-4 mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={workspaceSearchQuery}
                  onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Search workspaces by name or client..."
                />
              </div>

              {getAllWorkspaceTags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Filter by tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {getAllWorkspaceTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleWorkspaceTagToggle(tag)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          selectedWorkspaceTags.includes(tag)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-lg">
              {workspaces.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading workspaces...</p>
                  <button
                    onClick={() => fetchWorkspaces()}
                    className="mt-2 px-3 py-1 bg-primary text-white text-sm rounded"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredWorkspaces.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredWorkspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedWorkspace(workspace.id)}
                    >
                      <input
                        type="radio"
                        name="workspace"
                        value={workspace.id}
                        checked={selectedWorkspace === workspace.id}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        className="mr-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-black">{workspace.name}</h4>
                        {workspace.clientName && (
                          <p className="text-sm text-gray-600">{workspace.clientName}</p>
                        )}
                        {workspace.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {workspace.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">ID: {workspace.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No workspaces found matching your criteria
                  <div className="mt-2 text-xs">
                    Search: "{workspaceSearchQuery}" | Tags: {selectedWorkspaceTags.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowWorkspaceModal(false)}
                disabled={isSaving}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-neutral-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToWorkspace}
                disabled={!selectedWorkspace || isSaving}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  selectedWorkspace && !isSaving
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSaving
                  ? 'Saving...'
                  : `Save${selectedWorkspace ? ` to ${filteredWorkspaces.find((w) => w.id === selectedWorkspace)?.name || selectedWorkspace}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentResults;
