/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiFile,
  FiFileText,
  FiGrid,
  FiImage,
  FiSave,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSections } from '../../../hooks/useSections';
import { type Tag, useTags } from '../../../hooks/useTags';
import { useWorkspace } from '../../../hooks/useWorkspace';

// Updated types to match the new structured format
type ContentSection = {
  tag: string;
  content: Array<{
    text: string;
    page_number: number;
  }>;
};

type StructuredChunk = {
  title: string;
  start_range: string;
  end_range: string;
  content: ContentSection[];
};

type SimpleChunk = {
  content: string;
  label: string;
  file_source?: string;
  page?: number;
  section_type?: string;
};

type Chunk = StructuredChunk | SimpleChunk;

type ExtractedImage = {
  path: string;
  page_number?: number;
  caption?: string;
  ocr_text?: string;
};

type ExtractedTable = {
  path: string;
  page_number?: number;
  caption?: string;
  data?: any[];
};

type ExtractedContent = {
  success: boolean;
  content_source_id: number;
  chunks: Chunk[];
  images?: ExtractedImage[];
  tables?: ExtractedTable[];
  filename?: string;
  url?: string;
  error?: string;
  type?: string;
};

type SelectedItem = {
  type: 'chunk' | 'section' | 'image' | 'table';
  sourceId: number;
  sourceName: string;
  name: string;
  content: string;
  tags: string[];
  uniqueId: string;
  originalData?: any;
};

interface ContentResultsProps {
  extractedResults: ExtractedContent[];
  onReset: () => void;
}

