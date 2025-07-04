import React, { useEffect, useState } from 'react';
import { FiArrowLeft, FiEdit3, FiFileText, FiSearch, FiTag } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { type Section, useSections } from '../../hooks/useSections';
import { useWorkspace } from '../../hooks/useWorkspace';

interface Workspace {
  id: string;
  name: string;
  clientName?: string;
  tags: string[];
}

const WorkspaceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { fetchWorkspace } = useWorkspace();
  const { fetchSections } = useSections();

  useEffect(() => {
    if (!id) return;

    const loadWorkspaceData = async () => {
      try {
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
        const sectionsData = await fetchSections(id);
        setSections(sectionsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch workspace data:', error);
        setLoading(false);
      }
    };

    loadWorkspaceData();
  }, []);

  const allTags = Array.from(new Set(sections.flatMap((s) => s.tags || [])));

  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      section.content.toLowerCase().includes(search.toLowerCase()) ||
      (section.tags || []).some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesTags =
      selectedTags.length === 0 || (section.tags || []).some((tag) => selectedTags.includes(tag));
    return matchesSearch && matchesTags;
  });

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

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
                  {sections.length} content pieces • {allTags.length} categories
                </p>
              </div>
              <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
                <FiEdit3 className="w-4 h-4" />
                Add Content
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
                placeholder="Search content..."
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

          {filteredSections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSections.map((section) => (
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
                    <FiEdit3 className="w-4 h-4 text-gray-400 ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                    <div className="flex items-center">
                      <FiFileText className="w-4 h-4 mr-1" />
                      {section.source.split('/')[1] || 'Manual'}
                    </div>
                    <div className="flex items-center">
                      <FiFileText className="w-4 h-4 mr-1" />
                      {section.content.split(' ').length} words
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {search || selectedTags.length > 0 ? 'No content found' : 'No content yet'}
                </h3>
                <p className="text-gray-600 mb-8">
                  {search || selectedTags.length > 0
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start adding reusable content pieces to this workspace'}
                </p>
                {!search && selectedTags.length === 0 && (
                  <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Add Your First Content
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceView;
