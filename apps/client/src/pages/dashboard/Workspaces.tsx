import React, { useEffect, useState } from 'react';
import { FiFolder, FiPlus, FiSearch, FiTag, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useSections } from '../../hooks/useSections';
import { useWorkspace } from '../../hooks/useWorkspace';

const Workspaces: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, getAllTags, filterWorkspaces, fetchWorkspaces, loading, deleteWorkspace } =
    useWorkspace();
  const { fetchSections } = useSections();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sectionCounts, setSectionCounts] = useState<{ [workspaceId: string]: number }>({});

  const debouncedSearch = useDebounce(search, 500);

  const tags = getAllTags();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  useEffect(() => {
    const performFilter = async () => {
      if (debouncedSearch || selectedTags.length > 0) {
        await filterWorkspaces(
          debouncedSearch || undefined,
          selectedTags.length > 0 ? selectedTags : undefined,
        );
      } else {
        await fetchWorkspaces();
      }
    };

    performFilter();
  }, [debouncedSearch, selectedTags]);

  useEffect(() => {
    const fetchAllSectionCounts = async () => {
      const counts: { [workspaceId: string]: number } = {};
      await Promise.all(
        workspaces.map(async (workspace) => {
          try {
            const sections = await fetchSections(workspace.id);
            counts[workspace.id] = Array.isArray(sections) ? sections.length : 0;
          } catch {
            counts[workspace.id] = 0;
          }
        })
      );
      setSectionCounts(counts);
    };
    if (workspaces.length > 0) {
      fetchAllSectionCounts();
    }
  }, [workspaces]);

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Workspaces</h1>
              <p className="text-gray-600 mt-1">
                Organize and manage your reusable content libraries
              </p>
            </div>
            <div className="flex items-center space-x-3 mb-6">
              <button
                onClick={() => navigate('/dashboard/workspaces/create')}
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Create Workspace
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
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-96 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
              />
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2 py-2">Filter by tags:</span>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/20'
                    }`}
                  >
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

          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : workspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/dashboard/workspaces/${workspace.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group relative"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this workspace?')) {
                        deleteWorkspace(workspace.id);
                      }
                    }}
                    className="absolute top-3 right-3 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 z-10"
                    title="Delete workspace"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <FiFolder className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {workspace.name}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Content library for reusable proposal components
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {workspace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {workspace.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium flex items-center"
                          >
                            <FiTag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {workspace.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                            +{workspace.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Content pieces: {sectionCounts[workspace.id] ?? 0}</span>
                      <span>Last updated: Today</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiFolder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {search || selectedTags.length > 0 ? 'No workspaces found' : 'No workspaces yet'}
                </h3>
                <p className="text-gray-600 mb-8">
                  {search || selectedTags.length > 0
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first workspace to organize reusable content'}
                </p>
                {!search && selectedTags.length === 0 && (
                  <button
                    onClick={() => navigate('/dashboard/workspaces/create')}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Create Your First Workspace
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

export default Workspaces;