const ContentResults: React.FC<ContentResultsProps> = ({ extractedResults, onReset }) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewingItem, setViewingItem] = useState<{
    item: any;
    sourceName: string;
    type: 'chunk' | 'section' | 'image' | 'table';
  } | null>(null);
  const [showTagModal, setShowTagModal] = useState<{ itemIndex: number } | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [selectedWorkspaceTags, setSelectedWorkspaceTags] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'tables'>('content');

  const navigate = useNavigate();
  const { createSections } = useSections();
  const { tags, fetchAllSectionTags, searchTags } = useTags();
  const { workspaces, fetchWorkspaces } = useWorkspace();

  const debouncedTagSearch = useDebounce(tagSearchQuery, 300);

  // Helper functions
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
    type: 'chunk' | 'section' | 'image' | 'table',
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
        case 'image':
          content = item.ocr_text || item.caption || 'Image content';
          name = item.caption || `Image ${index + 1}`;
          break;
        case 'table':
          content = JSON.stringify(item.data, null, 2);
          name = item.caption || `Table ${index + 1}`;
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
    type: 'chunk' | 'section' | 'image' | 'table',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setViewingItem({ item, sourceName, type });
  };

  // Render structured content
  const renderStructuredChunk = (
    chunk: StructuredChunk,
    result: ExtractedContent,
    chunkIndex: number,
  ) => {
    const sourceName = getSourceName(result);
    const sectionId = `${result.content_source_id}-${chunkIndex}`;
    const isExpanded = expandedSections.has(sectionId);

    return (
      <div key={chunkIndex} className="border border-gray-200 rounded-lg">
        <div
          className={`p-4 cursor-pointer transition-all ${
            isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex)
              ? 'border-primary bg-primary/5'
              : 'hover:border-gray-300'
          }`}
          onClick={() =>
            handleItemToggle(chunk, result.content_source_id, sourceName, 'chunk', chunkIndex)
          }
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex)
                  ? 'border-primary bg-primary'
                  : 'border-gray-300'
              }`}
            >
              {isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex) && (
                <FiCheck className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-black">{chunk.title}</h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                  Pages {chunk.start_range}-{chunk.end_range}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(sectionId);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <FiChevronDown className="w-4 h-4" />
                  ) : (
                    <FiChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{chunk.content.length} sections</p>
            </div>
            <button
              onClick={(e) => handleViewItem(chunk, sourceName, 'chunk', e)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="View full content"
            >
              <FiEye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              {chunk.content.map((section, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isItemSelected(section, result.content_source_id, 'section', sectionIndex)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemToggle(
                      section,
                      result.content_source_id,
                      sourceName,
                      'section',
                      sectionIndex,
                    );
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 ${
                        isItemSelected(section, result.content_source_id, 'section', sectionIndex)
                          ? 'border-primary bg-primary'
                          : 'border-gray-300'
                      }`}
                    >
                      {isItemSelected(
                        section,
                        result.content_source_id,
                        'section',
                        sectionIndex,
                      ) && <FiCheck className="w-2 h-2 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-black">{section.tag}</h5>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                        {section.content
                          .map((c) => c.text)
                          .join(' ')
                          .substring(0, 150)}
                        ...
                      </p>
                      <span className="text-xs text-gray-500">
                        {section.content.length} text blocks
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleViewItem(section, sourceName, 'section', e)}
                      className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="View section"
                    >
                      <FiEye className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render simple content
  const renderSimpleChunk = (chunk: SimpleChunk, result: ExtractedContent, chunkIndex: number) => {
    const sourceName = getSourceName(result);

    return (
      <div
        key={chunkIndex}
        className={`p-4 border rounded-lg cursor-pointer transition-all ${
          isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex)
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() =>
          handleItemToggle(chunk, result.content_source_id, sourceName, 'chunk', chunkIndex)
        }
      >
        <div className="flex items-start space-x-3">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
              isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex)
                ? 'border-primary bg-primary'
                : 'border-gray-300'
            }`}
          >
            {isItemSelected(chunk, result.content_source_id, 'chunk', chunkIndex) && (
              <FiCheck className="w-3 h-3 text-white" />
            )}
          </div>
          <div className="flex-1">
            {chunk.label && <h4 className="font-medium text-black mb-2">{chunk.label}</h4>}
            <p className="text-sm text-neutral-700 line-clamp-3">{chunk.content}</p>
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
              </div>
            )}
          </div>
          <button
            onClick={(e) => handleViewItem(chunk, sourceName, 'chunk', e)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="View full content"
          >
            <FiEye className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render images
  const renderImages = (images: ExtractedImage[], result: ExtractedContent) => {
    if (!images || images.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              isItemSelected(image, result.content_source_id, 'image', index)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() =>
              handleItemToggle(
                image,
                result.content_source_id,
                getSourceName(result),
                'image',
                index,
              )
            }
          >
            <div className="flex items-start space-x-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                  isItemSelected(image, result.content_source_id, 'image', index)
                    ? 'border-primary bg-primary'
                    : 'border-gray-300'
                }`}
              >
                {isItemSelected(image, result.content_source_id, 'image', index) && (
                  <FiCheck className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FiImage className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-black text-sm">
                    {image.caption || `Image ${index + 1}`}
                  </h4>
                </div>
                {image.page_number && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Page {image.page_number}
                  </span>
                )}
                {image.ocr_text && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">OCR: {image.ocr_text}</p>
                )}
              </div>
              <button
                onClick={(e) => handleViewItem(image, getSourceName(result), 'image', e)}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="View image"
              >
                <FiEye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render tables
  const renderTables = (tables: ExtractedTable[], result: ExtractedContent) => {
    if (!tables || tables.length === 0) return null;

    return (
      <div className="space-y-4">
        {tables.map((table, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              isItemSelected(table, result.content_source_id, 'table', index)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() =>
              handleItemToggle(
                table,
                result.content_source_id,
                getSourceName(result),
                'table',
                index,
              )
            }
          >
            <div className="flex items-start space-x-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                  isItemSelected(table, result.content_source_id, 'table', index)
                    ? 'border-primary bg-primary'
                    : 'border-gray-300'
                }`}
              >
                {isItemSelected(table, result.content_source_id, 'table', index) && (
                  <FiCheck className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FiGrid className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-black text-sm">
                    {table.caption || `Table ${index + 1}`}
                  </h4>
                </div>
                {table.page_number && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Page {table.page_number}
                  </span>
                )}
                {table.data && (
                  <p className="text-xs text-gray-600 mt-2">
                    {Array.isArray(table.data)
                      ? `${table.data.length} rows`
                      : 'Table data available'}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => handleViewItem(table, getSourceName(result), 'table', e)}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="View table"
              >
                <FiEye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Rest of the component remains similar but with updated data handling
  const handleItemNameChange = (index: number, name: string) => {
    setSelectedItems((prev) => prev.map((item, i) => (i === index ? { ...item, name } : item)));
  };

  const handleRemoveTag = (itemIndex: number, tagIndex: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i === itemIndex) {
          const newTags = item.tags.filter((_, ti) => ti !== tagIndex);
          return { ...item, tags: newTags };
        }
        return item;
      }),
    );
  };

  const handleShowTagModal = (itemIndex: number) => {
    setShowTagModal({ itemIndex });
    setTagSearchQuery('');
    setSuggestedTags(tags.slice(0, 10));
  };

  const handleSelectSuggestedTag = (tagName: string, itemIndex: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i === itemIndex) {
          const newTags = item.tags.includes(tagName) ? item.tags : [...item.tags, tagName];
          return { ...item, tags: newTags };
        }
        return item;
      }),
    );
    setShowTagModal(null);
  };

  const handleAddCustomTag = (itemIndex: number) => {
    const tagValue = tagSearchQuery.trim();
    if (!tagValue) return;

    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i === itemIndex) {
          const newTags = item.tags.includes(tagValue) ? item.tags : [...item.tags, tagValue];
          return { ...item, tags: newTags };
        }
        return item;
      }),
    );
    setShowTagModal(null);
  };

  const handleSaveToWorkspace = async () => {
    if (!selectedWorkspace || selectedItems.length === 0) return;

    const workspace = workspaces.find((ws) => ws.id === selectedWorkspace);
    if (!workspace) return;

    setIsSaving(true);
    try {
      const itemsBySource = selectedItems.reduce(
        (acc, item) => {
          if (!acc[item.sourceName]) {
            acc[item.sourceName] = [];
          }
          acc[item.sourceName].push({
            content: item.content,
            name: item.name,
            tags: item.tags,
          });
          return acc;
        },
        {} as Record<string, Array<{ content: string; name: string; tags: string[] }>>,
      );

      for (const [sourceName, items] of Object.entries(itemsBySource)) {
        await createSections(parseInt(workspace.id), sourceName, items);
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

  // Initialize data fetching
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

  // Handle tag search
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

  // Set initial suggested tags
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

  const handleWorkspaceTagToggle = (tag: string) => {
    setSelectedWorkspaceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const totalItems = extractedResults.reduce((acc, result) => {
    if (!result.success) return acc;

    let count = result.chunks?.length || 0;
    count += result.images?.length || 0;
    count += result.tables?.length || 0;

    return acc + count;
  }, 0);

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
                  {extractedResults.length} source(s) processed • {selectedItems.length} items
                  selected • {totalItems} total items
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
              {selectedItems.length > 0 && (
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
                        <div className="flex-1">
                          <h3 className="font-semibold text-black">{getSourceName(result)}</h3>
                          <div className="flex items-center space-x-4 text-sm text-neutral-600">
                            <span>{result.chunks?.length || 0} content sections</span>
                            {result.images && result.images.length > 0 && (
                              <span>{result.images.length} images</span>
                            )}
                            {result.tables && result.tables.length > 0 && (
                              <span>{result.tables.length} tables</span>
                            )}
                          </div>
                        </div>
                        {result.type && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded uppercase">
                            {result.type}
                          </span>
                        )}
                        {!result.success && (
                          <div className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-md">
                            Failed: {result.error}
                          </div>
                        )}
                      </div>

                      {result.success && (
                        <div className="flex space-x-1 mt-4">
                          <button
                            onClick={() => setActiveTab('content')}
                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                              activeTab === 'content'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <FiFileText className="w-4 h-4 inline mr-1" />
                            Content ({result.chunks?.length || 0})
                          </button>
                          {result.images && result.images.length > 0 && (
                            <button
                              onClick={() => setActiveTab('images')}
                              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                activeTab === 'images'
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <FiImage className="w-4 h-4 inline mr-1" />
                              Images ({result.images.length})
                            </button>
                          )}
                          {result.tables && result.tables.length > 0 && (
                            <button
                              onClick={() => setActiveTab('tables')}
                              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                activeTab === 'tables'
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <FiGrid className="w-4 h-4 inline mr-1" />
                              Tables ({result.tables.length})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {result.success && (
                      <div className="p-6">
                        {activeTab === 'content' && result.chunks && result.chunks.length > 0 && (
                          <div className="space-y-4">
                            {result.chunks.map((chunk, chunkIndex) =>
                              isStructuredChunk(chunk)
                                ? renderStructuredChunk(chunk, result, chunkIndex)
                                : renderSimpleChunk(chunk as SimpleChunk, result, chunkIndex),
                            )}
                          </div>
                        )}

                        {activeTab === 'images' &&
                          result.images &&
                          renderImages(result.images, result)}

                        {activeTab === 'tables' &&
                          result.tables &&
                          renderTables(result.tables, result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="w-1/3 border-l border-gray-200 bg-white p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-black mb-4">
                  Selected Items ({selectedItems.length})
                </h3>
                <div className="space-y-4">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 mb-2">
                          {item.type === 'chunk' && <FiFileText className="w-4 h-4 text-primary" />}
                          {item.type === 'section' && (
                            <FiFileText className="w-4 h-4 text-blue-500" />
                          )}
                          {item.type === 'image' && <FiImage className="w-4 h-4 text-green-500" />}
                          {item.type === 'table' && <FiGrid className="w-4 h-4 text-purple-500" />}
                          <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Item Name
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemNameChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter item name..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Tags
                          </label>

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.tags.map((tag, tagIndex) => (
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

                        <p className="text-xs text-neutral-600 line-clamp-2">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {viewingItem.type === 'chunk' && <FiFileText className="w-5 h-5 text-primary" />}
                  {viewingItem.type === 'section' && (
                    <FiFileText className="w-5 h-5 text-blue-500" />
                  )}
                  {viewingItem.type === 'image' && <FiImage className="w-5 h-5 text-green-500" />}
                  {viewingItem.type === 'table' && <FiGrid className="w-5 h-5 text-purple-500" />}
                  <h3 className="text-xl font-semibold text-black capitalize">
                    {viewingItem.type} Content
                  </h3>
                </div>
                <p className="text-sm text-neutral-600">Source: {viewingItem.sourceName}</p>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                {viewingItem.type === 'chunk' && isStructuredChunk(viewingItem.item) && (
                  <div>
                    <h2>{viewingItem.item.title}</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Pages {viewingItem.item.start_range}-{viewingItem.item.end_range}
                    </p>
                    {viewingItem.item.content.map((section, index) => (
                      <div key={index} className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">{section.tag}</h3>
                        {section.content.map((content, contentIndex) => (
                          <div key={contentIndex} className="mb-3">
                            <p className="text-sm">{content.text}</p>
                            <span className="text-xs text-gray-500">
                              Page {content.page_number}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {viewingItem.type === 'section' && (
                  <div>
                    <h2>{viewingItem.item.tag}</h2>
                    {viewingItem.item.content.map((content: any, index: number) => (
                      <div key={index} className="mb-3">
                        <p className="text-sm">{content.text}</p>
                        <span className="text-xs text-gray-500">Page {content.page_number}</span>
                      </div>
                    ))}
                  </div>
                )}

                {viewingItem.type === 'chunk' && !isStructuredChunk(viewingItem.item) && (
                  <div>
                    <h2>{viewingItem.item.label || 'Content'}</h2>
                    <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans leading-relaxed">
                      {viewingItem.item.content}
                    </pre>
                  </div>
                )}

                {viewingItem.type === 'image' && (
                  <div>
                    <h2>{viewingItem.item.caption || 'Image'}</h2>
                    {viewingItem.item.page_number && (
                      <p className="text-sm text-gray-600 mb-4">
                        Page {viewingItem.item.page_number}
                      </p>
                    )}
                    {viewingItem.item.ocr_text && (
                      <div>
                        <h3>OCR Text:</h3>
                        <p className="text-sm">{viewingItem.item.ocr_text}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-4">
                      Image path: {viewingItem.item.path}
                    </p>
                  </div>
                )}

                {viewingItem.type === 'table' && (
                  <div>
                    <h2>{viewingItem.item.caption || 'Table'}</h2>
                    {viewingItem.item.page_number && (
                      <p className="text-sm text-gray-600 mb-4">
                        Page {viewingItem.item.page_number}
                      </p>
                    )}
                    {viewingItem.item.data && (
                      <div className="overflow-x-auto">
                        <pre className="text-xs bg-gray-50 p-4 rounded">
                          {JSON.stringify(viewingItem.item.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setViewingItem(null)}
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
                      onClick={() => handleSelectSuggestedTag(tag.name, showTagModal.itemIndex)}
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
                    onClick={() => handleAddCustomTag(showTagModal.itemIndex)}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No workspaces found matching your criteria
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
