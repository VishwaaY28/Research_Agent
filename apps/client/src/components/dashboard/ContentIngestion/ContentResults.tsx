/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiEye,
    FiPlus,
    FiSave,
    FiSearch,
    FiTag,
    FiX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSections } from '../../../hooks/useSections';
import { useTags, type Tag } from '../../../hooks/useTags';
import { useWorkspace } from '../../../hooks/useWorkspace';

type MinorChunk = {
  tag: string;
  content: Array<{
    text: string;
    page_number: number;
  }>;
  tags?: string[];
};

type StructuredChunk = {
  title: string;
  start_range: string;
  end_range: string;
  content: MinorChunk[];
  file_source?: string;
  tags?: string[];
};

type SimpleChunk = {
  content: string;
  label: string;
  file_source?: string;
  page?: number;
  section_type?: string;
  tags?: string[];
};

type Chunk = StructuredChunk | SimpleChunk;

type ExtractedContent = {
  success: boolean;
  content_source_id: number;
  chunks: Chunk[];
  filename?: string;
  url?: string;
  error?: string;
  type?: string;
};

type SelectedItem = {
  type: 'chunk' | 'section';
  sourceId: number;
  sourceName: string;
  name: string;
  content: string;
  tags: string[];
  uniqueId: string;
  originalData?: any;
};

type ContentResultsProps = {
  extractedResults: ExtractedContent[];
  onReset: () => void;
  workspaceId?: string;
};

