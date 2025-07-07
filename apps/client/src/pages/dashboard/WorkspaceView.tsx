/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import {
  FiArrowLeft,
  FiEdit3,
  FiEye,
  FiFileText,
  FiGrid,
  FiImage,
  FiSearch,
  FiTag,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { type Section, useSections } from '../../hooks/useSections';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useWorkspaceImages, type WorkspaceImage } from '../../hooks/useWorkspaceImages';
import { useWorkspaceTables, type WorkspaceTable } from '../../hooks/useWorkspaceTables';

type Workspace = {
  id: string;
  name: string;
  clientName?: string;
  tags: string[];
};

type TabType = 'sections' | 'images' | 'tables';

const WorkspaceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [images, setImages] = useState<WorkspaceImage[]>([]);
  const [tables, setTables] = useState<WorkspaceTable[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [allImages, setAllImages] = useState<WorkspaceImage[]>([]);
  const [allTables, setAllTables] = useState<WorkspaceTable[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sections');

  const { fetchWorkspace } = useWorkspace();
  const { fetchSections, filterSectionsByTags } = useSections();
  const { getWorkspaceImages, filterImagesByTags } = useWorkspaceImages();
  const { getWorkspaceTables, filterTablesByTags } = useWorkspaceTables();

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
        });

        const [sectionsData, imagesData, tablesData] = await Promise.all([
          fetchSections(id),
          getWorkspaceImages(id),
          getWorkspaceTables(id),
        ]);

        setAllSections(sectionsData);
        setSections(sectionsData);
        setAllImages(imagesData);
        setImages(imagesData);
        setAllTables(tablesData);
        setTables(tablesData);
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

    const handleTagFilter = async () => {
      try {
        if (selectedTags.length > 0) {
          const [filteredSections, filteredImages, filteredTables] = await Promise.all([
            filterSectionsByTags(id, selectedTags),
            filterImagesByTags(id, selectedTags),
            filterTablesByTags(id, selectedTags),
          ]);
          setSections(filteredSections);
          setImages(filteredImages);
          setTables(filteredTables);
        } else {
          setSections(allSections);
          setImages(allImages);
          setTables(allTables);
        }
      } catch (error) {
        console.error('Failed to filter by tags:', error);
        setSections(allSections);
        setImages(allImages);
        setTables(allTables);
      }
    };

    handleTagFilter();
  }, [selectedTags, id, allSections, allImages, allTables]);

  const allTags = React.useMemo(() => {
    return Array.from(
      new Set([
        ...allSections.flatMap((s) => s.tags || []),
        ...allImages.flatMap((i) => i.tags || []),
        ...allTables.flatMap((t) => t.tags || []),
      ]),
    );
  }, [allSections, allImages, allTables]);

  const getFilteredData = React.useCallback(() => {
    const currentData =
      activeTab === 'sections' ? sections : activeTab === 'images' ? images : tables;

    if (!search) return currentData;

    return currentData.filter((item: any) => {
      const searchLower = search.toLowerCase();
      if (activeTab === 'sections') {
        return (
          item.content.toLowerCase().includes(searchLower) ||
          (item.tags || []).some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
          (item.name && item.name.toLowerCase().includes(searchLower))
        );
      } else if (activeTab === 'images') {
        return (
          (item.source_image.caption &&
            item.source_image.caption.toLowerCase().includes(searchLower)) ||
          (item.source_image.ocr_text &&
            item.source_image.ocr_text.toLowerCase().includes(searchLower)) ||
          (item.tags || []).some((tag: string) => tag.toLowerCase().includes(searchLower))
        );
      } else {
        return (
          (item.source_table.caption &&
            item.source_table.caption.toLowerCase().includes(searchLower)) ||
          (item.source_table.data && item.source_table.data.toLowerCase().includes(searchLower)) ||
          (item.tags || []).some((tag: string) => tag.toLowerCase().includes(searchLower))
        );
      }
    });
  }, [activeTab, sections, images, tables, search]);

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

  const renderTabContent = () => {
    if (activeTab === 'sections') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filteredData as Section[]).map((section) => (
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
                    <h3 className="font-medium text-gray-900 mb-2">{section.name}</h3>
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
                  <FiFileText className="w-4 h-4 mr-1" />
                  {section.content.split(' ').length} words
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (activeTab === 'images') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(filteredData as WorkspaceImage[]).map((image) => (
            <div
              key={image.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <FiImage className="w-8 h-8 text-gray-400" />
              </div>

              {image.tags && image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {image.tags.map((tag, index) => (
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

              {image.source_image.caption && (
                <p className="text-sm text-gray-700 mb-2">{image.source_image.caption}</p>
              )}

              <div className="text-xs text-gray-500">
                {image.source_image.page_number && <p>Page {image.source_image.page_number}</p>}
                <p>Image ID: {image.source_image.id}</p>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(filteredData as WorkspaceTable[]).map((table) => (
            <div
              key={table.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 mb-4">
                <FiGrid className="w-8 h-8 text-gray-400" />
              </div>

              {table.tags && table.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {table.tags.map((tag, index) => (
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

              {table.source_table.caption && (
                <h4 className="font-medium text-gray-900 mb-2">{table.source_table.caption}</h4>
              )}

              {table.source_table.data && (
                <div className="text-sm text-gray-700 mb-2 max-h-32 overflow-hidden">
                  <pre className="whitespace-pre-wrap text-xs">
                    {table.source_table.data.slice(0, 200)}...
                  </pre>
                </div>
              )}

              <div className="text-xs text-gray-500 flex justify-between">
                {table.source_table.page_number && (
                  <span>Page {table.source_table.page_number}</span>
                )}
                <span>{table.source_table.extraction_method}</span>
              </div>
            </div>
          ))}
        </div>
      );
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
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center mb-4">
              <button
                onClick={() => navigate('/dashboard/workspaces')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
                <p className="text-gray-600 mt-1">
                  {allSections.length} sections • {allImages.length} images • {allTables.length}{' '}
                  tables
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/content-ingestion')}
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
              >
                <FiEdit3 className="w-4 h-4" />
                Add Content
              </button>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('sections')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'sections'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiFileText className="w-4 h-4 inline mr-2" />
                Sections ({allSections.length})
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiImage className="w-4 h-4 inline mr-2" />
                Images ({allImages.length})
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'tables'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiGrid className="w-4 h-4 inline mr-2" />
                Tables ({allTables.length})
              </button>
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
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-96 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2 py-2">
                  Filter by category:
                </span>
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
          </div>

          {filteredData.length > 0 ? (
            renderTabContent()
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {activeTab === 'sections' && <FiFileText className="w-8 h-8 text-gray-400" />}
                  {activeTab === 'images' && <FiImage className="w-8 h-8 text-gray-400" />}
                  {activeTab === 'tables' && <FiGrid className="w-8 h-8 text-gray-400" />}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {search || selectedTags.length > 0
                    ? `No ${activeTab} found`
                    : `No ${activeTab} yet`}
                </h3>
                <p className="text-gray-600 mb-8">
                  {search || selectedTags.length > 0
                    ? 'Try adjusting your search or filter criteria'
                    : `Start adding ${activeTab} to this workspace`}
                </p>
                {!search && selectedTags.length === 0 && (
                  <button
                    onClick={() => navigate('/dashboard/content-ingestion')}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Add Your First {activeTab.slice(0, -1)}
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
                    <FiFileText className="w-4 h-4 mr-1" />
                    {viewingSection.content.split(' ').length} words
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
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium flex items-center"
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
                <div className="text-sm text-gray-500">Source: {viewingSection.source}</div>
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                    <FiEdit3 className="w-4 h-4" />
                    Edit
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
