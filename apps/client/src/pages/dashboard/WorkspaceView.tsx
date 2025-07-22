import React, { useEffect, useState } from 'react';
import {
  FiArrowLeft,
  FiEdit3,
  FiEye,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTag,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useSections, type Section } from '../../hooks/useSections';
import { useTags } from '../../hooks/useTags';
import { useWorkspace } from '../../hooks/useWorkspace';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [currentTags, setCurrentTags] = useState<any[]>([]);

  const debouncedSearch = useDebounce(search, 500);

  const { fetchWorkspace } = useWorkspace();
  const { fetchSections, searchSections } = useSections();
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
    const tagSet = new Set<string>();

    allSections.forEach((section) => {
      section.tags?.forEach((tag) => tagSet.add(tag));
    });

    currentTags.forEach((tag) => tagSet.add(tag.name));

    return Array.from(tagSet).sort();
  }, [allSections, currentTags]);

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
                    Client: {workspace.clientName}
                    {workspace.workspaceType && (
                      <span className="ml-4">
                        | Type: <span className="font-semibold">{workspace.workspaceType}</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    navigate('/dashboard/content-ingestion', {
                      state: { workspaceId: workspace.id },
                    })
                  }
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                  <FiPlus className="w-3 h-3" />
                  Add Content
                </button>
                <button
                  onClick={() =>
                    navigate('/dashboard/prompt-templates', {
                      state: { workspaceId: workspace.id, type: workspace.workspaceType },
                    })
                  }
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                  <FiPlus className="w-3 h-3" />
                  Add Prompt
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
                  Generate Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search sections by content, name, source, or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-96 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2 py-2">Filter by tags:</span>
                {allTags.map((tag) => (
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
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
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

          {filteredData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.map((section) => (
                <div
                  key={section.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
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
                      {section.name && (
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {section.name}
                        </h3>
                      )}
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
                        {section.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => handleViewSection(section, e)}
                        className="p-1 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 rounded"
                        title="View full content"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <FiEdit3 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    onClick={() =>
                      navigate('/dashboard/content-ingestion', {
                        state: { workspaceId: workspace.id },
                      })
                    }
                    className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <FiPlus className="w-4 h-4 inline mr-2" />
                    Add Content
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {viewingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewingSection.name || 'Content Details'}
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
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {viewingSection.content}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Source: {viewingSection.content_source}</div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Edit
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
    </div>
  );
};

export default WorkspaceView;
