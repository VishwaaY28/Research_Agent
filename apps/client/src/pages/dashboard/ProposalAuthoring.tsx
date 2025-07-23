import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiCopy,
  FiEye,
  FiFileText,
  FiLoader,
  FiRefreshCw,
  FiSave,
  FiTag,
  FiX,
  FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useContent,
  type Prompt,
  type Section,
  type WorkspaceContent,
} from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';

const ProposalAuthoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, fetchWorkspaces } = useWorkspace();
  const {
    getWorkspaceContent,
    generateContent,
    saveGeneratedContent,
    loading: contentLoading,
    getWorkspacePrompts,
    getWorkspaceGeneratedContent,
  } = useContent();

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaceContent, setWorkspaceContent] = useState<WorkspaceContent | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [sectionPrompts, setSectionPrompts] = useState<Prompt[]>([]);
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [activeTab, setActiveTab] = useState<'prompts' | 'generated'>('prompts');
  const [generatedPrompts, setGeneratedPrompts] = useState<any[]>([]);

  // Add static section lists for each workspace type
  const WORKSPACE_SECTIONS: Record<string, { name: string }[]> = {
    Proposal: [
      { name: 'Executive Summary' },
      { name: 'Problem Statement' },
      { name: 'Proposed Solution' },
      { name: 'Scope of Work' },
      { name: 'Project Approach and Methodology' },
      { name: 'Project Plan and Timeline' },
      { name: 'Team Composition and Roles' },
    ],
    Blog: [
      { name: 'Title' },
      { name: 'Introduction' },
      { name: 'Main Content' },
      { name: 'Tips & Insights' },
      { name: 'Conclusion' },
      { name: 'References' },
      { name: 'Author Bio' },
    ],
  };

  // Add static prompt map for each workspace type and section
  const WORKSPACE_SECTION_PROMPTS: Record<string, Record<string, string>> = {
    Proposal: {
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
    },
    'Service Agreement': {
      'Agreement Overview': 'Summarize the purpose and scope of the service agreement.',
      'Services Provided': 'List and describe the services to be provided under this agreement.',
      'Service Levels': 'Define the expected service levels and performance metrics.',
      Responsibilities: 'Outline the responsibilities of both parties.',
      'Payment Terms': 'Specify the payment terms, schedule, and invoicing process.',
      'Termination Clause': 'Describe the conditions under which the agreement may be terminated.',
      Confidentiality: 'Explain the confidentiality obligations of both parties.',
    },
    Report: {
      Introduction: 'Provide an introduction to the report, including objectives and background.',
      Methodology: 'Describe the methods and processes used to gather and analyze data.',
      Findings: 'Summarize the key findings of the report.',
      Analysis: 'Provide a detailed analysis of the findings.',
      Recommendations: 'Offer actionable recommendations based on the analysis.',
      Conclusion: 'Summarize the main points and conclusions of the report.',
      Appendices: 'Include any supplementary material or data.',
    },
    Research: {
      Abstract: 'Summarize the research topic, objectives, and key findings.',
      Introduction: 'Introduce the research problem and its significance.',
      'Literature Review': 'Review relevant literature and previous research.',
      Methodology: 'Describe the research design, methods, and procedures.',
      Results: 'Present the results of the research.',
      Discussion: 'Interpret the results and discuss their implications.',
      References: 'List all references and sources cited in the research.',
    },
    Template: {
      Header: 'Provide the header for the template, including title and date.',
      Body: 'Describe the main content or body of the template.',
      Footer: 'Include footer information such as page numbers or disclaimers.',
      Instructions: 'Provide instructions for using or filling out the template.',
      Checklist: 'List items to be checked or completed in the template.',
      Summary: 'Summarize the purpose and key points of the template.',
      Appendix: 'Include any additional material or resources.',
    },
    Blog: {
      Title: 'Provide a catchy and relevant title for the blog post.',
      Introduction: 'Write an engaging introduction to the blog topic.',
      'Main Content': 'Develop the main content with supporting arguments and examples.',
      'Tips & Insights': 'Share tips, insights, or personal experiences related to the topic.',
      Conclusion: 'Conclude the blog post with a summary or call to action.',
      References: 'List any sources or references used in the blog post.',
      'Author Bio': 'Provide a brief bio of the blog author.',
    },
  };

  const selectedWorkspaceObj = workspaces.find((w) => w.id === selectedWorkspace) || {
    workspaceType: '',
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Pre-fill from navigation state (prompt template or workspace selection)
  useEffect(() => {
    if (location.state) {
      // Handle direct workspace selection (from Generate Prompt button or after prompt save)
      if (location.state.workspaceId) {
        setSelectedWorkspace(location.state.workspaceId);
      }
      // Handle section selection (after prompt save)
      if (location.state.sectionName) {
        setSelectedSectionName(location.state.sectionName);
      }
      // Handle workspace type selection (from prompt template)
      else if (location.state.type && workspaces.length > 0) {
        const ws = workspaces.find((w) => w.workspaceType === location.state.type);
        if (ws) setSelectedWorkspace(ws.id);
      }

      // Handle prompt if provided
      if (location.state.prompt) {
        setPrompt(location.state.prompt);
      }
    }
  }, [location.state, workspaces]);

  // Load workspace content when workspace is selected
  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceContent();
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace && selectedSectionId) {
      fetchSectionPrompts();
    }
  }, [selectedWorkspace, selectedSectionId]);

  // When a section is selected, auto-fill the prompt input
  useEffect(() => {
    if (selectedWorkspaceObj && selectedSectionName) {
      // Get the workspace type (either from the object or infer it)
      let workspaceType = selectedWorkspaceObj.workspaceType;
      if (!workspaceType && 'name' in selectedWorkspaceObj && selectedWorkspaceObj.name) {
        const name = selectedWorkspaceObj.name.toLowerCase();
        if (name.includes('proposal')) workspaceType = 'Proposal';
        else if (name.includes('service') || name.includes('agreement'))
          workspaceType = 'Service Agreement';
        else if (name.includes('report')) workspaceType = 'Report';
        else if (name.includes('research')) workspaceType = 'Research';
        else if (name.includes('template')) workspaceType = 'Template';
        else if (name.includes('blog')) workspaceType = 'Blog';
        else workspaceType = 'Proposal';
      }

      // Get the prompt for this section from our mapping
      const promptText =
        WORKSPACE_SECTION_PROMPTS[workspaceType || '']?.[selectedSectionName] || '';

      console.log('Setting prompt for section:', {
        workspaceType,
        selectedSectionName,
        promptText,
      });

      setPrompt(promptText);
      setUserPrompt(''); // Clear any user-added prompt when changing sections
    }
  }, [selectedWorkspaceObj, selectedSectionName]);

  // Fetch prompts for the selected section
  useEffect(() => {
    async function fetchPrompts() {
      if (selectedWorkspace && selectedSectionName) {
        const allPrompts = await getWorkspacePrompts(selectedWorkspace);
        console.log('Fetched prompts:', allPrompts);
        console.log('Selected section name:', selectedSectionName);
        setSectionPrompts(
          allPrompts.filter((p) => {
            const parts = p.title.split(' - ');
            const match =
              parts.length > 1 &&
              parts[1].trim().toLowerCase() === selectedSectionName.trim().toLowerCase();
            if (!match) {
              console.log('Prompt not matched:', p.title, 'vs', selectedSectionName);
            }
            return match;
          }),
        );
      } else {
        setSectionPrompts([]);
      }
    }
    fetchPrompts();
  }, [selectedWorkspace, selectedSectionName, getWorkspacePrompts]);

  // Fetch generated content for the selected workspace
  useEffect(() => {
    async function fetchGenerated() {
      if (selectedWorkspace) {
        const allGenerated = await getWorkspaceGeneratedContent(selectedWorkspace);
        setGeneratedPrompts(
          selectedSectionName
            ? allGenerated.filter(
                (g) =>
                  g.prompt_title &&
                  g.prompt_title.toLowerCase().includes(selectedSectionName.toLowerCase()),
              )
            : allGenerated,
        );
      } else {
        setGeneratedPrompts([]);
      }
    }
    fetchGenerated();
  }, [selectedWorkspace, selectedSectionName, getWorkspaceGeneratedContent]);

  // Section selector now uses static list based on workspace type
  const sectionList: { name: string }[] = (() => {
    if (!selectedWorkspaceObj) return [];

    // Get workspace type from the workspace object
    let workspaceType = selectedWorkspaceObj.workspaceType;

    // If workspaceType is undefined, try to infer from workspace name
    if (!workspaceType && 'name' in selectedWorkspaceObj && selectedWorkspaceObj.name) {
      const name = selectedWorkspaceObj.name.toLowerCase();
      if (name.includes('proposal')) workspaceType = 'Proposal';
      else if (name.includes('blog')) workspaceType = 'Blog';
      else workspaceType = '';
    }

    // Normalize for comparison
    const type = (workspaceType || '').toLowerCase().trim();
    if (type === 'blog') {
      return WORKSPACE_SECTIONS['Blog'];
    }
    if (type === 'proposal') {
      return WORKSPACE_SECTIONS['Proposal'];
    }
    return WORKSPACE_SECTIONS['Proposal'];
  })();

  // Debug logging
  console.log('Debug section dropdown:', {
    selectedWorkspace,
    selectedWorkspaceObj,
    workspaceType: selectedWorkspaceObj?.workspaceType,
    workspaceName: 'name' in selectedWorkspaceObj ? selectedWorkspaceObj.name : undefined,
    sectionList,
    availableTypes: Object.keys(WORKSPACE_SECTIONS),
  });

  const loadWorkspaceContent = async () => {
    if (!selectedWorkspace) return;

    try {
      const content = await getWorkspaceContent(selectedWorkspace);
      setWorkspaceContent(content);
    } catch (error) {
      toast.error('Failed to load workspace content');
      console.error('Error loading workspace content:', error);
    }
  };

  const fetchSectionPrompts = async () => {
    // Replace with real API call to fetch prompts for the selected workspace/section
    // Example: await getPromptsBySection(selectedWorkspace, selectedSectionId)
    // For now, just clear or mock
    setSectionPrompts([]); // TODO: Replace with real fetch
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedWorkspace) {
      toast.error('Please enter a prompt and select a workspace');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generateContent(selectedWorkspace, prompt, selectedSections);
      setGeneratedContent(content);
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
      navigate('/dashboard/proposal-authoring');
    } catch (error) {
      toast.error('Failed to save content');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setGeneratedContent('');
    handleGenerate();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
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

  const handleViewSection = (section: Section) => {
    setViewingSection(section);
  };

  const SectionViewModal = () => {
    if (!viewingSection) return null;

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
                {viewingSection.content}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {viewingSection.tags && viewingSection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingSection.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      <FiTag className="w-3 h-3 mr-1" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(viewingSection.content)}
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

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generate Content</h1>
                <p className="text-gray-600 mt-1">
                  Create AI-powered content using your workspace resources
                </p>
              </div>
            </div>

            {generatedContent && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(generatedContent)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiCopy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleRetry}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Retry
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {isSaving ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  Save Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Workspace</h3>
              <div className="relative">
                {location.state?.workspaceId ? (
                  // Show only the originating workspace as plain text inside a box
                  <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-gray-900 text-base font-medium">
                    {workspaces.find((w) => w.id === location.state.workspaceId)?.name ||
                      'Workspace'}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                      className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors text-sm"
                    >
                      <span
                        className={
                          selectedWorkspaceObj && 'name' in selectedWorkspaceObj
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }
                      >
                        {'name' in selectedWorkspaceObj
                          ? selectedWorkspaceObj.name
                          : 'Choose a workspace...'}
                      </span>
                      <FiChevronDown className="w-4 h-4" />
                    </button>

                    {showWorkspaceDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto text-sm">
                        {workspaces.map((workspace) => (
                          <button
                            key={workspace.id}
                            onClick={() => {
                              setSelectedWorkspace(workspace.id);
                              setShowWorkspaceDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md transition-colors"
                          >
                            <div className="font-medium text-gray-900">{workspace.name}</div>
                            <div className="text-xs text-gray-500">{workspace.clientName}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Section selector only appears if a workspace is selected */}
            {selectedWorkspace && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Section</h3>
                <div className="relative mb-2">
                  <select
                    value={selectedSectionName}
                    onChange={(e) => setSelectedSectionName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    disabled={!sectionList.length}
                  >
                    <option value="">Section...</option>
                    {sectionList.map((section: { name: string }) => (
                      <option key={section.name} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display the prompt selection dropdown and auto-generated prompt */}
                {selectedSectionName && (
                  <div className="mt-2">
                    <h4 className="font-medium text-gray-800 mb-1 text-sm">Saved Prompts</h4>
                    {sectionPrompts.length > 0 ? (
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 text-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      >
                        <option value="">-- Select a saved prompt --</option>
                        {sectionPrompts.map((p) => (
                          <option key={p.id} value={p.content}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-gray-500 mb-2">
                        No saved prompts for this section.
                      </div>
                    )}
                    <h4 className="font-medium text-gray-800 mb-1 text-sm">
                      Auto-Generated Prompt
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3 text-gray-800 whitespace-pre-line select-none cursor-not-allowed border border-gray-200 text-sm">
                      {prompt ||
                        WORKSPACE_SECTION_PROMPTS[selectedWorkspaceObj.workspaceType || '']?.[
                          selectedSectionName
                        ] ||
                        ''}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User prompt input */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Your Additional Instructions
              </h3>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Add your own instructions or modifications to the prompt..."
                className="w-full min-h-[60px] border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {workspaceContent && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Context</h3>
                  {/* Select All Checkbox */}
                  {workspaceContent.sections.length > 0 && (
                    <div className="flex items-center">
                      <label
                        htmlFor="select-all-sections"
                        className="text-sm text-gray-700 cursor-pointer mr-2"
                      >
                        Select All
                      </label>
                      <input
                        type="checkbox"
                        id="select-all-sections"
                        checked={selectedSections.length === workspaceContent.sections.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections(
                              workspaceContent.sections.map((section) => section.id),
                            );
                          } else {
                            setSelectedSections([]);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {workspaceContent.sections.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <FiFileText className="w-4 h-4" />
                        Content Sections ({selectedSections.length}/
                        {workspaceContent.sections.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {workspaceContent.sections.map((section: Section) => (
                          <div
                            key={section.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.id)}
                              onChange={() => handleSectionToggle(section.id)}
                              className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleSectionToggle(section.id)}
                            >
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {section.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {section.content.substring(0, 100)}...
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSection(section);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary rounded transition-all"
                              title="View full content"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        <FiTag className="w-3 h-3 mr-1" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-primary hover:text-primary/80"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedWorkspace || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiZap className="w-4 h-4" />
              )}
              Generate Content
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[655px] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
              </div>
              <div className="p-6">
                {contentLoading || isGenerating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <FiLoader className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Generating your content...</p>
                    </div>
                  </div>
                ) : generatedContent ? (
                  <div className="prose prose-gray max-w-none">
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiZap className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to generate</h4>
                      <p className="text-gray-600">
                        Configure your prompt and context, then click "Generate Content" to get
                        started.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionViewModal />
    </div>
  );
};

export default ProposalAuthoring;