const ContentResults: React.FC<ContentResultsProps> = ({
  extractedResults,
  onReset,
  workspaceId,
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewingItem, setViewingItem] = useState<{
    item: any;
    sourceName: string;
    type: 'chunk' | 'section';
  } | null>(null);
  const [showTagModal, setShowTagModal] = useState<{ itemIndex: number } | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [selectedWorkspaceTags, setSelectedWorkspaceTags] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newTagInput, setNewTagInput] = useState('');
  const autoSavedRef = useRef(false);

  const navigate = useNavigate();
  const { createSections } = useSections();
  const { tags, fetchAllSectionTags, searchTags } = useTags();
  const { workspaces, fetchWorkspaces } = useWorkspace();

  const debouncedTagSearch = useDebounce(tagSearchQuery, 300);

  const isStructuredChunk = (chunk: Chunk): chunk is StructuredChunk => {
    return 'title' in chunk && 'content' in chunk && Array.isArray(chunk.content);
  };

  const generateItemId = (item: any, sourceId: number, type: string, index: number) => {
    return `${sourceId}-${type}-${index}-${JSON.stringify(item).length}`;
  };

  const getSourceName = (result: ExtractedContent) => {
    return result.filename || result.url || 'Unknown Source';
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleItemToggle = (
    item: any,
    sourceId: number,
    sourceName: string,
    type: 'chunk' | 'section',
    index: number,
  ) => {
    const uniqueId = generateItemId(item, sourceId, type, index);
    const isSelected = selectedItems.some((i) => i.uniqueId === uniqueId);

    if (isSelected) {
      setSelectedItems((prev) => prev.filter((i) => i.uniqueId !== uniqueId));
    } else {
      let content = '';
      let name = '';

      switch (type) {
        case 'chunk':
          if (isStructuredChunk(item)) {
            content = item.content
              .map((section) => `${section.tag}\n${section.content.map((c) => c.text).join('\n')}`)
              .join('\n\n');
            name = item.title;
          } else {
            content = item.content;
            name = item.label || item.content.substring(0, 50) + '...';
          }
          break;
        case 'section':
          content = item.content.map((c: any) => c.text).join('\n');
          name = item.tag;
          break;
      }

      const newItem: SelectedItem = {
        type,
        sourceId,
        sourceName,
        name,
        content,
        tags: [],
        uniqueId,
        originalData: item,
      };
      setSelectedItems((prev) => [...prev, newItem]);
    }
  };

  const isItemSelected = (item: any, sourceId: number, type: string, index: number) => {
    const uniqueId = generateItemId(item, sourceId, type, index);
    return selectedItems.some((i) => i.uniqueId === uniqueId);
  };

  const handleViewItem = (
    item: any,
    sourceName: string,
    type: 'chunk' | 'section',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setViewingItem({ item, sourceName, type });
  };

  const handleAddTag = (itemIndex: number) => {
    setShowTagModal({ itemIndex });
  };

  const renderStructuredChunk = (
    chunk: StructuredChunk,
    result: ExtractedContent,
    chunkIndex: number,
  ) => {
    const sourceName = getSourceName(result);
    const isSelected = isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex);
    const sectionId = `${result.content_source_id}-chunk-${chunkIndex}`;
    const isExpanded = expandedSections.has(sectionId);
    const selectedItem = selectedItems.find(
      (item) =>
        item.uniqueId === generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
    );

    return (
      <div key={chunkIndex} className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className={`p-4 cursor-pointer transition-colors ${
            isSelected ? 'bg-primary/10' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() =>
            handleItemToggle(chunk, result.content_source_id, sourceName, 'chunk', chunkIndex)
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
                }`}
              >
                {isSelected && <FiCheck className="w-3 h-3" />}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{chunk.title}</h4>
                <p className="text-sm text-gray-500">
                  {chunk.content.length} minor chunks • {chunk.start_range} - {chunk.end_range}
                </p>
                {chunk.tags && chunk.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {chunk.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                      >
                        <FiTag className="w-2 h-2 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedItem && selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedItem.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                      >
                        <FiTag className="w-2 h-2 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const itemIndex = selectedItems.findIndex(
                      (item) =>
                        item.uniqueId ===
                        generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
                    );
                    if (itemIndex !== -1) {
                      handleAddTag(itemIndex);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors"
                  title="Add tags"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => handleViewItem(chunk, sourceName, 'chunk', e)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(sectionId);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <FiChevronDown className="w-4 h-4" />
                ) : (
                  <FiChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-gray-200 bg-white">
            {chunk.content.map((minor, sectionIndex) => {
              const sectionIsSelected = isItemSelected(
                minor,
                result.content_source_id,
                'section',
                sectionIndex,
              );
              const selectedSectionItem = selectedItems.find(
                (item) =>
                  item.uniqueId ===
                  generateItemId(minor, result.content_source_id, 'section', sectionIndex),
              );
              return (
                <div
                  key={sectionIndex}
                  className={`p-4 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                    sectionIsSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemToggle(
                      minor,
                      result.content_source_id,
                      sourceName,
                      'section',
                      sectionIndex,
                    );
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-4 h-4 mt-1 rounded border-2 flex items-center justify-center ${
                        sectionIsSelected
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {sectionIsSelected && <FiCheck className="w-2.5 h-2.5" />}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-800 mb-2">{minor.tag}</h5>
                      {minor.tags && minor.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {minor.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                            >
                              <FiTag className="w-2 h-2 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedSectionItem && selectedSectionItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {selectedSectionItem.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                            >
                              <FiTag className="w-2 h-2 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 space-y-1">
                        {minor.content.slice(0, 2).map((content, contentIndex) => (
                          <p key={contentIndex} className="line-clamp-2">
                            {content.text.substring(0, 200)}
                            {content.text.length > 200 && '...'}
                          </p>
                        ))}
                        {minor.content.length > 2 && (
                          <p className="text-gray-500 italic">
                            +{minor.content.length - 2} more items
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {sectionIsSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const itemIndex = selectedItems.findIndex(
                              (item) =>
                                item.uniqueId ===
                                generateItemId(
                                  minor,
                                  result.content_source_id,
                                  'section',
                                  sectionIndex,
                                ),
                            );
                            if (itemIndex !== -1) {
                              handleAddTag(itemIndex);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                          title="Add tags"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSimpleChunk = (chunk: SimpleChunk, result: ExtractedContent, chunkIndex: number) => {
    const sourceName = getSourceName(result);
    const isSelected = isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex);
    const selectedItem = selectedItems.find(
      (item) =>
        item.uniqueId === generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
    );

    return (
      <div
        key={chunkIndex}
        className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors ${
          isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-gray-50'
        }`}
        onClick={() =>
          handleItemToggle(chunk, result.content_source_id, sourceName, 'chunk', chunkIndex)
        }
      >
        <div className="flex items-start space-x-3">
          <div
            className={`w-5 h-5 mt-1 rounded border-2 flex items-center justify-center ${
              isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
            }`}
          >
            {isSelected && <FiCheck className="w-3 h-3" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                {chunk.label || chunk.content.substring(0, 50) + '...'}
              </h4>
              <div className="flex items-center space-x-2">
                {chunk.page && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Page {chunk.page}
                  </span>
                )}
                {chunk.section_type && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    {chunk.section_type}
                  </span>
                )}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const itemIndex = selectedItems.findIndex(
                        (item) =>
                          item.uniqueId ===
                          generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
                      );
                      if (itemIndex !== -1) {
                        handleAddTag(itemIndex);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                    title="Add tags"
                  >
                    <FiPlus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => handleViewItem(chunk, sourceName, 'chunk', e)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
            {chunk.tags && chunk.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {chunk.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                  >
                    <FiTag className="w-2 h-2 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {selectedItem && selectedItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedItem.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                  >
                    <FiTag className="w-2 h-2 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-600 line-clamp-3">
              {chunk.content.substring(0, 300)}
              {chunk.content.length > 300 && '...'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveToWorkspace = async () => {
    if (!selectedWorkspace || selectedItems.length === 0) return;

    const workspace = workspaces.find((ws) => ws.id === selectedWorkspace);
    if (!workspace) return;

    setIsSaving(true);
    try {
      const sectionItems = selectedItems.filter(
        (item) => item.type === 'section' || item.type === 'chunk',
      );

      if (sectionItems.length > 0) {
        const sectionsToCreate = sectionItems.map((item) => ({
          content: item.content,
          name: item.name,
          tags: item.tags,
        }));

        await createSections(parseInt(workspace.id), sectionItems[0].sourceName, sectionsToCreate);
      }

      toast.success(`Successfully saved ${selectedItems.length} items to ${workspace.name}`);
      setShowWorkspaceModal(false);
      setSelectedItems([]);
      setSelectedWorkspace('');

      navigate(`/dashboard/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save items. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagChange = (itemIndex: number, newTags: string[]) => {
    setSelectedItems((prev) =>
      prev.map((item, index) => (index === itemIndex ? { ...item, tags: newTags } : item)),
    );
  };

  const handleAddNewTag = () => {
    if (!newTagInput.trim() || !showTagModal) return;

    const item = selectedItems[showTagModal.itemIndex];
    if (!item || item.tags.includes(newTagInput.trim())) return;

    handleTagChange(showTagModal.itemIndex, [...item.tags, newTagInput.trim()]);
    setNewTagInput('');
  };

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
    const fetchSuggestedTags = async () => {
      if (debouncedTagSearch.trim()) {
        try {
          const searchResults = await searchTags(debouncedTagSearch);
          setSuggestedTags(searchResults);
        } catch (error) {
          console.error('Error searching tags:', error);
          setSuggestedTags([]);
        }
      } else {
        setSuggestedTags(tags.slice(0, 10));
      }
    };

    fetchSuggestedTags();
  }, [debouncedTagSearch, tags, searchTags]);

  // Helper logic for select all
  const allSelectableItems = useMemo(() => {
    const items: SelectedItem[] = [];
    extractedResults.forEach((result) => {
      if (!result.success) return;
      const sourceName = getSourceName(result);
      result.chunks.forEach((chunk, chunkIndex) => {
        // Chunk
        let content = '';
        let name = '';
        if (isStructuredChunk(chunk)) {
          content = chunk.content
            .map((section) => `${section.tag}\n${section.content.map((c) => c.text).join('\n')}`)
            .join('\n\n');
          name = chunk.title;
        } else {
          content = chunk.content;
          name = chunk.label || chunk.content.substring(0, 50) + '...';
        }
        items.push({
          type: 'chunk',
          sourceId: result.content_source_id,
          sourceName,
          name,
          content,
          tags: [],
          uniqueId: generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
          originalData: chunk,
        });
        // Structured sections
        if (isStructuredChunk(chunk)) {
          chunk.content.forEach((minor, sectionIndex) => {
            items.push({
              type: 'section',
              sourceId: result.content_source_id,
              sourceName,
              name: minor.tag,
              content: minor.content.map((c) => c.text).join('\n'),
              tags: [],
              uniqueId: generateItemId(minor, result.content_source_id, 'section', sectionIndex),
              originalData: minor,
            });
          });
        }
      });
    });
    return items;
  }, [extractedResults]);
  const allItemsSelected =
    selectedItems.length > 0 && selectedItems.length === allSelectableItems.length;
  const totalItems = allSelectableItems.length;

  const filteredWorkspaces = useMemo(() => {
    if (!workspaceSearchQuery.trim()) {
      return selectedWorkspaceTags.length > 0
        ? workspaces.filter((ws) => selectedWorkspaceTags.some((tag) => ws.tags.includes(tag)))
        : workspaces;
    }

    return workspaces.filter((ws) => {
      const matchesSearch =
        ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase()) ||
        ws.clientName?.toLowerCase().includes(workspaceSearchQuery.toLowerCase());
      const matchesTags =
        selectedWorkspaceTags.length === 0 ||
        selectedWorkspaceTags.some((tag) => ws.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [workspaces, workspaceSearchQuery, selectedWorkspaceTags]);

  const allWorkspaceTags = useMemo(() => {
    const tagSet = new Set<string>();
    workspaces.forEach((ws) => ws.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [workspaces]);

  const renderTagModal = () => {
    if (!showTagModal) return null;

    const item = selectedItems[showTagModal.itemIndex];
    if (!item) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Tags</h3>
            <button
              onClick={() => {
                setShowTagModal(null);
                setTagSearchQuery('');
                setNewTagInput('');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search existing tags..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Create new tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTagInput.trim() || item.tags.includes(newTagInput.trim())}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {item.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded text-sm"
                    >
                      <FiTag className="w-3 h-3 mr-1" />
                      {tag}
                      <button
                        onClick={() => {
                          const newTags = item.tags.filter((_, i) => i !== index);
                          handleTagChange(showTagModal.itemIndex, newTags);
                        }}
                        className="ml-1 text-primary/70 hover:text-primary"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Tags</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {suggestedTags.length > 0 ? (
                  suggestedTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (!item.tags.includes(tag.name)) {
                          handleTagChange(showTagModal.itemIndex, [...item.tags, tag.name]);
                        }
                      }}
                      disabled={item.tags.includes(tag.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        item.tags.includes(tag.name)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <FiTag className="w-3 h-3 mr-2 inline" />
                      {tag.name} ({tag.usage_count})
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No tags found. Create a new one above.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWorkspaceModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Save to Workspace</h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose a workspace to save {selectedItems.length} selected items
              </p>
            </div>
            <button
              onClick={() => setShowWorkspaceModal(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={workspaceSearchQuery}
                onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {allWorkspaceTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {allWorkspaceTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedWorkspaceTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
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

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredWorkspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => setSelectedWorkspace(workspace.id)}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkspace === workspace.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{workspace.name}</div>
                    {workspace.clientName && (
                      <div className="text-sm text-gray-500">{workspace.clientName}</div>
                    )}
                    {workspace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {workspace.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedWorkspace === workspace.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedWorkspace === workspace.id && <FiCheck className="w-3 h-3" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowWorkspaceModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveToWorkspace}
              disabled={!selectedWorkspace || isSaving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  <span>Save to Workspace</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderViewModal = () => {
    if (!viewingItem) return null;

    const { item, sourceName, type } = viewingItem;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl max-w-4xl max-h-[80vh] overflow-y-auto p-6 mx-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'chunk'
                  ? isStructuredChunk(item)
                    ? item.title
                    : item.label || 'Content Chunk'
                  : item.tag}
              </h3>
              <p className="text-sm text-gray-500">{sourceName}</p>
            </div>
            <button
              onClick={() => setViewingItem(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="prose max-w-none">
            {type === 'chunk' ? (
              isStructuredChunk(item) ? (
                <div className="space-y-6">
                  {item.content.map((section, index) => (
                    <div key={index} className="border-l-4 border-primary/20 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{section.tag}</h4>
                      <div className="space-y-3">
                        {section.content.map((content, contentIndex) => (
                          <div key={contentIndex} className="text-gray-700">
                            <p className="whitespace-pre-wrap">{content.text}</p>
                            {content.page_number && (
                              <span className="text-xs text-gray-500 mt-1 inline-block">
                                Page {content.page_number}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap">{item.content}</div>
              )
            ) : (
              <div className="space-y-3">
                {item.content.map((content: any, index: number) => (
                  <div key={index} className="text-gray-700">
                    <p className="whitespace-pre-wrap">{content.text}</p>
                    {content.page_number && (
                      <span className="text-xs text-gray-500 mt-1 inline-block">
                        Page {content.page_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper functions for per-document select all
  function getAllSelectableItemsForDoc(result: ExtractedContent) {
    const items: SelectedItem[] = [];
    const sourceName = getSourceName(result);
    result.chunks.forEach((chunk, chunkIndex) => {
      // Chunk
      let content = '';
      let name = '';
      if (isStructuredChunk(chunk)) {
        content = chunk.content
          .map((section) => `${section.tag}\n${section.content.map((c) => c.text).join('\n')}`)
          .join('\n\n');
        name = chunk.title;
      } else {
        content = chunk.content;
        name = chunk.label || chunk.content.substring(0, 50) + '...';
      }
      items.push({
        type: 'chunk',
        sourceId: result.content_source_id,
        sourceName,
        name,
        content,
        tags: [],
        uniqueId: generateItemId(chunk, result.content_source_id, 'chunk', chunkIndex),
        originalData: chunk,
      });
      // Structured sections
      if (isStructuredChunk(chunk)) {
        chunk.content.forEach((minor, sectionIndex) => {
          items.push({
            type: 'section',
            sourceId: result.content_source_id,
            sourceName,
            name: minor.tag,
            content: minor.content.map((c) => c.text).join('\n'),
            tags: [],
            uniqueId: generateItemId(minor, result.content_source_id, 'section', sectionIndex),
            originalData: minor,
          });
        });
      }
    });
    return items;
  }
  function getAllSelectableIdsForDoc(result: ExtractedContent) {
    return getAllSelectableItemsForDoc(result).map((item) => item.uniqueId);
  }
  function allItemsSelectedForDoc(result: ExtractedContent) {
    const docIds = getAllSelectableIdsForDoc(result);
    return (
      docIds.length > 0 && docIds.every((id) => selectedItems.some((item) => item.uniqueId === id))
    );
  }

  useEffect(() => {
    // Auto-save logic: if workspaceId is present and extractedResults is not empty, auto-save all chunks as sections
    async function autoSaveToWorkspace() {
      if (!workspaceId || !extractedResults.length || autoSavedRef.current) return;
      try {
        autoSavedRef.current = true; // Set immediately to prevent any double execution
        // Flatten all chunks from all extractedResults, always as plain text
        const allSections = extractedResults.flatMap((result) =>
          result.chunks.map((chunk) => {
            let content = '';
            if ('content' in chunk) {
              if (Array.isArray(chunk.content)) {
                // StructuredChunk: join all text fields
                content = chunk.content
                  .map((section) =>
                    [
                      section.tag,
                      ...(Array.isArray(section.content) ? section.content.map((c) => c.text) : []),
                    ].join('\n'),
                  )
                  .join('\n\n');
              } else if (typeof chunk.content === 'string') {
                // SimpleChunk: just use the string
                content = chunk.content;
              } else {
                // Fallback: stringify if unknown
                content = String(chunk.content);
              }
            }
            return {
              content,
              name:
                'title' in chunk
                  ? (chunk as any).title
                  : 'label' in chunk
                    ? (chunk as any).label
                    : 'Untitled',
              tags: [],
            };
          }),
        );
        if (allSections.length > 0) {
          // Use the first filename as the source name
          const sourceName =
            extractedResults[0].filename || extractedResults[0].url || 'Extracted Content';
          await createSections(parseInt(workspaceId), sourceName, allSections);
          toast.success('Extracted content auto-saved to workspace!');
          onReset();
        }
      } catch (err) {
        toast.error('Auto-save to workspace failed');
        console.error(err);
      }
    }
    autoSaveToWorkspace();
    // Only run on mount or when extractedResults changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, extractedResults]);

  return (
    <>
      {renderTagModal()}
      {showWorkspaceModal && renderWorkspaceModal()}
      {renderViewModal()}

      <div className="h-full bg-gray-50 flex">
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Extracted Content</h2>
                <p className="text-gray-600 mt-1">
                  Review and select content to save to your workspace
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{totalItems} items extracted</span>
                <button
                  onClick={() => navigate('/dashboard')}
                  type="button"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={onReset}
                  type="button"
                  className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-primary/80">Ready to save to workspace</p>
                </div>
                <button
                  onClick={() => setShowWorkspaceModal(true)}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Save to Workspace
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6 space-y-6">
              {extractedResults.map((result, resultIndex) => {
                if (!result.success) {
                  return (
                    <div
                      key={resultIndex}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <h3 className="font-medium text-red-900 mb-2">
                        Failed to process: {getSourceName(result)}
                      </h3>
                      <p className="text-red-700">{result.error}</p>
                    </div>
                  );
                }

                const sourceName = getSourceName(result);
                return (
                  <div
                    key={resultIndex}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{sourceName}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {result.chunks?.length || 0} content pieces extracted
                        </p>
                      </div>
                      {/* Select All for this document */}
                      {result.chunks && result.chunks.length > 0 && (
                        <div className="flex items-center ml-4">
                          <label
                            htmlFor={`select-all-content-${resultIndex}`}
                            className="text-sm text-gray-700 cursor-pointer mr-2"
                          >
                            Select All
                          </label>
                          <input
                            type="checkbox"
                            id={`select-all-content-${resultIndex}`}
                            checked={allItemsSelectedForDoc(result)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems((prev) => {
                                  // Remove any previous selections for this doc, then add all for this doc
                                  const docIds = getAllSelectableIdsForDoc(result);
                                  const filtered = prev.filter(
                                    (item) => !docIds.includes(item.uniqueId),
                                  );
                                  return [...filtered, ...getAllSelectableItemsForDoc(result)];
                                });
                              } else {
                                setSelectedItems((prev) => {
                                  // Remove all selections for this doc
                                  const docIds = getAllSelectableIdsForDoc(result);
                                  return prev.filter((item) => !docIds.includes(item.uniqueId));
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      {result.chunks?.map((chunk, chunkIndex) =>
                        isStructuredChunk(chunk)
                          ? renderStructuredChunk(chunk, result, chunkIndex)
                          : renderSimpleChunk(chunk, result, chunkIndex),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Selected Items</h3>
                <span className="text-sm text-gray-500">{selectedItems.length} selected</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedItems.map((item, index) => (
                <div
                  key={item.uniqueId}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{item.name}</h4>
                    <button
                      onClick={() => {
                        setSelectedItems((prev) => prev.filter((_, i) => i !== index));
                      }}
                      className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">From: {item.sourceName}</p>

                  <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                    {item.content.substring(0, 150)}
                    {item.content.length > 150 && '...'}
                  </p>

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleAddTag(index)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    + Add Tags
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowWorkspaceModal(true)}
                disabled={selectedItems.length === 0}
                className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save to Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ContentResults;
