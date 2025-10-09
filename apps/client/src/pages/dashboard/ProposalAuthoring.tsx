import { encoding_for_model } from '@dqbd/tiktoken';
import jsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiChevronDown,
    FiChevronUp,
    FiCopy,
    FiFileText,
    FiLoader,
    FiPlus,
    FiRefreshCw,
    FiSave,
    FiSearch,
    FiTag,
    FiX,
    FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { useContent, type Section, type WorkspaceContent } from '../../hooks/useContent';
import type { Workspace } from '../../hooks/useWorkspace';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';

const ProposalAuthoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, fetchWorkspaces, fetchWorkspace } = useWorkspace();
  const { getWorkspaceContent, generateContent, saveGeneratedContent } = useContent();

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaceContent, setWorkspaceContent] = useState<WorkspaceContent | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSections, setSelectedSections] = useState<number[]>([]); // For dropdown selections
  const [selectedContentSections, setSelectedContentSections] = useState<number[]>([]); // For checkbox selections
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<{
    context_tokens: number;
    response_tokens: number;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [fallbackWorkspace, setFallbackWorkspace] = useState<Workspace | null>(null);
  // UI state for context panel
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [expandedMajors, setExpandedMajors] = useState<Record<string, boolean>>({});
  const [selectedMinorChunks, setSelectedMinorChunks] = useState<Record<string, Set<number>>>({});
  const [sectionTemplates, setSectionTemplates] = useState<
    { id: number; name: string; order: number; prompt?: string; default_content?: string }[]
  >([]);
  const [sectionTemplatesLoading, setSectionTemplatesLoading] = useState(false);
  const [workspaceTypes, setWorkspaceTypes] = useState<{ id: number; name: string }[]>([]);
  const [selectedTokens, setSelectedTokens] = useState(0);
  const [totalInputTokens, setTotalInputTokens] = useState(0);
  const [tokenLimitExceeded, setTokenLimitExceeded] = useState(false);

  const workspaceNameFromState = location.state?.workspaceName;

  // Compute selectedWorkspaceObj after all hooks and state
  let selectedWorkspaceObj: Workspace | { workspace_type: string; name: string };
  const foundWorkspace = workspaces.find((w) => w.id === selectedWorkspace);

  if (foundWorkspace) {
    selectedWorkspaceObj = foundWorkspace;
  } else if (fallbackWorkspace) {
    selectedWorkspaceObj = fallbackWorkspace;
  } else {
    const workspaceTypeFromState =
      location.state?.workspaceTypeId || location.state?.workspaceType || '';
    selectedWorkspaceObj = {
      workspace_type: workspaceTypeFromState,
      name: workspaceNameFromState || 'Workspace',
    };
  }

  // Fetch workspace types
  useEffect(() => {
    async function fetchWorkspaceTypes() {
      try {
        const res = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setWorkspaceTypes(Array.isArray(data) ? data : []);
      } catch (error) {
        setWorkspaceTypes([]);
      }
    }
    fetchWorkspaceTypes();
  }, []);

  // Fetch section templates for the workspace type (by ID)
  useEffect(() => {
    async function fetchTemplates() {
      if (workspaceTypes.length === 0) return;

      let wsTypeId: string | null = null;

      if (location.state?.workspaceTypeId && !isNaN(Number(location.state.workspaceTypeId))) {
        wsTypeId = String(location.state.workspaceTypeId);
      } else if (selectedWorkspaceObj?.workspace_type) {
        if (!isNaN(Number(selectedWorkspaceObj.workspace_type))) {
          wsTypeId = String(selectedWorkspaceObj.workspace_type);
        } else {
          const found = workspaceTypes.find((t) => t.name === selectedWorkspaceObj.workspace_type);
          wsTypeId = found ? String(found.id) : null;
        }
      } else if (location.state?.workspaceType) {
        const found = workspaceTypes.find((t) => t.name === location.state.workspaceType);
        wsTypeId = found ? String(found.id) : null;
      }

      if (!wsTypeId && selectedWorkspaceObj?.name) {
        const workspaceName = selectedWorkspaceObj.name.toLowerCase();
        const exactMatch = workspaceTypes.find((t) => workspaceName.includes(t.name.toLowerCase()));
        if (exactMatch) wsTypeId = String(exactMatch.id);
      }

      if (!wsTypeId && workspaceTypes.length > 0) {
        wsTypeId = String(workspaceTypes[0].id);
      }

      if (!wsTypeId) {
        setSectionTemplates([]);
        setSectionTemplatesLoading(false);
        return;
      }

      setSectionTemplatesLoading(true);
      try {
        const apiUrl = `${API.BASE_URL()}/api/prompt-templates/types/${wsTypeId}/sections`;
        const res = await fetch(apiUrl, {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        });
        if (!res.ok) {
          setSectionTemplates([]);
        } else {
          const data = await res.json();
          setSectionTemplates(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        setSectionTemplates([]);
      } finally {
        setSectionTemplatesLoading(false);
      }
    }
    fetchTemplates();
  }, [
    selectedWorkspaceObj?.workspace_type,
    selectedWorkspaceObj?.name,
    workspaceTypes,
    location.state,
  ]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws && ws.name) {
        setSelectedWorkspace(workspaceId);
        setFallbackWorkspace(null);
      } else {
        fetchWorkspace(workspaceId).then((fw: any) => {
          if (fw && fw.name) {
            setFallbackWorkspace({
              id: fw.id?.toString?.() || workspaceId,
              name: fw.name,
              workspace_type: fw.workspace_type || '',
              clientName: fw.clientName || fw.client || '',
              tags: fw.tags || [],
            });
            setSelectedWorkspace(workspaceId);
          }
        });
      }
    }
  }, [workspaceId, workspaces, fetchWorkspace]);

  useEffect(() => {
    if (workspaceId) setSelectedWorkspace(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    if (location.state) {
      if (location.state.workspaceId) setSelectedWorkspace(location.state.workspaceId);
      if (location.state.sectionName) setSelectedSectionName(location.state.sectionName);
      if (location.state.prompt) setPrompt(location.state.prompt);
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state) {
      if (location.state.workspaceId) setSelectedWorkspace(location.state.workspaceId);
      if (location.state.sectionName) setSelectedSectionName(location.state.sectionName);
      if (location.state.workspaceType && workspaces.length > 0) {
        const ws = workspaces.find((w) => w.workspace_type === location.state.workspaceType);
        if (ws) setSelectedWorkspace(ws.id);
      }
      if (location.state.workspaceTypeId && workspaces.length > 0) {
        const ws = workspaces.find((w) => w.workspace_type === location.state.workspaceTypeId);
        if (ws) setSelectedWorkspace(ws.id);
      }
      if (location.state.prompt) setPrompt(location.state.prompt);
    }
  }, [location.state, workspaces]);

  useEffect(() => {
    if (selectedWorkspace) loadWorkspaceContent();
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace && workspaceContent) {
      // placeholder for enhanced resolution
    }
  }, [selectedWorkspace, workspaceContent, location.state]);

  useEffect(() => {
    if (location.state?.workspaceId && location.state?.workspaceTypeId) {
      fetchWorkspaces().then(() => {});
      if (location.state.workspaceId) {
        fetchWorkspace(location.state.workspaceId).then((workspace: any) => {
          if (workspace) {
            setFallbackWorkspace({
              id: workspace.id?.toString?.() || location.state.workspaceId,
              name: workspace.name,
              workspace_type: workspace.workspace_type || location.state.workspaceTypeId,
              clientName: workspace.clientName || workspace.client || '',
              tags: workspace.tags || [],
            });
            setSelectedWorkspace(location.state.workspaceId);
          } else {
            setFallbackWorkspace({
              id: location.state.workspaceId,
              name: location.state.workspaceName || 'New Workspace',
              workspace_type: location.state.workspaceTypeId,
              clientName: '',
              tags: [],
            });
            setSelectedWorkspace(location.state.workspaceId);
          }
        });
      }
    }
  }, [
    location.state?.workspaceId,
    location.state?.workspaceTypeId,
    fetchWorkspaces,
    fetchWorkspace,
  ]);

  useEffect(() => {
    if (selectedWorkspace && selectedSectionId) fetchSectionPrompts();
  }, [selectedWorkspace, selectedSectionId]);

  useEffect(() => {
    if (selectedSections.length > 0 && sectionTemplates.length > 0) {
      const selectedTemplates = sectionTemplates.filter((template) =>
        selectedSections.includes(template.id),
      );

      if (selectedTemplates.length > 0) {
        const combinedPrompts = selectedTemplates
          .map((template) => {
            const sectionHeader = `Section: ${template.name}\n`;
            return template.prompt ? sectionHeader + template.prompt : sectionHeader;
          })
          .join('\n\n');

        setPrompt(combinedPrompts);
        setSelectedSectionName(selectedTemplates.map((t) => t.name).join(', '));
        setUserPrompt('');
      }
    } else if (selectedSections.length === 0) {
      setPrompt('');
      setSelectedSectionName('');
      setUserPrompt('');
    }
  }, [selectedSections, sectionTemplates]);

  // (sectionList removed - not used)

  const loadWorkspaceContent = async () => {
    if (!selectedWorkspace) return;

    try {
      const content = await getWorkspaceContent(selectedWorkspace);
      setWorkspaceContent(content);
    } catch (error) {
      toast.error('Failed to load workspace content');
    }
  };

  const fetchSectionPrompts = async () => {
    try {
      // Already have section templates list with default_content from /types/{id}/sections
      const selectedId = Number(selectedSectionId);
      const template = sectionTemplates.find((t) => t.id === selectedId);
      if (!template) return;
      // Fetch prompts for this section
      const res = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${selectedId}/prompts`,
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
      );
      if (!res.ok) return;
      const prompts = await res.json();
      const defaultPrompt = prompts?.[0]?.prompt || '';
      const sectionHeader = `Section: ${template.name}`;
      const combined = [sectionHeader, defaultPrompt].filter(Boolean).join('\n');
      setPrompt(combined);
      setSelectedSectionName(template.name);
      // Optionally: surface default content in UI somewhere if needed
    } catch {
      // ignore small failures
    }
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) => {
      const newSections = prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId];

      // Update the prompts when sections are toggled
      if (sectionTemplates.length > 0) {
        const selectedTemplates = sectionTemplates.filter((template) =>
          newSections.includes(template.id),
        );

        const combinedPrompts = selectedTemplates
          .map((template) => {
            const sectionHeader = `Section: ${template.name}\n`;
            return template.prompt ? sectionHeader + template.prompt : sectionHeader;
          })
          .join('\n\n');

        setPrompt(combinedPrompts);
        setSelectedSectionName(selectedTemplates.map((t) => t.name).join(', '));
      }

      return newSections;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedWorkspace) {
      toast.error('Please enter a prompt and select a workspace');
      return;
    }

    if (tokenLimitExceeded) {
      toast.error(
        'Token limit exceeded! Please reduce the content or selected sections to continue.',
      );
      return;
    }

    const combinedPrompt = userPrompt.trim()
      ? `${prompt.trim()}\n\n${userPrompt.trim()}`
      : prompt.trim();

    setIsGenerating(true);
    try {
      let result: any;
      if (selectedSections.length > 0) {
        result = await generateContent(selectedWorkspace, combinedPrompt, selectedSections);
      } else {
        const sectionHeading = selectedSectionName
          ? `Section: ${selectedSectionName} (Type: ${selectedWorkspaceObj.workspace_type || 'Proposal'})\n\n`
          : '';
        result = await generateContent(selectedWorkspace, sectionHeading + combinedPrompt, []);
      }
      setGeneratedContent(result.content);
      setTokenInfo({
        context_tokens: result.context_tokens,
        response_tokens: result.response_tokens,
      });
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate content');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !selectedWorkspace) {
      toast.error('No content to save');
      return;
    }

    setIsSaving(true);
    try {
      await saveGeneratedContent(
        selectedWorkspace,
        prompt,
        generatedContent,
        selectedSections,
        tags,
      );
      toast.success('Content saved successfully!');
      navigate(`/dashboard/workspaces/${selectedWorkspace}`);
    } catch (error) {
      toast.error('Failed to save content');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setGeneratedContent('');
    setTokenInfo(null);
    handleGenerate();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Calculate token count for selected sections using tiktoken-js
  useEffect(() => {
    let cancelled = false;
    async function updateTokens() {
      if (!workspaceContent || selectedContentSections.length === 0) {
        setSelectedTokens(0);
        return;
      }
      const selected = workspaceContent.sections.filter((section) =>
        selectedContentSections.includes(section.id),
      );
      const encoder = await encoding_for_model('gpt-3.5-turbo');
      let totalTokens = 0;
      for (const section of selected) {
        const content = section.content || '';
        const tokens = encoder.encode(content);
        totalTokens += tokens.length;
      }
      encoder.free();
      if (!cancelled) setSelectedTokens(totalTokens);
    }
    updateTokens();
    return () => {
      cancelled = true;
    };
  }, [selectedSections, workspaceContent]);

  // Calculate total input tokens (prompt + user prompt + selected sections)
  useEffect(() => {
    let cancelled = false;
    async function calculateTotalInputTokens() {
      const encoder = await encoding_for_model('gpt-3.5-turbo');

      const promptTokens = encoder.encode(prompt || '').length;
      const userPromptTokens = encoder.encode(userPrompt || '').length;
      const sectionTokens = selectedTokens;
      const total = promptTokens + userPromptTokens + sectionTokens;

      encoder.free();

      if (!cancelled) {
        setTotalInputTokens(total);
        setTokenLimitExceeded(total > 5000);
      }
    }

    calculateTotalInputTokens();
    return () => {
      cancelled = true;
    };
  }, [prompt, userPrompt, selectedTokens]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy content');
      console.error('Error copying content:', error);
    }
  };

  const handleViewSection = (section: Section) => {
    setViewingSection(section);
  };

  // When viewing a section, show its actual content (handle string/JSON)
  const SectionViewModal = () => {
    if (!viewingSection) return null;
    let contentString = '';
    if (typeof viewingSection.content === 'string') {
      contentString = viewingSection.content;
      try {
        const parsed = JSON.parse(viewingSection.content);
        if (Array.isArray(parsed)) {
          contentString = (parsed as any[])
            .map((item) =>
              item && typeof item === 'object'
                ? typeof (item as any).text === 'string'
                  ? (item as any).text
                  : typeof (item as any).content === 'string'
                    ? (item as any).content
                    : JSON.stringify(item)
                : String(item),
            )
            .join('\n');
        } else {
          contentString = viewingSection.content;
        }
      } catch {
        contentString = viewingSection.content;
      }
    } else if (Array.isArray(viewingSection.content)) {
      contentString = (viewingSection.content as any[])
        .map((item) =>
          item && typeof item === 'object'
            ? typeof (item as any).text === 'string'
              ? (item as any).text
              : typeof (item as any).content === 'string'
                ? (item as any).content
                : JSON.stringify(item)
            : String(item),
        )
        .join('\n');
    } else if (viewingSection.content && typeof viewingSection.content === 'object') {
      const contentObj = viewingSection.content as any;
      contentString =
        (typeof contentObj.text === 'string' && contentObj.text) ||
        (typeof contentObj.content === 'string' && contentObj.content) ||
        JSON.stringify(viewingSection.content);
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{viewingSection.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Source: {viewingSection.source || 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => setViewingSection(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {contentString}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {Array.isArray(viewingSection.tags) && viewingSection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingSection.tags.map((tag, idx) => (
                    <span
                      key={typeof tag === 'object' && tag !== null && 'id' in tag ? tag.id : idx}
                      className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs"
                    >
                      <FiTag className="w-3 h-3 mr-1" />
                      {typeof tag === 'object' && tag !== null && 'name' in tag
                        ? tag.name
                        : String(tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(contentString)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
              >
                <FiCopy className="w-4 h-4" />
                Copy Content
              </button>
              <button
                onClick={() => {
                  handleSectionToggle(viewingSection.id);
                  setViewingSection(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedSections.includes(viewingSection.id)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {selectedSections.includes(viewingSection.id)
                  ? 'Remove from Context'
                  : 'Add to Context'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Layout: workspace panel on top, prompt and generated content below
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="w-full px-8 pt-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/workspaces')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            title="Back to Workspaces"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Author</h1>
            <p className="text-neutral-600 text-lg">
              Create, refine, and generate proposals using your workspace content.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-8">
        {/* Top horizontal workspace panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Workspace</h3>
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-gray-900 text-base font-medium truncate">
                {workspaceNameFromState || selectedWorkspaceObj.name || 'Workspace'}
              </div>

              {selectedWorkspace && (
                <div className="flex flex-col gap-4 w-full max-w-md">
                  <Select
                    isMulti
                    value={sectionTemplates
                      .filter((template) => selectedSections.includes(template.id))
                      .map((template) => ({
                        value: template.id,
                        label: template.name,
                      }))}
                    onChange={(selectedOptions) => {
                      const newSelectedSections = selectedOptions
                        ? selectedOptions.map((option) => Number(option.value))
                        : [];
                      setSelectedSections(newSelectedSections);

                      // Update prompts when selections change
                      if (sectionTemplates.length > 0) {
                        const selectedTemplates = sectionTemplates.filter((template) =>
                          newSelectedSections.includes(template.id),
                        );

                        const combinedPrompts = selectedTemplates
                          .map((template) => {
                            const sectionHeader = `Section: ${template.name}\n`;
                            return template.prompt
                              ? sectionHeader + template.prompt
                              : sectionHeader;
                          })
                          .join('\n\n');

                        setPrompt(combinedPrompts);
                        setSelectedSectionName(selectedTemplates.map((t) => t.name).join(', '));
                      }
                    }}
                    options={sectionTemplates.map((template) => ({
                      value: template.id,
                      label: template.name,
                    }))}
                    className="w-full"
                    classNames={{
                      control: (state) =>
                        'bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-500',
                      multiValue: () => 'bg-blue-50 border border-blue-100 rounded-md',
                      multiValueLabel: () => 'text-blue-700 text-sm px-2 py-1',
                      multiValueRemove: () =>
                        'text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-r-md px-1',
                      menu: () => 'bg-white border border-gray-200 rounded-lg shadow-lg mt-1',
                      option: (state) =>
                        `px-3 py-2 ${state.isFocused ? 'bg-blue-50' : 'bg-white'} ${
                          state.isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                        } hover:bg-blue-50`,
                    }}
                    placeholder="Select sections..."
                    noOptionsMessage={() => 'No sections available'}
                    isSearchable
                    isClearable
                  />
                </div>
              )}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Add a tag..."
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
                      disabled={!newTag.trim()}
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="p-1 rounded hover:bg-white/20 text-primary"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context list under the workspace panel */}
        {workspaceContent && !contextCollapsed && (
          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Contents</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={contextSearch}
                  onChange={(e) => setContextSearch(e.target.value)}
                  placeholder="Search context..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm"
                />
                <div className="absolute left-2 top-2 text-gray-400">
                  <FiSearch />
                </div>
              </div>
              {workspaceContent && (
                <div className="mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                      ~{selectedTokens.toLocaleString()} tokens
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-context-sections-top"
                        checked={
                          selectedContentSections.length ===
                            (workspaceContent.sections?.length || 0) &&
                          (workspaceContent.sections?.length || 0) > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContentSections(
                              (workspaceContent.sections || []).map((s: any) => s.id),
                            );
                            const newSelected: Record<string, Set<number>> = {};
                            (workspaceContent.sections || []).forEach((s: any) => {
                              const minors = Array.isArray(s.content) ? s.content.length : 0;
                              newSelected[String(s.id)] = new Set(
                                Array.from({ length: minors }, (_, i) => i),
                              );
                            });
                            setSelectedMinorChunks(newSelected);
                          } else {
                            setSelectedContentSections([]);
                            setSelectedMinorChunks({});
                          }
                        }}
                      />
                      <label htmlFor="select-all-context-sections-top" className="text-sm">
                        Select All
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {(workspaceContent.sections || []).map((section: Section, idx: number) => {
                const heading = section.name || `Section ${idx + 1}`;
                const sectId = String(section.id);
                const minors: any[] = (() => {
                  try {
                    return typeof section.content === 'string'
                      ? JSON.parse(section.content)
                      : section.content || [];
                  } catch {
                    return section.content && Array.isArray(section.content) ? section.content : [];
                  }
                })();
                const expanded = !!expandedMajors[sectId];
                const selectedSet = selectedMinorChunks[sectId] || new Set<number>();
                return (
                  <div
                    key={sectId}
                    className="border-b border-gray-100 p-2 rounded hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedContentSections.includes(section.id)}
                        onChange={() => {
                          if (selectedContentSections.includes(section.id)) {
                            setSelectedContentSections((prev) =>
                              prev.filter((id) => id !== section.id),
                            );
                            const copy = { ...selectedMinorChunks };
                            delete copy[sectId];
                            setSelectedMinorChunks(copy);
                          } else {
                            setSelectedContentSections((prev) => [...prev, section.id]);
                            const allIdx = new Set<number>();
                            minors.forEach((_, i) => allIdx.add(i));
                            setSelectedMinorChunks((prev) => ({ ...prev, [sectId]: allIdx }));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <button
                        onClick={() =>
                          setExpandedMajors((prev) => ({ ...prev, [sectId]: !prev[sectId] }))
                        }
                        className="flex-1 text-left"
                      >
                        <span className="font-medium text-gray-900 truncate">{heading}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={() => handleViewSection(section)}
                        >
                          View
                        </button>
                        <button
                          onClick={() =>
                            setExpandedMajors((prev) => ({ ...prev, [sectId]: !prev[sectId] }))
                          }
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          {expanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </div>
                    </div>

                    {expanded && minors.length > 0 && (
                      <div className="mt-2 ml-6 space-y-2">
                        {minors.map((minor: any, mi: number) => {
                          const minorText =
                            typeof minor === 'string' ? minor : minor.text || JSON.stringify(minor);
                          const isSelected = selectedSet.has(mi);
                          return (
                            <div key={mi} className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedMinorChunks((prev) => {
                                    const copy = { ...prev };
                                    const setFor = copy[sectId]
                                      ? new Set(copy[sectId])
                                      : new Set<number>();
                                    if (setFor.has(mi)) setFor.delete(mi);
                                    else setFor.add(mi);
                                    copy[sectId] = setFor;
                                    const anySelected = Array.from(setFor).length > 0;
                                    setSelectedSections((prevSections) => {
                                      if (anySelected)
                                        return prevSections.includes(section.id)
                                          ? prevSections
                                          : [...prevSections, section.id];
                                      return prevSections.filter((id) => id !== section.id);
                                    });
                                    return copy;
                                  });
                                }}
                                className="w-4 h-4 mt-1"
                              />
                              <div className="text-sm text-gray-700">
                                <div className="font-medium">{minor.tag || `Chunk ${mi + 1}`}</div>
                                <div className="text-xs text-gray-500 line-clamp-3">
                                  {minorText}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main area: prompt input and generated content */}
      <main className="px-8 pb-8">
        <div className="pt-6">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedSections.length > 0
              ? `Selected Sections: ${selectedSectionName}`
              : 'Select Sections'}
          </h2>
          {selectedSections.length > 0 && prompt && (
            <div className="bg-gray-50 rounded-md p-3 text-gray-800 whitespace-pre-line border border-gray-200 text-sm mt-2">
              {prompt}
            </div>
          )}

          {/* Default content cards for selected sections */}
          {selectedSections.length > 0 && (
            <div className="mt-3 space-y-2">
              {sectionTemplates
                .filter((t) => selectedSections.includes(t.id) && (t.default_content?.trim()?.length || 0) > 0)
                .map((t) => (
                  <div key={t.id} className="bg-white rounded-md border border-gray-200 p-3">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Default Section: {t.name}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">{t.default_content}</div>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-4">
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Type your prompt or instructions..."
              className="w-full min-h-[40px] max-h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`font-medium ${tokenLimitExceeded ? 'text-red-600' : 'text-gray-600'}`}
                >
                  Total Input Tokens: {totalInputTokens.toLocaleString()}/5,000
                </span>
                {tokenLimitExceeded && (
                  <span className="text-red-600 text-xs font-medium">
                    ⚠️ Limit exceeded! Reduce content to continue.
                  </span>
                )}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${tokenLimitExceeded ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((totalInputTokens / 5000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={handleGenerate}
                disabled={
                  !prompt.trim() || !selectedWorkspace || isGenerating || tokenLimitExceeded
                }
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg flex items-center gap-2 ${tokenLimitExceeded ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {' '}
                {isGenerating ? (
                  <FiLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <FiZap className="w-5 h-5" />
                )}{' '}
                {tokenLimitExceeded ? 'Token Limit Exceeded' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Option buttons above generated content */}
          {generatedContent && (
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(generatedContent)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg text-sm"
              >
                <FiCopy className="w-4 h-4" /> Copy
              </button>
              <button
                onClick={handleRetry}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /> Retry
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiSave className="w-4 h-4" />
                )}{' '}
                Save
              </button>
              <button
                onClick={() => {
                  const doc = new jsPDF();
                  const lines = doc.splitTextToSize(generatedContent, 180);
                  doc.text(lines, 10, 10);
                  doc.save('proposal.pdf');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
              >
                <FiFileText className="w-4 h-4" /> Download as PDF
              </button>
            </div>
          )}

          {/* Generated content card */}
          {generatedContent && (
            <div className="mt-4 bg-white rounded-xl p-4 shadow border border-gray-100 max-w-4xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-900 font-medium">AI Response</div>
                {tokenInfo && (
                  <div className="text-xs text-indigo-600 font-medium">
                    {tokenInfo.response_tokens.toLocaleString()} tokens
                  </div>
                )}
              </div>
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown>{generatedContent}</ReactMarkdown>
              </div>
            </div>
          )}

          <SectionViewModal />
        </div>
      </main>
    </div>
  );
};

export default ProposalAuthoring;
