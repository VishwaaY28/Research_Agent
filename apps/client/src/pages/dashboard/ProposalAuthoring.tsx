import { encoding_for_model } from '@dqbd/tiktoken';
import jsPDF from 'jspdf';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiEdit,
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
  const [selectedSectionId, _setSelectedSectionId] = useState<string>('');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [fallbackWorkspace, setFallbackWorkspace] = useState<Workspace | null>(null);
  // UI state for context panel
  const [contextCollapsed, _setContextCollapsed] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [expandedMajors, setExpandedMajors] = useState<Record<string, boolean>>({});
  const [selectedMinorChunks, setSelectedMinorChunks] = useState<Record<string, Set<number>>>({});
  const [sectionTemplates, setSectionTemplates] = useState<
    { id: number; name: string; order: number; prompt?: string; default_content?: string }[]
  >([]);
  const [_sectionTemplatesLoading, setSectionTemplatesLoading] = useState(false);
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

  // handleSectionToggle removed (unused) to avoid linter warnings

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

    // If any selected section templates (from the template multi-select) include
    // `default_content`, instruct the model NOT to generate content for those
    // templates and instead include the exact default content verbatim. The UI
    // displays template defaults from `sectionTemplates` when a template is
    // chosen via `selectedSections` (the top multi-select). We add an explicit
    // instruction prefix so the LLM doesn't generate for those templates, and
    // as a safety-net we append any missing default contents client-side after
    // the model response.
    const selectedTemplates = sectionTemplates.filter((t) => selectedSections.includes(t.id));
    const templatesWithDefaults = selectedTemplates.filter(
      (t) => (t.default_content || '').trim().length > 0,
    );
    let generationPromptPrefix = '';
    if (templatesWithDefaults.length > 0) {
      generationPromptPrefix +=
        'IMPORTANT: For the templates listed below, do NOT generate any new or additional content. ' +
        'Instead include the following default content exactly as provided (verbatim) for each template in the final output under the appropriate heading.\n\n';
      templatesWithDefaults.forEach((t) => {
        generationPromptPrefix += `TEMPLATE: ${t.name}\nDEFAULT_CONTENT_START\n${t.default_content}\nDEFAULT_CONTENT_END\n\n`;
      });
      generationPromptPrefix +=
        'For all other templates/sections, generate content as requested by the prompt.\n\n';
    }

    setIsGenerating(true);
    try {
      let result: any;
      // Use the context checkbox selections (selectedContentSections) as the set of sections
      // to include when generating content. selectedSections is used elsewhere for template
      // selection, so using selectedContentSections avoids mixing concerns.
      // Prepend generationPromptPrefix so the model knows which templates to skip
      // and which default contents to include verbatim.
      const promptToSend = generationPromptPrefix + combinedPrompt;

      if ((selectedContentSections || []).length > 0) {
        result = await generateContent(selectedWorkspace, promptToSend, selectedContentSections);
      } else {
        const sectionHeading = selectedSectionName
          ? `Section: ${selectedSectionName} (Type: ${selectedWorkspaceObj.workspace_type || 'Proposal'})\n\n`
          : '';
        result = await generateContent(selectedWorkspace, sectionHeading + promptToSend, []);
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

  // Safety-net: ensure any selected template default_content appears verbatim
  // in the final generatedContent. This appends missing defaults (unchanged)
  // to the end of the generated content under a clear heading so nothing is
  // modified for those templates.
  useEffect(() => {
    if (!generatedContent) return;
    const selectedTemplates = sectionTemplates.filter((t) => selectedSections.includes(t.id));
    const templatesWithDefaults = selectedTemplates.filter(
      (t) => (t.default_content || '').trim().length > 0,
    );
    if (templatesWithDefaults.length === 0) return;

    let newContent = generatedContent;
    templatesWithDefaults.forEach((t) => {
      const defaultText = (t.default_content || '').trim();
      if (!defaultText) return;
      // Check if defaultText is already present verbatim in the generated content
      if (!newContent.includes(defaultText)) {
        newContent += `\n\n<!-- DEFAULT CONTENT: ${t.name} START -->\n${defaultText}\n<!-- DEFAULT CONTENT: ${t.name} END -->`;
      }
    });

    if (newContent !== generatedContent) {
      setGeneratedContent(newContent);
    }
  }, [generatedContent, sectionTemplates, selectedSections]);

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
        selectedContentSections,
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

  // Rewrite modal state and helpers: regenerate only a specific section
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewriteTemplateId, setRewriteTemplateId] = useState<number | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const stripLeadingSectionHeading = (text: string, sectionName: string) => {
    if (!text) return text;
    const lines = text.split(/\r?\n/);
    // remove leading markdown heading lines that include the section name
    while (lines.length) {
      const line = lines[0].trim();
      if (/^#{1,6}\s*/.test(line)) {
        const hdrText = line.replace(/^#{1,6}\s*/, '').trim();
        if (hdrText.toLowerCase().includes(sectionName.toLowerCase())) {
          lines.shift();
          continue;
        }
      }
      if (/^Section:\s*/i.test(line)) {
        const hdrText = line.replace(/^Section:\s*/i, '').trim();
        if (hdrText.toLowerCase().includes(sectionName.toLowerCase())) {
          lines.shift();
          continue;
        }
      }
      break;
    }
    return lines.join('\n').trim();
  };

  // NOTE: previous implementation had a helper to replace a section block inside
  // the existing generated content. That helper was removed because the rewrite
  // flow now overwrites the displayed generated content entirely to avoid
  // accidental appends or duplicated sections.

  const handleOpenRewrite = () => {
    // default the selector to first selected template (sectionTemplates) or first available template
    let defaultId: number | null = null;
    if (selectedSections && selectedSections.length > 0) defaultId = selectedSections[0];
    else if (sectionTemplates && sectionTemplates.length > 0) defaultId = sectionTemplates[0].id;
    setRewriteTemplateId(defaultId);
    setRewriteInstruction('');
    setRewriteOpen(true);
  };

  const handleDoRewrite = async () => {
    if (!rewriteTemplateId || !selectedWorkspace) {
      toast.error('Select a section to rewrite and make sure a workspace is selected');
      return;
    }

    setIsRewriting(true);
    try {
      // Build a focused prompt: include the user's instruction and request the model to only output
      // the content for the requested section template (header). This helps keep other sections unchanged.
      const templateObj = (sectionTemplates || []).find((t: any) => t.id === rewriteTemplateId);
      const sectionName = templateObj?.name || `Section ${rewriteTemplateId}`;

      const instructionText = rewriteInstruction?.trim()
        ? `UPDATE_INSTRUCTION:\n${rewriteInstruction.trim()}\n\n`
        : '';

      // Build a regeneration prompt that provides the current full document and instructs
      // the model to regenerate the entire document but ONLY modify the specified section.
      // This approach asks the model to return the whole document (so we can replace it
      // atomically) while preserving other sections exactly.
      const currentDoc = generatedContent || '';

      const regenPrefix = `YOU ARE GIVEN THE CURRENT GENERATED DOCUMENT BELOW.\n`;
      const regenInstruction =
        `Regenerate the ENTIRE document and return the full document as the final output. ` +
        `IMPORTANT: Do NOT change any section except the one named \"${sectionName}\". ` +
        `Only update the content of that single section according to the instruction provided. ` +
        `Preserve all other sections, headings, ordering, punctuation, and formatting exactly as they are. ` +
        `If you cannot follow the instruction for the named section, return the original document unchanged.\n\n`;

      const promptToSend =
        regenPrefix +
        regenInstruction +
        instructionText +
        '\nCURRENT_DOCUMENT_START\n' +
        currentDoc +
        '\nCURRENT_DOCUMENT_END\n\n';

      // Request a full-document regeneration. We pass selectedContentSections as context if present
      // so the server can include chunk-level context if it uses it.
      const res: any = await generateContent(
        selectedWorkspace,
        promptToSend,
        selectedContentSections || [],
      );
      const returned = (res && res.content) || '';

      // Always clear the previous generated content and show only the updated result.
      // If the response looks like a full document, use it as-is. Otherwise use the
      // cleaned returned snippet (strip any leading section heading) and replace the
      // displayed content with that snippet (do NOT append to the previous content).
      const cleaned = stripLeadingSectionHeading(returned, sectionName);
      const looksLikeFullDoc = (() => {
        if (!returned) return false;
        // crude heuristics: contains the sectionName heading OR contains multiple markdown headings
        const hasSectionHeading =
          new RegExp(`^#{1,6}\\s*${escapeRegExp(sectionName)}\\s*$`, 'im').test(returned) ||
          new RegExp(`^Section:\\s*${escapeRegExp(sectionName)}$`, 'im').test(returned);
        const headingCount = (returned.match(/^#{1,6}\\s+/gim) || []).length;
        return (
          hasSectionHeading ||
          headingCount >= 2 ||
          returned.includes('CURRENT_DOCUMENT_END') ||
          returned.includes('CURRENT_DOCUMENT_START')
        );
      })();

      if (looksLikeFullDoc) {
        setGeneratedContent(returned);
      } else {
        // Overwrite the displayed content with the cleaned snippet. This ensures the
        // old generated document isn't preserved/duplicated beneath the new content.
        setGeneratedContent(cleaned || returned || '');
      }
      toast.success('Section rewritten successfully');
      setRewriteOpen(false);
    } catch (err) {
      console.error('Rewrite failed', err);
      toast.error('Failed to rewrite section');
    } finally {
      setIsRewriting(false);
    }
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

  // Calculate token count for selected sections/minor chunks using tiktoken-js
  useEffect(() => {
    let cancelled = false;
    async function updateTokens() {
      if (!workspaceContent) {
        setSelectedTokens(0);
        return;
      }

      // Build list of section ids that are relevant: either checked via selectedContentSections
      // or have selected minor chunks in selectedMinorChunks
      const sectionIds = new Set<number>();
      (selectedContentSections || []).forEach((id) => sectionIds.add(id));
      Object.keys(selectedMinorChunks || {}).forEach((sid) => {
        const setFor = selectedMinorChunks[sid];
        if (setFor && setFor.size > 0) sectionIds.add(Number(sid));
      });

      if (sectionIds.size === 0) {
        setSelectedTokens(0);
        return;
      }

      const encoder = await encoding_for_model('gpt-3.5-turbo');
      let totalTokens = 0;

      const minorText = (minor: any) => {
        try {
          if (!minor) return '';
          if (typeof minor === 'string') return minor;
          if (typeof minor === 'object') {
            if (typeof minor.text === 'string') return minor.text;
            if (typeof minor.content === 'string') return minor.content;
          }
          return String(minor || '');
        } catch {
          return '';
        }
      };

      for (const sid of Array.from(sectionIds)) {
        const section = (workspaceContent.sections || []).find((s: any) => s.id === sid);
        if (!section) continue;

        // normalize minors
        let minors: any[] = [];
        try {
          if (typeof section.content === 'string') {
            const parsed = JSON.parse(section.content);
            minors = Array.isArray(parsed) ? parsed : [{ text: section.content }];
          } else if (Array.isArray(section.content)) {
            minors = section.content;
          } else if (section.content) {
            minors = [{ text: section.content }];
          }
        } catch {
          minors = Array.isArray(section.content) ? section.content : [{ text: section.content }];
        }

        const setFor = selectedMinorChunks[String(sid)];
        if (setFor && setFor.size > 0) {
          for (const mi of Array.from(setFor)) {
            const m = minors[mi];
            const text = minorText(m) || '';
            if (!text) continue;
            const tokens = encoder.encode(text || '');
            totalTokens += tokens.length;
          }
        } else {
          // count whole section
          const allText = minors.map((m) => minorText(m)).join('\n');
          if (allText) {
            const tokens = encoder.encode(allText || '');
            totalTokens += tokens.length;
          }
        }
      }

      encoder.free();
      if (!cancelled) setSelectedTokens(totalTokens);
    }
    updateTokens();
    return () => {
      cancelled = true;
    };
  }, [selectedContentSections, selectedMinorChunks, workspaceContent]);

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

  const generatedRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadPdf = async () => {
    if (!generatedContent) {
      toast.error('No content to download');
      return;
    }

    // Derive filename from first heading or fallbacks; ensure sanitized non-empty name
    let filename = 'proposal.pdf';
    try {
      let title = '';
      if (generatedContent) {
        // prefer an obvious top-level markdown heading
        const mdHeading = generatedContent.match(/^#{1,6}\s*(.+)$/m);
        if (mdHeading && mdHeading[1]) {
          title = mdHeading[1].trim();
        }

        // next prefer a 'Section: Name' style first occurrence
        if (!title) {
          const sectionLine = generatedContent.match(/^Section:\s*(.+)$/im);
          if (sectionLine && sectionLine[1]) title = sectionLine[1].trim();
        }

        // next prefer HTML headings if present
        if (!title) {
          const htmlH =
            generatedContent.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
            generatedContent.match(/<h2[^>]*>(.*?)<\/h2>/i);
          if (htmlH && htmlH[1]) title = htmlH[1].trim();
        }

        // fallback to explicit selected section template name
        if (!title && selectedSectionName) title = selectedSectionName;

        // final fallback: first few words (strip HTML comments and excessive whitespace)
        if (!title) {
          const cleaned = generatedContent
            .replace(/<!--([\s\S]*?)-->/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          title = cleaned.split(/\s+/).slice(0, 6).join(' ');
        }
      }

      // sanitize and ensure non-empty
      title = (title || 'generatedContent').replace(/[\\/:*?"<>|]+/g, '').trim();
      if (!title) title = 'generatedContent';
      const safe = title.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      filename = `${safe || 'generatedContent'}.pdf`;
    } catch (e) {
      filename = 'generatedContent.pdf';
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    const source = generatedRef.current;
    if (!source) {
      // fallback to plain-text
      const lines = doc.splitTextToSize(generatedContent, 500);
      doc.text(lines, 10, 10);
      doc.save(filename);
      return;
    }

    try {
      // Try dynamic import of html2canvas for more reliable capture
      const html2canvasModule = await import(
        /* webpackChunkName: "html2canvas" */ 'html2canvas'
      ).catch(() => null);

      // Make sure element is visible/layouted. Temporarily toggle a class if needed.
      const previousVisibility = source.style.visibility;
      const previousOpacity = source.style.opacity;
      try {
        source.style.visibility = 'visible';
        source.style.opacity = '1';

        // allow a tick for font loading/layout
        await new Promise((res) => setTimeout(res, 150));

        if (html2canvasModule && html2canvasModule.default) {
          const canvas = await html2canvasModule.default(source as HTMLElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          });

          // Paginate the canvas into multiple PDF pages if it's taller than one page.
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;

          const pdfPageWidth = doc.internal.pageSize.getWidth();
          const pdfPageHeight = doc.internal.pageSize.getHeight();
          const margin = 20; // left/right/top/bottom
          const pdfUsableWidth = pdfPageWidth - margin * 2;
          const pdfUsableHeight = pdfPageHeight - margin * 2;

          // Ratio between canvas px and PDF pts
          const pxToPtRatio = pdfUsableWidth / imgWidth;

          // How many canvas pixels fit on one PDF page vertically
          const pageHeightPx = Math.floor(pdfUsableHeight / pxToPtRatio);

          let renderedHeight = 0;
          let pageIndex = 0;

          while (renderedHeight < imgHeight) {
            const chunkHeightPx = Math.min(pageHeightPx, imgHeight - renderedHeight);

            // Create a temporary canvas for this page chunk
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = chunkHeightPx;
            const ctx = pageCanvas.getContext('2d');
            if (!ctx) break;

            // Draw the chunk from the full canvas into the page canvas
            ctx.drawImage(
              canvas,
              0,
              renderedHeight,
              imgWidth,
              chunkHeightPx,
              0,
              0,
              imgWidth,
              chunkHeightPx,
            );

            const imgData = pageCanvas.toDataURL('image/png');

            const imgProps = doc.getImageProperties(imgData);
            const renderPdfWidth = pdfUsableWidth;
            const renderPdfHeight = (imgProps.height * renderPdfWidth) / imgProps.width;

            if (pageIndex > 0) doc.addPage();
            doc.addImage(imgData, 'PNG', margin, margin, renderPdfWidth, renderPdfHeight);

            renderedHeight += chunkHeightPx;
            pageIndex += 1;
          }

          doc.save(filename);
          return;
        }

        // If html2canvas isn't available, fall back to jsPDF.html
        await doc.html(source as HTMLElement, { x: 10, y: 10, windowWidth: 800 });
        doc.save(filename);
        return;
      } finally {
        // restore styles
        source.style.visibility = previousVisibility;
        source.style.opacity = previousOpacity;
      }
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF');
      try {
        const lines = doc.splitTextToSize(generatedContent, 500);
        doc.text(lines, 10, 10);
        doc.save(filename);
      } catch (e) {
        console.error('Fallback PDF save failed', e);
      }
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
                  const sid = viewingSection.id;
                  const sectIdStr = String(sid);

                  if (selectedContentSections.includes(sid)) {
                    // Remove section from selected content
                    setSelectedContentSections((prev) => prev.filter((id) => id !== sid));
                    setSelectedMinorChunks((prev) => {
                      const copy = { ...prev };
                      delete copy[sectIdStr];
                      return copy;
                    });
                  } else {
                    // Add section and select all minors
                    setSelectedContentSections((prev) => [...prev, sid]);

                    const minors = (() => {
                      try {
                        if (typeof viewingSection.content === 'string') {
                          const parsed = JSON.parse(viewingSection.content);
                          return Array.isArray(parsed) ? parsed : [];
                        }
                        return Array.isArray(viewingSection.content) ? viewingSection.content : [];
                      } catch {
                        return Array.isArray(viewingSection.content) ? viewingSection.content : [];
                      }
                    })();

                    const allIdx = new Set<number>();
                    minors.forEach((_, i) => allIdx.add(i));
                    setSelectedMinorChunks((prev) => ({ ...prev, [sectIdStr]: allIdx }));
                  }

                  setViewingSection(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedContentSections.includes(viewingSection.id)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {selectedContentSections.includes(viewingSection.id)
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
  // Prepare search/filter helpers and trimmed sections list
  const getMinorSource = (minor: any, section: any) => {
    return (
      minor?.source ||
      minor?.source_file ||
      minor?.source_filename ||
      minor?.file ||
      minor?.filename ||
      section?.source ||
      ''
    );
  };

  const getMinorTags = (minor: any, section: any) => {
    if (Array.isArray(minor?.tags) && minor.tags.length) return minor.tags.map(String);
    if (minor?.tag) return [String(minor.tag)];
    if (Array.isArray(section?.tags) && section.tags.length) return section.tags.map(String);
    return [];
  };

  const filteredSections = (workspaceContent?.sections || []).filter((section: any) => {
    const q = (contextSearch || '').trim().toLowerCase();
    if (!q) return true;
    // match section name, section source, or any minor text/tag/source
    if ((section.name || '').toLowerCase().includes(q)) return true;
    if ((section.source || '').toLowerCase().includes(q)) return true;
    try {
      const minors =
        typeof section.content === 'string' ? JSON.parse(section.content) : section.content || [];
      for (const minor of Array.isArray(minors) ? minors : []) {
        const text = typeof minor === 'string' ? minor : minor?.text || minor?.content || '';
        if ((text || '').toString().toLowerCase().includes(q)) return true;
        const tag = minor?.tag || minor?.tags;
        if (tag) {
          if (Array.isArray(tag)) {
            if (tag.join(' ').toLowerCase().includes(q)) return true;
          } else if (String(tag).toLowerCase().includes(q)) return true;
        }
        const src = getMinorSource(minor, section);
        if (src && src.toLowerCase().includes(q)) return true;
      }
    } catch {
      // ignore parse errors
    }
    return false;
  });
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
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
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
                    // Render menu in a portal so it floats above sticky panels
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                    classNames={{
                      control: () =>
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
          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-0">
            <div className="p-3 sticky top-0 bg-white z-10 border-b border-gray-100">
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
            </div>

            <div className="p-2 max-h-40 overflow-y-auto space-y-2">
              {filteredSections.map((section: Section, idx: number) => {
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
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() =>
                            setExpandedMajors((prev) => ({ ...prev, [sectId]: !prev[sectId] }))
                          }
                          className="text-left w-full"
                        >
                          <span className="font-medium text-gray-900 truncate">{heading}</span>
                        </button>

                        {/* Show source inline (tags moved to controls for side-by-side layout) */}
                        <div className="mt-1">
                          <div className="text-xs text-gray-500 truncate">
                            Source: {section.source || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Render tags next to the View button so they align horizontally */}
                        {Array.isArray(section.tags) && section.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap max-w-[36rem]">
                            {section.tags.map((tag: any, tIdx: number) => (
                              <span
                                key={
                                  typeof tag === 'object' && tag !== null && 'id' in tag
                                    ? tag.id
                                    : tIdx
                                }
                                className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs"
                              >
                                <FiTag className="w-3 h-3 mr-1" />
                                {typeof tag === 'object' && tag !== null && 'name' in tag
                                  ? tag.name
                                  : String(tag)}
                              </span>
                            ))}
                          </div>
                        )}

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
                          const src = getMinorSource(minor, section);
                          const tags = getMinorTags(minor, section);
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
                              <div className="text-sm text-gray-700 w-full">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">
                                    {minor.tag || `Chunk ${mi + 1}`}
                                  </div>
                                  <div className="text-xs text-gray-500">{src}</div>
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-3 mt-1">
                                  {minorText}
                                </div>
                                {tags.length > 0 && (
                                  <div className="mt-1 flex gap-1 flex-wrap">
                                    {tags.map((t: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
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
                .filter(
                  (t) =>
                    selectedSections.includes(t.id) && (t.default_content?.trim()?.length || 0) > 0,
                )
                .map((t) => (
                  <div key={t.id} className="bg-white rounded-md border border-gray-200 p-3">
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Default Section: {t.name}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {t.default_content}
                    </div>
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
                    Limit exceeded! Reduce content to continue.
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
                onClick={handleOpenRewrite}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
              >
                <FiEdit className="w-4 h-4" /> Rewrite
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
                onClick={handleDownloadPdf}
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
                <div ref={generatedRef}>
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          <SectionViewModal />
          {/* Rewrite modal */}
          {rewriteOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Rewrite Section</h3>
                  <button
                    onClick={() => setRewriteOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Section Template</label>
                    <select
                      value={rewriteTemplateId ?? ''}
                      onChange={(e) => setRewriteTemplateId(Number(e.target.value))}
                      className="w-full mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select a section template...</option>
                      {(sectionTemplates || []).map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name || `Template ${t.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Instruction / Prompt
                    </label>
                    <textarea
                      value={rewriteInstruction}
                      onChange={(e) => setRewriteInstruction(e.target.value)}
                      placeholder="Tell the AI how to update this section (be specific). Other sections must remain unchanged."
                      className="w-full mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[80px]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setRewriteOpen(false)}
                      className="px-4 py-2 rounded-md bg-gray-100 text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDoRewrite}
                      disabled={isRewriting || !rewriteTemplateId}
                      className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50"
                    >
                      {isRewriting ? <FiLoader className="w-4 h-4 animate-spin" /> : 'Rewrite'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProposalAuthoring;
