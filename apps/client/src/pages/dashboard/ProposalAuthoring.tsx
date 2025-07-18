import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiEdit3,
  FiEye,
  FiFileText,
  FiFilter,
  FiFolder,
  FiSearch,
  FiTag,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContent, type GeneratedContent, type Prompt } from '../../hooks/useContent';
import { useDebounce } from '../../hooks/useDebounce';
import { useTags } from '../../hooks/useTags';
import { useWorkspace } from '../../hooks/useWorkspace';

interface ContentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: 'prompt' | 'generated';
  createdAt: string;
  tags: { id: number; name: string }[];
}

const ContentViewModal: React.FC<ContentViewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  type,
  createdAt,
  tags,
}) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy content');
      console.error('Error copying content:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">{title}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="capitalize">{type}</span>
                <span>•</span>
                <span>{formatDate(createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(content)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FiCopy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    <FiTag className="w-3 h-3 mr-1" />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {type === 'generated' ? (
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{content}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SECTION_PROMPTS = {
  'Executive Summary':
    'Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition.',
  'Problem Statement':
    'Explain the core business challenges the client is facing and why addressing them is critical.',
  'Proposed Solution':
    "Describe the proposed solution in detail, including key features, components, and how it addresses the client's needs.",
  'Scope of Work':
    'Outline the specific deliverables, services, and responsibilities covered under this proposal.',
  'Project Approach and Methodology':
    'Describe the overall approach, phases, and methodology that will be used to execute the project.',
  'Project Plan and Timeline':
    'Provide a high-level timeline with major milestones and estimated completion dates for key phases.',
  'Team Composition and Roles':
    'List the proposed team members, their roles, responsibilities, and relevant experience.',
};

const ProposalAuthoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, loading: workspacesLoading, fetchWorkspaces } = useWorkspace();
  const {
    getWorkspacePrompts,
    getWorkspaceGeneratedContent,
    filterPromptsByTags,
    filterGeneratedContentByTags,
    deletePrompt,
    deleteGeneratedContent,
    loading: contentLoading,
  } = useContent();
  const { searchTags } = useTags();

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prompts' | 'generated'>('prompts');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ id: number; name: string }>>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    type: 'prompt' | 'generated';
    createdAt: string;
    tags: { id: number; name: string }[];
  }>({
    isOpen: false,
    title: '',
    content: '',
    type: 'prompt',
    createdAt: '',
    tags: [],
  });

  const [selectedChunks, setSelectedChunks] = useState<any[]>([]); // Replace any with actual chunk type if available
  const [selectedSection, setSelectedSection] = useState<string>('Executive Summary');
  const [userPrompt, setUserPrompt] = useState('');
  const [userPromptTags, setUserPromptTags] = useState<string[]>([]);
  const [autoPrompt, setAutoPrompt] = useState<string>('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceContent();
    }
  }, [selectedWorkspace, activeTab, selectedTags]);

  useEffect(() => {
    if (debouncedSearch) {
      searchTagSuggestions();
    } else {
      setTagSuggestions([]);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (location.state && location.state.section && location.state.prompt) {
      setSelectedSection(location.state.section);
      setAutoPrompt(location.state.prompt);
      setUserPrompt(location.state.prompt); // Pre-fill user-editable prompt
    } else {
      setAutoPrompt(SECTION_PROMPTS[selectedSection]);
    }
  }, [location.state, selectedSection]);

  const loadWorkspaceContent = async () => {
    if (!selectedWorkspace) return;

    try {
      if (activeTab === 'prompts') {
        const data =
          selectedTags.length > 0
            ? await filterPromptsByTags(selectedWorkspace, selectedTags)
            : await getWorkspacePrompts(selectedWorkspace);
        setPrompts(data);
      } else {
        const data =
          selectedTags.length > 0
            ? await filterGeneratedContentByTags(selectedWorkspace, selectedTags)
            : await getWorkspaceGeneratedContent(selectedWorkspace);
        setGeneratedContent(data);
      }
    } catch (error) {
      toast.error('Failed to load content');
      console.error('Error loading workspace content:', error);
    }
  };

  const searchTagSuggestions = async () => {
    try {
      const suggestions = await searchTags(debouncedSearch);
      setTagSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to search tags:', error);
    }
  };

  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setSearchQuery('');
    setTagSuggestions([]);
  };

  const handleTagRemove = (tagName: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagName));
  };

  const handleDelete = async (type: 'prompt' | 'generated', id: number) => {
    if (!selectedWorkspace) return;

    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        if (type === 'prompt') {
          await deletePrompt(selectedWorkspace, id);
          toast.success('Prompt deleted successfully');
        } else {
          await deleteGeneratedContent(selectedWorkspace, id);
          toast.success('Generated content deleted successfully');
        }
        loadWorkspaceContent();
      } catch (error) {
        toast.error(`Failed to delete ${type}`);
        console.error(`Error deleting ${type}:`, error);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy content');
      console.error('Error copying content:', error);
    }
  };

  const openViewModal = (
    title: string,
    content: string,
    type: 'prompt' | 'generated',
    createdAt: string,
    tags: { id: number; name: string }[],
  ) => {
    setViewModal({
      isOpen: true,
      title,
      content,
      type,
      createdAt,
      tags,
    });
  };

  const closeViewModal = () => {
    setViewModal({
      isOpen: false,
      title: '',
      content: '',
      type: 'prompt',
      createdAt: '',
      tags: [],
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const selectedWorkspaceData = workspaces.find((w) => w.id === selectedWorkspace);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proposal Authoring</h1>
              <p className="text-gray-600 mt-1">
                Create and manage your proposals with AI assistance
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
              className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 flex items-center gap-2"
            >
              <FiZap className="w-4 h-4" />
              Generate Content
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {!sidebarCollapsed && (
          <div className="w-80 bg-white border-r border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspaces</h2>
              <div className="space-y-2">
                {workspacesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="text-center py-8">
                    <FiFolder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No workspaces found</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          setSelectedWorkspace(workspace.id);
                          setSidebarCollapsed(true);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedWorkspace === workspace.id
                            ? 'bg-gradient-to-r from-primary/10 to-primary/20 border-primary/30 border text-primary'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{workspace.name}</h3>
                            <p className="text-sm text-gray-500 truncate">{workspace.clientName}</p>
                          </div>
                          {selectedWorkspace === workspace.id && (
                            <FiChevronRight className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {selectedWorkspace && (
            <div className="bg-white border-b border-gray-200 px-8 py-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {sidebarCollapsed && (
                    <button
                      className="bg-white border rounded-full p-2 shadow"
                      onClick={() => setSidebarCollapsed(false)}
                      title="Show workspaces"
                    >
                      <FiChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedWorkspaceData?.name}
                    </h2>
                    <p className="text-gray-600 text-sm">{selectedWorkspaceData?.clientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FiFilter className="w-4 h-4" />
                  Filters
                </button>
              </div>

              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by tags
                      </label>
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      {tagSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {tagSuggestions.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagSelect(tag.name)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedTags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selected tags
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {selectedTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              {tag}
                              <button
                                onClick={() => handleTagRemove(tag)}
                                className="ml-2 text-primary hover:text-primary/80"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('prompts')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'prompts'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Prompts ({prompts.length})
                </button>
                <button
                  onClick={() => setActiveTab('generated')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'generated'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Generated Content ({generatedContent.length})
                </button>
              </div>
            </div>
          )}

          {selectedWorkspace && (
            <div className="bg-white border-b border-gray-200 px-8 py-6">
              {/* Section selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Object.keys(SECTION_PROMPTS).map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
              {/* Chunk selection (mock for now) */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Chunks
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedChunks((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                        )
                      }
                      className={`px-4 py-2 rounded-lg border ${selectedChunks.includes(i) ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                    >
                      Chunk {i}
                    </button>
                  ))}
                </div>
              </div>
              {/* Auto-generated prompt (read-only) */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-generated Prompt
                </label>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                  {selectedChunks.length === 1
                    ? autoPrompt
                    : selectedChunks.length > 1
                      ? `Summarize the following sections: ${selectedChunks.map((i) => `Chunk ${i}`).join(', ')}.\n${autoPrompt}`
                      : 'Select a chunk to see the prompt.'}
                </div>
              </div>
              {/* User-editable prompt */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Prompt (editable)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full min-h-[80px] border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add your custom prompt here..."
                />
              </div>
              {/* Tag area for user prompt */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {userPromptTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => setUserPromptTags(userPromptTags.filter((t) => t !== tag))}
                        className="ml-2 text-primary hover:text-primary/80"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setUserPromptTags([...userPromptTags, e.currentTarget.value.trim()]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-8">
            {contentLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'prompts' ? (
              <div className="space-y-4">
                {prompts.length === 0 ? (
                  <div className="text-center py-20">
                    <FiEdit3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts yet</h3>
                    <p className="text-gray-500 mb-6">Create your first prompt to get started</p>
                    <button
                      onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
                      className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Create Prompt
                    </button>
                  </div>
                ) : (
                  prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{prompt.title}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {prompt.content}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FiCalendar className="w-4 h-4" />
                              {formatDate(prompt.created_at)}
                            </div>

                            {prompt.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <FiTag className="w-4 h-4" />
                                <div className="flex gap-1">
                                  {prompt.tags
                                    .slice(0, 2)
                                    .map((tag: { id: number; name: string }) => (
                                      <span
                                        key={tag.id}
                                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  {prompt.tags.length > 2 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                      +{prompt.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(prompt.content)}
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                            title="Copy content"
                          >
                            <FiCopy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              openViewModal(
                                prompt.title,
                                prompt.content,
                                'prompt',
                                prompt.created_at,
                                prompt.tags,
                              )
                            }
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                            title="View full content"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('prompt', prompt.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete prompt"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {generatedContent.length === 0 ? (
                  <div className="text-center py-20">
                    <FiZap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No generated content yet
                    </h3>
                    <p className="text-gray-500 mb-6">Generate your first content to get started</p>
                    <button
                      onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
                      className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Generate Content
                    </button>
                  </div>
                ) : (
                  generatedContent.map((content) => (
                    <div
                      key={content.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {content.prompt_title}
                          </h3>
                          <div className="text-gray-600 text-sm mb-4 line-clamp-3">
                            <ReactMarkdown>{content.content}</ReactMarkdown>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FiCalendar className="w-4 h-4" />
                              {formatDate(content.created_at)}
                            </div>

                            <div className="flex items-center gap-1">
                              <FiFileText className="w-4 h-4" />
                              {content.content.length} chars
                            </div>

                            {content.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <FiTag className="w-4 h-4" />
                                <div className="flex gap-1">
                                  {content.tags
                                    .slice(0, 2)
                                    .map((tag: { id: number; name: string }) => (
                                      <span
                                        key={tag.id}
                                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  {content.tags.length > 2 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                      +{content.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(content.content)}
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                            title="Copy content"
                          >
                            <FiCopy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              openViewModal(
                                content.prompt_title,
                                content.content,
                                'generated',
                                content.created_at,
                                content.tags,
                              )
                            }
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                            title="View full content"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('generated', content.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete content"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ContentViewModal
        isOpen={viewModal.isOpen}
        onClose={closeViewModal}
        title={viewModal.title}
        content={viewModal.content}
        type={viewModal.type}
        createdAt={viewModal.createdAt}
        tags={viewModal.tags}
      />
    </div>
  );
};

export default ProposalAuthoring;
