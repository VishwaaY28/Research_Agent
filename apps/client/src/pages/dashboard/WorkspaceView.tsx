import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCheck,
  FiEye,
  FiFile,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTag,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useContent,
  type GeneratedContent,
  type GeneratedContentDetails,
} from '../../hooks/useContent';
import { useDebounce } from '../../hooks/useDebounce';
import { useSections, type Section } from '../../hooks/useSections';
import { useSources } from '../../hooks/useSources';
import { useTags } from '../../hooks/useTags';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useWorkspaceTypes } from '../../hooks/useWorkspaceTypes';
import { API } from '../../utils/constants';
import SelectChunksModal from './SelectChunksModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown';

type Workspace = {
  id: string;
  name: string;
  clientName?: string;
  tags: string[];
  workspaceType?: string;
};

const WorkspaceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // UI state: show limited tags initially, allow expand
  const [showAllTags, setShowAllTags] = useState(false);
  const TAG_PREVIEW_COUNT = 6;
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [currentTags, setCurrentTags] = useState<any[]>([]);
  const { listSources } = useSources();
  const [sourceChunks, setSourceChunks] = useState<{ [key: number]: any[] }>({}); // sourceId -> chunks
  const [sourceText, setSourceText] = useState('');
  const [extractedResults, setExtractedResults] = useState<any[]>([]);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  // Add state for search and selection
  const [sourceSearch, setSourceSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<any[]>([]);
  const [selectedSourceForChunks, setSelectedSourceForChunks] = useState<any | null>(null);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [selectedChunks, setSelectedChunks] = useState<{ [key: number]: Set<string> }>({}); // sourceId -> chunk indices
  const [selectingSourceId, setSelectingSourceId] = useState<number | null>(null);
  const [tab, setTab] = useState<'content' | 'sections' | 'generated'>('content');
  const { getWorkspaceGeneratedContent, getGeneratedContentDetails, deleteGeneratedContent } =
    useContent();
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedLoading, setGeneratedLoading] = useState(false);
  const [viewingGenerated, setViewingGenerated] = useState<GeneratedContentDetails | null>(null);
  // Fetch generated content when tab is 'generated'
  useEffect(() => {
    if (tab === 'generated' && id) {
      setGeneratedLoading(true);
      getWorkspaceGeneratedContent(id)
        .then((data) => setGeneratedContent(data))
        .catch(() => setGeneratedContent([]))
        .finally(() => setGeneratedLoading(false));
    }
  }, [tab, id, getWorkspaceGeneratedContent]);
  const [sectionPrompts, setSectionPrompts] = useState<{ [sectionId: string]: any[] }>({});
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [sectionTemplates, setSectionTemplates] = useState<any[]>([]);
  const [sectionTemplatesLoading, setSectionTemplatesLoading] = useState(false);
  const [workspaceTypeName, setWorkspaceTypeName] = useState<string | null>(null);
  const { workspaceTypes } = useWorkspaceTypes();
  const [deleteTarget, setDeleteTarget] = useState<null | {
    id: string | number;
    name: string;
    type: 'section';
    closeModal?: () => void;
    ids?: (string | number)[];
  }>(null);
  const [selectedSections, setSelectedSections] = useState<(string | number)[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPrompt, setNewSectionPrompt] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const { createSections } = useSections();

  const debouncedSearch = useDebounce(search, 500);

  const { fetchWorkspace } = useWorkspace();
  const { fetchSections, searchSections, deleteSection } = useSections();
  const { fetchAllSectionTags } = useTags();

  useEffect(() => {
    const fetchTagsForSections = async () => {
      try {
        const tags = await fetchAllSectionTags();
        setCurrentTags(tags);
      } catch (error) {
        console.error('Failed to fetch section tags:', error);
        setCurrentTags([]);
      }
    };

    fetchTagsForSections();
  }, [fetchAllSectionTags]);

  useEffect(() => {
    if (!id) return;

    const loadWorkspaceData = async () => {
      try {
        setLoading(true);

        const workspaceData = await fetchWorkspace(id);
        if (!workspaceData) {
          setWorkspace(null);
          setLoading(false);
          return;
        }

        setWorkspace({
          id: workspaceData.id,
          name: workspaceData.name,
          clientName: workspaceData.client,
          tags: workspaceData.tags || [],
          workspaceType: workspaceData.workspaceType,
        });

        // Fetch workspace type name if workspaceType is a number
        if (workspaceData.workspaceType && typeof workspaceData.workspaceType === 'number') {
          try {
            const res = await fetch(
              `${API.BASE_URL()}/api/prompt-templates/types/${workspaceData.workspaceType}`,
              {
                headers: {
                  Authorization: localStorage.getItem('token')
                    ? `Bearer ${localStorage.getItem('token')}`
                    : '',
                },
              },
            );
            if (res.ok) {
              const data = await res.json();
              setWorkspaceTypeName(data.name || String(workspaceData.workspaceType));
            } else {
              setWorkspaceTypeName(String(workspaceData.workspaceType));
            }
          } catch {
            setWorkspaceTypeName(String(workspaceData.workspaceType));
          }
        } else if (workspaceData.workspaceType && typeof workspaceData.workspaceType === 'string') {
          setWorkspaceTypeName(workspaceData.workspaceType);
        } else {
          setWorkspaceTypeName(null);
        }

        const sectionsData = await fetchSections(id);
        setAllSections(sectionsData);
        setSections(sectionsData);
      } catch (error) {
        console.error('Failed to fetch workspace data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceData();
  }, [id]);

  // Handle selection of a section
  const handleSectionSelection = (sectionId: string | number) => {
    setSelectedSections((prev) => {
      if (prev.includes(sectionId)) {
        // If already selected, remove it
        const newSelected = prev.filter((id) => id !== sectionId);
        // If no sections are selected after removal, set selectAll to false
        if (newSelected.length === 0) setSelectAll(false);
        return newSelected;
      } else {
        // If all sections are now selected, set selectAll to true
        const newSelected = [...prev, sectionId];
        if (newSelected.length === filteredData.length) setSelectAll(true);
        return newSelected;
      }
    });
  };

  // Handle select all functionality
  const handleSelectAll = () => {
    setSelectAll((prev) => {
      if (prev) {
        // If currently all selected, deselect all
        setSelectedSections([]);
        return false;
      } else {
        // Select all sections
        setSelectedSections(filteredData.map((section) => section.id));
        return true;
      }
    });
  };

  // Handle bulk delete of sections
  const handleBulkDelete = () => {
    if (selectedSections.length === 0) return;

    // Get names of first 3 sections for display
    const selectedNames = selectedSections
      .map((id) => {
        const section = sections.find((s) => s.id === id);
        return section?.name || 'Content Chunk';
      })
      .slice(0, 3);

    // Create display text
    const nameDisplay = selectedNames.join(', ');
    const additionalCount = selectedSections.length - selectedNames.length;
    const displayName =
      additionalCount > 0
        ? `${nameDisplay} and ${additionalCount} more item${additionalCount > 1 ? 's' : ''}`
        : nameDisplay;

    // Set delete target with multiple IDs
    setDeleteTarget({
      id: selectedSections[0], // We'll still use the first ID for display
      name: `${selectedSections.length} selected item${selectedSections.length > 1 ? 's' : ''} (${displayName})`,
      type: 'section',
      ids: selectedSections,
    });
  };

  useEffect(() => {
    if (!id) return;

    const performSearch = async () => {
      try {
        if (debouncedSearch || selectedTags.length > 0) {
          const searchResults = await searchSections(
            id,
            debouncedSearch || undefined,
            undefined,
            selectedTags.length > 0 ? selectedTags : undefined,
          );
          setSections(searchResults);
        } else {
          setSections(allSections);
        }
      } catch (error) {
        console.error('Failed to search sections:', error);
        setSections(allSections);
      }
    };

    performSearch();
  }, [debouncedSearch, selectedTags, id, allSections]);

  const allTags = React.useMemo(() => {
    // Only use tags from the sections actually ingested in this workspace
    const tagSet = new Set<string>();
    allSections.forEach((section) => {
      (section.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allSections]);

  const getFilteredData = React.useCallback(() => {
    if (!search) return sections;
    return sections.filter((section: any) => {
      const searchLower = search.toLowerCase();
      return (
        section.content.toLowerCase().includes(searchLower) ||
        (section.tags || []).some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
        (section.name && section.name.toLowerCase().includes(searchLower)) ||
        (section.content_source && section.content_source.toLowerCase().includes(searchLower))
      );
    });
  }, [sections, search]);

  const filteredData = getFilteredData();

  const toggleTag = React.useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleViewSection = React.useCallback((section: Section, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingSection(section);
  }, []);

  const closeModal = React.useCallback(() => {
    setViewingSection(null);
  }, []);

  // Fetch sources for this workspace
  const fetchSources = async () => {
    try {
      const allSources = await listSources();
      setExtractedResults(allSources);
    } catch (err) {
      setExtractedResults([]);
    }
  };

  // Fetch chunks/text for a source (mocked, replace with real fetch if needed)
  const fetchSourceChunks = async (source: any) => {
    // TODO: Replace with real API call to fetch chunks and extracted text for the source
    setSourceChunks(source.chunks || []);
    setSourceText(source.extracted_text || '');
  };

  // Fetch sources when modal opens
  useEffect(() => {
    if (isAddContentModalOpen) {
      setSourcesLoading(true);
      listSources()
        .then((data) => {
          // Always use data.sources if present and is an array, otherwise fallback to data if it's an array
          if (data && Array.isArray(data.sources)) {
            setSources(data.sources);
          } else if (Array.isArray(data)) {
            setSources(data);
          } else {
            setSources([]);
          }
        })
        .catch(() => setSources([]))
        .finally(() => setSourcesLoading(false));
    }
  }, [isAddContentModalOpen, listSources]);

  // Fix fetchChunksForSource to return Promise<any[]>
  const fetchChunksForSource = async (sourceId: number): Promise<any[]> => {
    if (sourceChunks[sourceId]) return sourceChunks[sourceId]; // already fetched
    try {
      const res = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.CHUNKS(sourceId)}`,
      );
      const data = await res.json();
      setSourceChunks((prev) => ({ ...prev, [sourceId]: data.chunks || [] }));
      return data.chunks || [];
    } catch {
      setSourceChunks((prev) => ({ ...prev, [sourceId]: [] }));
      return [];
    }
  };

  // Filtered sources logic
  const filteredSources = sources.filter(
    (source) =>
      source.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      source.type.toLowerCase().includes(sourceSearch.toLowerCase()),
  );

  const toggleSourceSelection = (source: any) => {
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.id === source.id);
      if (exists) {
        return prev.filter((s) => s.id !== source.id);
      } else {
        return [...prev, source];
      }
    });
  };

  // Fetch chunks for a source
  const handleAddSource = (source: any) => {
    // Navigate to the in-page chunk selection view
    navigate(`/dashboard/workspaces/${workspace?.id}/add-content/${source.id}`);
  };

  const handleToggleChunk = (idx: number) => {
    setSelectedChunks((prev) => {
      const sourceId = selectingSourceId || 0; // Default to 0 if selectingSourceId is null
      const currentSet = prev[sourceId] || new Set();
      const newSet = new Set(currentSet);
      if (newSet.has(idx.toString())) {
        newSet.delete(idx.toString());
      } else {
        newSet.add(idx.toString());
      }
      return { ...prev, [sourceId]: newSet };
    });
  };

  const handleSaveChunksToWorkspace = async () => {
    if (!workspace) {
      toast.error('No workspace loaded');
      return;
    }
    // Debug: log selectedChunks and sourceChunks
    console.log('selectedChunks:', selectedChunks);
    console.log('sourceChunks:', sourceChunks);
    // Prepare content selection payload
    const chunks: any[] = [];
    Object.entries(selectedChunks).forEach(([sourceId, idxSet]) => {
      const sid = Number(sourceId);
      const chunkArr = sourceChunks[sid] || [];
      // Track which major chunks are fully selected to avoid duplicate minors
      const majorSelected = new Set<string>();
      idxSet.forEach((key) => {
        if (/^\d+$/.test(key)) {
          // Major chunk selected
          const idx = Number(key);
          const chunk = chunkArr[idx];
          if (chunk) {
            let heading = chunk.name || chunk.title || '';
            try {
              const parsed =
                typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
              if (Array.isArray(parsed)) {
                const firstTag = parsed.find((item: any) => item.tag && item.tag.trim() !== '');
                if (firstTag && firstTag.tag) heading = firstTag.tag;
              }
            } catch {}
            chunks.push({
              name: heading || `Chunk ${idx + 1}`,
              content:
                typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
              source: sources.find((s) => s.id === sid)?.name || '',
              tags: chunk.tags || [],
              content_source_id: sid,
            });
            majorSelected.add(key);
          }
        } else if (/^\d+-\d+$/.test(key)) {
          // Minor chunk selected
          const [majorIdx, minorIdx] = key.split('-').map(Number);
          // If the major chunk is also selected, skip this minor to avoid duplicate
          if (majorSelected.has(String(majorIdx))) return;
          const majorChunk = chunkArr[majorIdx];
          if (majorChunk && Array.isArray(majorChunk.content)) {
            const minor = majorChunk.content[minorIdx];
            if (minor) {
              chunks.push({
                name: minor.tag || minor.title || minor.name || `Minor Chunk ${minorIdx + 1}`,
                content: minor.content
                  ? typeof minor.content === 'string'
                    ? minor.content
                    : JSON.stringify(minor.content)
                  : '',
                source: sources.find((s) => s.id === sid)?.name || '',
                tags: minor.tags || [],
                content_source_id: sid,
              });
            }
          }
        }
      });
    });
    // Debug: log chunks
    console.log('chunks to save:', chunks);
    if (chunks.length === 0) {
      toast.error('No chunks selected to save');
      return;
    }
    try {
      await createSections(parseInt(workspace.id), 'Imported Content', chunks);
      setIsAddContentModalOpen(false);
      setSelectedChunks({});
      setSourceChunks({});
      setSelectingSourceId(null);
      setSources([]);
      setSections((prev) => [...prev, ...chunks]);
      toast.success('Content added to workspace');
    } catch (err) {
      toast.error('Failed to save content to workspace');
      console.error('Save to workspace error:', err);
    }
  };

  // Fetch prompt for a section
  const fetchPromptForSection = async (sectionId: string | number) => {
    setPromptLoading(true);
    try {
      const res = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
      );
      if (!res.ok) throw new Error('Failed to fetch prompt');
      const data = await res.json();
      // Use the first prompt or empty string
      setSectionPrompts((prev) => ({ ...prev, [sectionId]: data }));
    } catch (err) {
      setSectionPrompts((prev) => ({ ...prev, [sectionId]: [] }));
    } finally {
      setPromptLoading(false);
    }
  };

  // Fetch section templates for the workspace type (by ID, resolving name if needed)
  const fetchSectionTemplates = async (workspaceType: string | number) => {
    setSectionTemplatesLoading(true);
    try {
      let wsTypeId: string | number | null = null;
      if (workspaceType && !isNaN(Number(workspaceType))) {
        wsTypeId = String(workspaceType);
      } else if (workspaceType && typeof workspaceType === 'string' && workspaceTypes.length > 0) {
        const found = workspaceTypes.find((t) => t.name === workspaceType);
        wsTypeId = found ? String(found.id) : null;
      }
      if (!wsTypeId && workspaceTypes.length > 0) {
        wsTypeId = String(workspaceTypes[0].id);
      }
      if (!wsTypeId) {
        setSectionTemplates([]);
        setSectionTemplatesLoading(false);
        return;
      }
      const res = await fetch(`${API.BASE_URL()}/api/prompt-templates/types/${wsTypeId}/sections`, {
        headers: {
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch section templates');
      const data = await res.json();
      setSectionTemplates(data);
    } catch (err) {
      setSectionTemplates([]);
    } finally {
      setSectionTemplatesLoading(false);
    }
  };

  // Fetch section templates when switching to the Sections tab
  useEffect(() => {
    if (tab === 'sections' && workspace?.workspaceType) {
      fetchSectionTemplates(workspace.workspaceType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, workspace?.workspaceType, workspaceTypes]);

  const fetchPromptsForSection = async (sectionId: string | number) => {
    setPromptsLoading(true);
    try {
      const res = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
      );
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setSectionPrompts((prev) => ({ ...prev, [sectionId]: data }));
    } catch (err) {
      setSectionPrompts((prev) => ({ ...prev, [sectionId]: [] }));
    } finally {
      setPromptsLoading(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.error('Section name is required');
      return;
    }

    if (!workspace?.workspaceType) {
      toast.error('Workspace type not found');
      return;
    }

    setAddingSection(true);
    try {
      // 1. Resolve workspace type ID
      let wsTypeId: string | number | null = null;
      if (workspace.workspaceType && !isNaN(Number(workspace.workspaceType))) {
        wsTypeId = String(workspace.workspaceType);
      } else if (
        workspace.workspaceType &&
        typeof workspace.workspaceType === 'string' &&
        workspaceTypes.length > 0
      ) {
        const found = workspaceTypes.find((t) => t.name === workspace.workspaceType);
        wsTypeId = found ? String(found.id) : null;
      }
      if (!wsTypeId && workspaceTypes.length > 0) {
        wsTypeId = String(workspaceTypes[0].id);
      }
      if (!wsTypeId) {
        toast.error('Workspace type ID not found');
        setAddingSection(false);
        return;
      }
      // 2. Create the section template
      const sectionResponse = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/types/${wsTypeId}/sections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify({
            name: newSectionName.trim(),
            order: sectionTemplates.length,
          }),
        },
      );

      if (!sectionResponse.ok) {
        const error = await sectionResponse.text();
        toast.error(error || 'Failed to create section');
        return;
      }

      const sectionData = await sectionResponse.json();
      const sectionId = sectionData.id;

      // 3. Create the prompt for the section
      const promptResponse = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify({
            prompt: newSectionPrompt.trim() || 'Provide content for this section.',
            is_default: true,
          }),
        },
      );

      if (!promptResponse.ok) {
        const error = await promptResponse.text();
        toast.error(error || 'Failed to create prompt');
        return;
      }

      // 4. Refresh the section templates list
      await fetchSectionTemplates(wsTypeId);

      // 5. Reset form and close modal
      setNewSectionName('');
      setNewSectionPrompt('');
      setIsAddSectionModalOpen(false);
      toast.success('Section added successfully!');
    } catch (error) {
      console.error('Error adding section:', error);
      toast.error('Failed to add section');
    } finally {
      setAddingSection(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FiFileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Workspace not found</h3>
          <p className="text-gray-600 mb-6">The workspace you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/workspaces')}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      {/* Add Content Modal */}
      {isAddContentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">
                Add Content from Existing Sources
              </h3>
              <button
                onClick={() => setIsAddContentModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search existing sources..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12">
                <FiFile className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content sources found</h3>
                <p className="text-gray-500 mb-4">You haven't uploaded any content sources yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sources
                  .filter(
                    (source) =>
                      source.name.toLowerCase() !== 'imported content' &&
                      source.type.toLowerCase() !== 'docx' &&
                      (source.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
                        source.type.toLowerCase().includes(sourceSearch.toLowerCase())),
                  )
                  .map((source) => (
                    <div
                      key={source.id}
                      className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-lg transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <FiFileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                            onClick={() => {
                              setSelectingSourceId(source.id);
                              fetchChunksForSource(source.id);
                            }}
                          >
                            {source.name}
                          </button>
                          <p className="text-xs text-gray-500 mt-1">{source.type}</p>
                        </div>
                      </div>
                      {selectedChunks[source.id] && selectedChunks[source.id].size > 0 && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 font-medium">
                            {selectedChunks[source.id].size} chunk(s) selected
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
            {/* Selected Chunks Summary */}
            {Object.keys(selectedChunks).length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 mt-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Selected Chunks Summary</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(selectedChunks).map(([sourceId, idxSet]) => {
                    const sid = Number(sourceId);
                    const chunkArr = sourceChunks[sid] || [];
                    const source = sources.find((s) => s.id === sid);
                    return (
                      <div key={sid} className="bg-white rounded-xl p-4 border border-blue-200">
                        <div className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                          <FiFileText className="w-4 h-4" />
                          <span>{source?.name || source?.title || 'Untitled Section'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[...idxSet].map((idx) => {
                            const chunk = chunkArr[Number(idx)];
                            if (!chunk) return null;
                            // Find the first non-empty tag in chunk.content
                            let chunkTitle = '';
                            if (Array.isArray(chunk.content)) {
                              const firstTag = chunk.content.find(
                                (item: any) => item.tag && item.tag.trim() !== '',
                              );
                              if (firstTag) chunkTitle = firstTag.tag;
                            }
                            if (!chunkTitle)
                              chunkTitle =
                                (chunk as any).name || (chunk as any).title || 'Untitled Chunk';
                            return (
                              <div
                                key={`${sourceId}-${idx}`}
                                className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg"
                              >
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-blue-800 font-medium">
                                  {chunkTitle}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={() => setIsAddContentModalOpen(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!workspace) return;
                  // Prepare content selection payload
                  const chunks: any[] = [];
                  Object.entries(selectedChunks).forEach(([sourceId, idxSet]) => {
                    const sid = Number(sourceId);
                    const chunkArr = sourceChunks[sid] || [];
                    // Track which major chunks are fully selected to avoid duplicate minors
                    const majorSelected = new Set<string>();
                    idxSet.forEach((key) => {
                      if (/^\d+$/.test(key)) {
                        // Major chunk selected
                        const idx = Number(key);
                        const chunk = chunkArr[idx];
                        if (chunk) {
                          let heading = chunk.name || chunk.title || '';
                          try {
                            const parsed =
                              typeof chunk.content === 'string'
                                ? JSON.parse(chunk.content)
                                : chunk.content;
                            if (Array.isArray(parsed)) {
                              const firstTag = parsed.find(
                                (item: any) => item.tag && item.tag.trim() !== '',
                              );
                              if (firstTag && firstTag.tag) heading = firstTag.tag;
                            }
                          } catch {}
                          chunks.push({
                            name: heading || `Chunk ${idx + 1}`,
                            content:
                              typeof chunk.content === 'string'
                                ? chunk.content
                                : JSON.stringify(chunk.content),
                            source: sources.find((s) => s.id === sid)?.name || '',
                            tags: chunk.tags || [],
                            content_source_id: sid,
                          });
                          majorSelected.add(key);
                        }
                      } else if (/^\d+-\d+$/.test(key)) {
                        // Minor chunk selected
                        const [majorIdx, minorIdx] = key.split('-').map(Number);
                        // If the major chunk is also selected, skip this minor to avoid duplicate
                        if (majorSelected.has(String(majorIdx))) return;
                        const majorChunk = chunkArr[majorIdx];
                        if (majorChunk && Array.isArray(majorChunk.content)) {
                          const minor = majorChunk.content[minorIdx];
                          if (minor) {
                            chunks.push({
                              name:
                                minor.tag ||
                                minor.title ||
                                minor.name ||
                                `Minor Chunk ${minorIdx + 1}`,
                              content: minor.content
                                ? typeof minor.content === 'string'
                                  ? minor.content
                                  : JSON.stringify(minor.content)
                                : '',
                              source: sources.find((s) => s.id === sid)?.name || '',
                              tags: minor.tags || [],
                              content_source_id: sid,
                            });
                          }
                        }
                      }
                    });
                  });
                  if (chunks.length === 0) return;
                  try {
                    await createSections(parseInt(workspace.id), 'Imported Content', chunks);
                    setIsAddContentModalOpen(false);
                    setSelectedChunks({});
                    setSourceChunks({});
                    setSelectingSourceId(null);
                    setSources([]);
                    setSections((prev) => [...prev, ...chunks]);
                    // Optionally, show a toast
                  } catch (err) {
                    // Optionally, show error toast
                  }
                }}
                disabled={Object.values(selectedChunks).every((set) => set.size === 0)}
                className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl`}
              >
                Save to Workspace
              </button>
            </div>
            {/* Chunk selection modal */}
            {selectingSourceId !== null && sourceChunks[selectingSourceId] && (
              <SelectChunksModal
                source={sources.find((s) => s.id === selectingSourceId)}
                chunks={sourceChunks[selectingSourceId as number] || []}
                fetchChunks={fetchChunksForSource}
                selected={selectedChunks[selectingSourceId as number] || new Set()}
                onSave={(selectedSet: Set<string>) => {
                  setSelectedChunks((prev) => ({
                    ...prev,
                    [selectingSourceId as number]: selectedSet,
                  }));
                  setSelectingSourceId(null);
                }}
                onClose={() => setSelectingSourceId(null)}
              />
            )}
          </div>
        </div>
      )}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <button
                    onClick={() => navigate('/dashboard/workspaces')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
                </div>
                {workspace.clientName && (
                  <p className="text-gray-600 ml-8">
                    Client: <span className="font-semibold">{workspace.clientName}</span>
                    {workspaceTypeName && (
                      <span className="ml-4">
                        | Type: <span className="font-semibold">{workspaceTypeName}</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddContentModalOpen(true)}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                  <FiPlus className="w-3 h-3" />
                  Add Content
                </button>
                <button
                  onClick={() =>
                    navigate('/dashboard/proposal-authoring', {
                      state: { workspaceId: workspace.id, workspaceType: workspace.workspaceType },
                    })
                  }
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                  <FiZap className="w-3 h-3" />
                  Author
                </button>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 mt-4">
              <button
                className={`px-6 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors ${
                  tab === 'content'
                    ? 'bg-white border-x border-t border-primary text-primary -mb-px'
                    : 'bg-gray-50 text-gray-600 hover:text-primary'
                }`}
                onClick={() => setTab('content')}
              >
                Content
              </button>
              <button
                className={`px-6 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors ${
                  tab === 'sections'
                    ? 'bg-white border-x border-t border-primary text-primary -mb-px'
                    : 'bg-gray-50 text-gray-600 hover:text-primary'
                }`}
                onClick={() => setTab('sections')}
              >
                Sections
              </button>
              <button
                className={`px-6 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors ${
                  tab === 'generated'
                    ? 'bg-white border-x border-t border-primary text-primary -mb-px'
                    : 'bg-gray-50 text-gray-600 hover:text-primary'
                }`}
                onClick={() => setTab('generated')}
              >
                Generated Content
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Tab Content */}
          {tab === 'content' && (
            <>
              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative mr-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search sections by content, name, source, or tags..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full md:w-96 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                    />
                  </div>

                  {filteredData.length > 0 && (
                    <div className="flex items-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        id="select-all-checkbox"
                      />
                      <label
                        htmlFor="select-all-checkbox"
                        className="ml-2 text-sm font-medium text-gray-700"
                      >
                        Select All
                      </label>
                    </div>
                  )}
                </div>

                {allTags.length > 0 && (
                  <div className="flex flex-col w-full">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 mr-2 py-2">
                        Filter by tags:
                      </span>
                      <div className="text-xs text-gray-500">Choose tags to filter sections</div>
                    </div>

                    <div
                      className={`flex flex-wrap gap-2 transition-all duration-200 ${
                        showAllTags ? 'max-h-40 overflow-y-auto pr-2' : ''
                      }`}
                      aria-live="polite"
                    >
                      {(showAllTags ? allTags : allTags.slice(0, TAG_PREVIEW_COUNT)).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/20'
                          }`}
                        >
                          <FiTag className="inline w-3 h-3 mr-1" />
                          {tag}
                          {selectedTags.includes(tag) && (
                            <span className="ml-1 text-xs">
                              ({sections.filter((s) => s.tags?.includes(tag)).length})
                            </span>
                          )}
                        </button>
                      ))}

                      {/* More / Show less toggle */}
                      {allTags.length > TAG_PREVIEW_COUNT && (
                        <button
                          onClick={() => setShowAllTags((v) => !v)}
                          className="px-3 py-1 rounded-full text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          {showAllTags
                            ? 'Show less'
                            : `More (${allTags.length - TAG_PREVIEW_COUNT})`}
                        </button>
                      )}

                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {selectedTags.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Showing {filteredData.length} sections
                    {search && ` matching "${search}"`}
                    {selectedTags.length > 0 && ` with tags: ${selectedTags.join(', ')}`}
                  </div>
                )}
              </div>
              {/* Bulk Delete Button */}
              {selectedSections.length > 0 && (
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 className="h-4 w-4 mr-1" />
                    Delete Selected ({selectedSections.length})
                  </button>
                </div>
              )}{' '}
              {filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredData.map((section) => (
                    <div
                      key={section.id}
                      className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 group cursor-pointer ${
                        selectedSections.includes(section.id)
                          ? 'ring-2 ring-primary ring-opacity-50'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.id)}
                              onChange={() => handleSectionSelection(section.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {section.tags && section.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {section.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium flex items-center"
                                >
                                  <FiTag className="w-3 h-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {(() => {
                            let parsedContent: any[] = [];
                            let previewText = '';

                            if (typeof section.content === 'string') {
                              try {
                                // Try to parse as JSON first
                                const parsed = JSON.parse(section.content.replace(/'/g, '"'));
                                if (Array.isArray(parsed)) {
                                  parsedContent = parsed;
                                } else {
                                  // If it's not an array, treat as simple content
                                  previewText = section.content;
                                }
                              } catch (e) {
                                // If JSON parsing fails, treat as plain text
                                previewText = section.content;
                              }
                            } else if (Array.isArray(section.content)) {
                              parsedContent = section.content;
                            } else {
                              // Fallback to string representation
                              previewText = String(section.content || '');
                            }

                            // If we have parsed content array, extract text from it
                            if (parsedContent.length > 0) {
                              previewText = parsedContent
                                .map((item: any) => {
                                  if (Array.isArray(item.content)) {
                                    return item.content
                                      .map((c: any) => c.text || c.content || '')
                                      .join(' ');
                                  } else if (item.content) {
                                    return typeof item.content === 'string'
                                      ? item.content
                                      : JSON.stringify(item.content);
                                  } else if (item.text) {
                                    return item.text;
                                  } else {
                                    return '';
                                  }
                                })
                                .join(' ');
                            }

                            // If we still don't have preview text, use the raw content
                            if (!previewText && section.content) {
                              if (typeof section.content === 'string') {
                                previewText = section.content;
                              } else {
                                previewText = JSON.stringify(section.content);
                              }
                            }

                            // Heading: first non-empty tag, else section.name (if not 'Chunk X'), else section.source
                            let heading = '';
                            if (parsedContent.length > 0) {
                              const firstTag = parsedContent.find(
                                (item: any) =>
                                  item.tag &&
                                  item.tag.trim() !== '' &&
                                  item.tag.trim().toLowerCase() !== 'untitled section',
                              );
                              if (firstTag) heading = firstTag.tag;
                            }

                            const isChunkName =
                              typeof section.name === 'string' &&
                              /^chunk\s*\d+$/i.test(section.name.trim());
                            if (
                              (!heading ||
                                heading.trim() === '' ||
                                heading.toLowerCase().startsWith('chunk ')) &&
                              section.name &&
                              !isChunkName
                            ) {
                              heading = section.name;
                            } else if (
                              !heading ||
                              heading.trim() === '' ||
                              heading.toLowerCase().startsWith('chunk ') ||
                              isChunkName
                            ) {
                              heading = section.content_source || 'Section';
                            }

                            return (
                              <>
                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                  {heading}
                                </h3>
                                <div className="text-gray-700 text-sm leading-relaxed line-clamp-4 prose prose-sm max-w-none">
                                  {(previewText && previewText.includes('#')) ||
                                  previewText.includes('- ') ||
                                  previewText.includes('## ') ||
                                  previewText.includes('*') ? (
                                    <ReactMarkdown>{previewText}</ReactMarkdown>
                                  ) : (
                                    previewText || 'No content available'
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={(e) => handleViewSection(section, e)}
                            className="p-1 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 rounded"
                            title="View full content"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: section.id,
                                name: section.name || 'Content Chunk',
                                type: 'section',
                              })
                            }
                            className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-100 rounded"
                            title="Delete content chunk"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <div className="flex items-center">
                          <FiFileText className="w-4 h-4 mr-1" />
                          {section.content_source}
                        </div>
                        <div className="flex items-center">
                          <span>{section.content.split(' ').length} words</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiFileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No sections found</h3>
                    <p className="text-gray-600 mb-8">
                      {search || selectedTags.length > 0
                        ? 'Try adjusting your search or filters.'
                        : 'Get started by adding some content to this workspace.'}
                    </p>
                    {!search && selectedTags.length === 0 && (
                      <button
                        onClick={() => setIsAddContentModalOpen(true)}
                        className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        <FiPlus className="w-4 h-4 inline mr-2" />
                        Add Content
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {tab === 'sections' && (
            <div className="flex gap-6 min-h-[400px]">
              {/* Left: Section List */}
              <div className="w-64 bg-gray-50 border rounded-lg p-3 flex-shrink-0 overflow-y-auto max-h-[500px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-700">Sections</h3>
                  <button
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                    title="Add new section"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                {sectionTemplatesLoading ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : sectionTemplates.length === 0 ? (
                  <div className="text-gray-400 text-sm">No section templates found.</div>
                ) : (
                  <ul className="space-y-1">
                    {sectionTemplates.map((section) => {
                      const sectionIdStr = String(section.id);
                      const isSelected = selectedSectionId === sectionIdStr;
                      return (
                        <li key={sectionIdStr}>
                          <button
                            className={`w-full text-left px-3 py-2 rounded font-medium transition-colors text-sm ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-800 hover:bg-primary/10'
                            }`}
                            onClick={() => {
                              setSelectedSectionId(sectionIdStr);
                              fetchPromptsForSection(sectionIdStr);
                            }}
                          >
                            {section.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Right: Prompts for selected section */}
              <div className="flex-1 bg-white border rounded-lg p-6 min-h-[300px]">
                {!selectedSectionId ? (
                  <div className="text-gray-400 text-center mt-20">
                    Select a section to view its prompts.
                  </div>
                ) : promptsLoading ? (
                  <div className="text-gray-500 text-center mt-20">Loading prompts...</div>
                ) : sectionPrompts[selectedSectionId] &&
                  sectionPrompts[selectedSectionId].length > 0 ? (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-primary">Prompts</h4>
                    <ul className="space-y-4">
                      {sectionPrompts[selectedSectionId].map((prompt: any, idx: number) => (
                        <li key={idx} className="bg-gray-50 border rounded p-4 text-gray-800">
                          <div className="font-medium text-gray-700 mb-2">Prompt {idx + 1}</div>
                          <div className="whitespace-pre-line text-sm">{prompt.prompt}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center mt-20">
                    No prompts found for this section.
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'generated' && (
            <div className="min-h-[400px]">
              <h3 className="text-lg font-semibold mb-4 text-primary">Generated Content History</h3>
              {generatedLoading ? (
                <div className="text-gray-500 text-center mt-20">Loading generated content...</div>
              ) : generatedContent.length === 0 ? (
                <div className="text-gray-400 text-center mt-20">
                  No generated content found for this workspace.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedContent.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                          {item.prompt_title}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded"
                            title="View full content"
                            onClick={async () => {
                              if (!id) return;
                              try {
                                const details = await getGeneratedContentDetails(id, item.id);
                                setViewingGenerated(details);
                              } catch (e) {
                                toast.error('Failed to load content');
                              }
                            }}
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
                            title="Delete generated content"
                            onClick={async () => {
                              if (!id) return;
                              if (!window.confirm('Permanently delete this generated content?'))
                                return;
                              try {
                                await deleteGeneratedContent(id, item.id);
                                setGeneratedContent((prev) =>
                                  prev.filter((gc) => gc.id !== item.id),
                                );
                                toast.success('Deleted');
                              } catch (e) {
                                toast.error('Delete failed');
                              }
                            }}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="text-gray-700 text-sm line-clamp-6 prose prose-sm max-w-none">
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {viewingGenerated && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(viewingGenerated.created_at).toLocaleString()}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingGenerated.prompt?.title || 'Generated Content'}
                </h3>
              </div>
              <button
                onClick={() => setViewingGenerated(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-gray-800 prose max-w-none">
                <ReactMarkdown>{viewingGenerated.content}</ReactMarkdown>
              </div>
              {viewingGenerated.tags && viewingGenerated.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {viewingGenerated.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setViewingGenerated(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {(() => {
                    let parsedContent: any[] = [];
                    if (typeof viewingSection.content === 'string') {
                      try {
                        parsedContent = JSON.parse(viewingSection.content.replace(/'/g, '"'));
                      } catch (e) {
                        parsedContent = [];
                      }
                    }
                    if (!Array.isArray(parsedContent)) {
                      parsedContent = [];
                    }
                    return viewingSection.name || 'Untitled Section';
                  })()}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiFileText className="w-4 h-4 mr-1" />
                    {viewingSection.content_source}
                  </div>
                  <div className="flex items-center">
                    <span>{viewingSection.content.split(' ').length} words</span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {viewingSection.tags && viewingSection.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {viewingSection.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium flex items-center"
                    >
                      <FiTag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="prose max-w-none">
                <div className="text-gray-700 prose max-w-none">
                  {(() => {
                    // Debug: log the content
                    console.log('Modal viewingSection.content:', viewingSection.content);

                    if (
                      !viewingSection.content ||
                      (typeof viewingSection.content === 'string' &&
                        viewingSection.content.trim() === '')
                    ) {
                      return <span className="text-gray-400">No content available</span>;
                    }

                    let parsedContent: any[] = [];
                    if (typeof viewingSection.content === 'string') {
                      try {
                        // First check if the content is markdown
                        if (
                          viewingSection.content.includes('#') ||
                          viewingSection.content.includes('*') ||
                          viewingSection.content.includes('- ') ||
                          viewingSection.content.includes('## ')
                        ) {
                          return <ReactMarkdown>{viewingSection.content}</ReactMarkdown>;
                        }

                        // Otherwise try to parse as JSON
                        parsedContent = JSON.parse(viewingSection.content.replace(/'/g, '"'));
                      } catch (e) {
                        parsedContent = [];
                      }
                    }

                    if (Array.isArray(parsedContent) && parsedContent.length > 0) {
                      const formattedContent = parsedContent
                        .map((item: any) => {
                          // If item has a content array, use the old logic
                          if (Array.isArray(item.content)) {
                            return item.content
                              .map(
                                (c: any) =>
                                  (c.page_number ? `Page ${c.page_number}\n` : '') + (c.text || ''),
                              )
                              .join('\n\n');
                          }
                          // Otherwise, just show text and page_number if present
                          return (
                            (item.page_number ? `Page ${item.page_number}\n` : '') +
                            (item.text || '')
                          );
                        })
                        .join('\n\n');

                      return <ReactMarkdown>{formattedContent}</ReactMarkdown>;
                    }

                    // Check if the content might be markdown
                    if (
                      typeof viewingSection.content === 'string' &&
                      (viewingSection.content.includes('#') ||
                        viewingSection.content.includes('*') ||
                        viewingSection.content.includes('- ') ||
                        viewingSection.content.includes('## '))
                    ) {
                      return <ReactMarkdown>{viewingSection.content}</ReactMarkdown>;
                    }

                    // Otherwise, just show the raw content as plain text
                    return viewingSection.content;
                  })()}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Source: {viewingSection.content_source}</div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this content chunk?')) {
                        try {
                          await fetch(`${API.BASE_URL()}/api/sections/hard/${viewingSection.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: localStorage.getItem('token')
                                ? `Bearer ${localStorage.getItem('token')}`
                                : '',
                            },
                          });
                          setSections((prev) => prev.filter((s) => s.id !== viewingSection.id));
                          setAllSections((prev) => prev.filter((s) => s.id !== viewingSection.id));
                          closeModal();
                        } catch (err) {
                          alert('Failed to delete section.');
                        }
                      }
                    }}
                    className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">Add New Section</h3>
              <button
                onClick={() => {
                  setIsAddSectionModalOpen(false);
                  setNewSectionName('');
                  setNewSectionPrompt('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="sectionName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Section Name *
                </label>
                <input
                  id="sectionName"
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Enter section name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="sectionPrompt"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Default Prompt
                </label>
                <textarea
                  id="sectionPrompt"
                  value={newSectionPrompt}
                  onChange={(e) => setNewSectionPrompt(e.target.value)}
                  placeholder="Enter default prompt for this section (optional)..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsAddSectionModalOpen(false);
                  setNewSectionName('');
                  setNewSectionPrompt('');
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                disabled={addingSection || !newSectionName.trim()}
                className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
              >
                {addingSection ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="w-4 h-4" />
                    <span>Add Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">Delete Confirmation</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 text-gray-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be
              undone.
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteTarget.type === 'section') {
                    try {
                      // If we have multiple IDs to delete
                      if (deleteTarget.ids && deleteTarget.ids.length > 0) {
                        // Track success/failure counts
                        let successCount = 0;
                        let failCount = 0;

                        // Delete each section one by one
                        for (const id of deleteTarget.ids) {
                          try {
                            await deleteSection(id, true); // Using hard delete
                            successCount++;
                          } catch (err) {
                            console.error(`Error deleting section ${id}:`, err);
                            failCount++;
                          }
                        }

                        // Update the sections lists after all deletions
                        setSections((prev) =>
                          prev.filter((s) => !deleteTarget.ids?.includes(s.id)),
                        );
                        setAllSections((prev) =>
                          prev.filter((s) => !deleteTarget.ids?.includes(s.id)),
                        );

                        // Clear selected sections
                        setSelectedSections([]);
                        setSelectAll(false);

                        // Show appropriate toast message
                        if (failCount === 0) {
                          toast.success(
                            `${successCount} ${successCount === 1 ? 'section' : 'sections'} deleted successfully`,
                          );
                        } else if (successCount === 0) {
                          toast.error('Failed to delete sections');
                        } else {
                          toast.success(
                            `${successCount} ${successCount === 1 ? 'section' : 'sections'} deleted successfully, ${failCount} failed`,
                          );
                        }
                      } else {
                        // Handle single delete
                        await deleteSection(deleteTarget.id, true); // Using hard delete
                        setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
                        setAllSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
                        toast.success('Section deleted successfully');
                      }
                    } catch (err) {
                      console.error('Error deleting section:', err);
                      toast.error('Failed to delete section');
                    }
                  }
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;
