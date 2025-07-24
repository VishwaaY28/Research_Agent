import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';
import ReactModal from 'react-modal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContent } from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';

// Add type for workspace type
interface WorkspaceType {
  id: string;
  name: string;
  sections: Array<{
    name: string;
    prompt: string;
  }>;
}

const WORKSPACE_TYPES: WorkspaceType[] = [
  {
    id: 'proposal',
    name: 'Proposal',
    sections: [
      {
        name: 'Executive Summary',
        prompt:
          'Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition.',
      },
      {
        name: 'Problem Statement',
        prompt:
          'Explain the core business challenges the client is facing and why addressing them is critical.',
      },
      {
        name: 'Proposed Solution',
        prompt:
          "Describe the proposed solution in detail, including key features, components, and how it addresses the client's needs.",
      },
      {
        name: 'Scope of Work',
        prompt:
          'Outline the specific deliverables, services, and responsibilities covered under this proposal.',
      },
      {
        name: 'Project Approach and Methodology',
        prompt:
          'Describe the overall approach, phases, and methodology that will be used to execute the project.',
      },
      {
        name: 'Project Plan and Timeline',
        prompt:
          'Provide a high-level timeline with major milestones and estimated completion dates for key phases.',
      },
      {
        name: 'Team Composition and Roles',
        prompt:
          'List the proposed team members, their roles, responsibilities, and relevant experience.',
      },
    ],
  },
  {
    id: 'blog',
    name: 'Blog',
    sections: [
      { name: 'Title', prompt: 'Provide a catchy and relevant title for the blog post.' },
      { name: 'Introduction', prompt: 'Write an engaging introduction to the blog topic.' },
      {
        name: 'Main Content',
        prompt: 'Develop the main content with supporting arguments and examples.',
      },
      {
        name: 'Tips & Insights',
        prompt: 'Share tips, insights, or personal experiences related to the topic.',
      },
      { name: 'Conclusion', prompt: 'Conclude the blog post with a summary or call to action.' },
      { name: 'References', prompt: 'List any sources or references used in the blog post.' },
      { name: 'Author Bio', prompt: 'Provide a brief bio of the blog author.' },
    ],
  },
];

// Helper to fetch all sections and their prompts for a workspace type
async function fetchSectionsWithPrompts(typeId: number | string) {
  // 1. Fetch sections
  const sectionsResp = await fetch(
    `${API.BASE_URL()}/api/prompt-templates/types/${typeId}/sections`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    },
  );
  if (!sectionsResp.ok) return [];
  const backendSections = await sectionsResp.json();
  // 2. For each section, fetch its prompt (if any)
  const sectionsWithPrompts = await Promise.all(
    backendSections.map(async (section: any) => {
      const promptsResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${section.id}/prompts`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      let prompt = '';
      if (promptsResp.ok) {
        const prompts = await promptsResp.json();
        if (Array.isArray(prompts) && prompts.length > 0) {
          prompt = prompts[0].prompt;
        }
      }
      return { name: section.name, prompt };
    }),
  );
  return sectionsWithPrompts;
}

const PromptTemplatePage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [selectedSection, setSelectedSection] = useState<{ name: string; prompt: string } | null>(
    null,
  );
  const [editablePrompt, setEditablePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const userInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { savePromptToWorkspace } = useContent();
  const [workspaceTypes, setWorkspaceTypes] = useState<any[]>([]); // backend types
  const [customTypes, setCustomTypes] = useState<WorkspaceType[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPrompt, setNewSectionPrompt] = useState('');
  // Add state for selectedWorkspaceId
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  // Add a state to track loading sections
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const { workspaces, fetchWorkspaces } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Merge static and custom types for UI display
  const allTypes = [
    ...WORKSPACE_TYPES,
    ...customTypes,
    ...workspaceTypes.map((t) => ({
      id: t.id, // backend numeric id
      name: t.name,
      sections: [], // sections will be fetched separately if needed
    })),
  ];

  // Find the backend type object for the selected type
  const getBackendType = () => {
    if (!selectedType || !selectedType.name) return null;
    // Try to find by name (case-insensitive)
    return workspaceTypes.find(
      (t) => t.name && t.name.toLowerCase() === selectedType.name.toLowerCase(),
    );
  };

  const handleAddType = () => {
    if (
      newTypeName.trim() &&
      !allTypes.some((t) => t.name.toLowerCase() === newTypeName.trim().toLowerCase())
    ) {
      setCustomTypes([
        ...customTypes,
        {
          id: newTypeName.trim().toLowerCase().replace(/\s+/g, '-'),
          name: newTypeName.trim(),
          sections: [],
        },
      ]);
      setNewTypeName('');
      setShowAddTypeModal(false);
    }
  };

  // Fetch and set sections+prompts for the selected type
  const loadSectionsForType = async (typeObj: any) => {
    if (!typeObj || !typeObj.id) return;
    setSectionsLoading(true);
    try {
      const sectionsWithPrompts = await fetchSectionsWithPrompts(typeObj.id);
      const mergedTypes = allTypes.map((t) =>
        t.id === typeObj.id
          ? {
              ...t,
              sections: sectionsWithPrompts,
            }
          : t,
      );
      setCustomTypes(mergedTypes.filter((t) => !WORKSPACE_TYPES.some((wt) => wt.id === t.id)));
      setSelectedType(mergedTypes.find((t) => t.id === typeObj.id) || null);
    } finally {
      setSectionsLoading(false);
    }
  };

  // On type selection, fetch sections+prompts from backend
  useEffect(() => {
    if (selectedType && workspaceTypes.length > 0) {
      const backendType = getBackendType();
      if (backendType && backendType.id) {
        loadSectionsForType(backendType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, workspaceTypes]);

  // Pre-select workspace and type from navigation state
  useEffect(() => {
    if (location.state?.workspaceId) {
      // setModalWorkspaceId(String(location.state.workspaceId)); // Removed
    }
    if (location.state?.type && workspaces.length > 0) {
      const typeObj = WORKSPACE_TYPES.find((t) => t.name === location.state.type);
      if (typeObj) setSelectedType(typeObj);
    }
  }, [location.state, workspaces]);

  useEffect(() => {
    // setFilteredWorkspaces(workspaces.filter((w) => w.workspaceType === modalWorkspaceType)); // Removed
  }, [/* modalWorkspaceType, */ workspaces]);

  useEffect(() => {
    setEditablePrompt(selectedSection ? selectedSection.prompt : '');
  }, [selectedSection]);

  // Update handleSaveToWorkspace to use selectedWorkspaceId if location.state?.workspaceId is not present
  const handleSaveToWorkspace = async () => {
    if (!selectedType || !selectedSection) {
      toast.error('Please select a type and section');
      return;
    }
    // Prefer navigation state, fallback to selectedWorkspaceId
    let workspaceId = location.state?.workspaceId || selectedWorkspaceId;
    let workspace = workspaces.find((w) => String(w.id) === String(workspaceId));
    if (!workspace) {
      toast.error('Please select a workspace');
      return;
    }
    setSaving(true);
    try {
      const title = `${selectedType.name} - ${selectedSection.name}`;
      await savePromptToWorkspace(workspace.id, title, editablePrompt, []);
      toast.success('Prompt added to workspace');
      await fetchWorkspaces();
      // Reset section and prompt for new entry
      setSelectedSection(null);
      setEditablePrompt('');
      // Optionally, you can also reset selectedSectionName if needed
      // setSelectedSectionName('');
    } catch (err) {
      console.error('Failed to save prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt to workspace');
    } finally {
      setSaving(false);
    }
  };

  // Place this above the return statement
  const handleAddSection = async () => {
    if (selectedType && newSectionName.trim() && newSectionPrompt.trim()) {
      let errorMsg = '';
      // 1. Immediately add the new section to the UI for instant feedback
      const optimisticSection = { name: newSectionName.trim(), prompt: newSectionPrompt.trim() };
      const updatedTypes = allTypes.map((t) =>
        t.id === selectedType.id
          ? {
              ...t,
              sections: [...t.sections, optimisticSection],
            }
          : t,
      );
      setCustomTypes(updatedTypes.filter((t) => !WORKSPACE_TYPES.some((wt) => wt.id === t.id)));
      setSelectedType(updatedTypes.find((t) => t.id === selectedType.id) || null);
      setNewSectionName('');
      setNewSectionPrompt('');
      setShowAddSectionModal(false);
      try {
        const backendType = getBackendType();
        if (!backendType || !backendType.id) {
          toast.error('Cannot add section: backend type id not found.');
          return;
        }
        const typeId = backendType.id;
        // 2. Create the section
        const response = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/types/${typeId}/sections`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ name: optimisticSection.name }),
          },
        );
        if (!response.ok) {
          errorMsg = await response.text();
          throw new Error(errorMsg || 'Failed to add section');
        }
        const sectionData = await response.json();
        const sectionId = sectionData.id;
        // 3. Create the prompt for the section
        const promptResp = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ prompt: optimisticSection.prompt }),
          },
        );
        if (!promptResp.ok) {
          errorMsg = await promptResp.text();
          throw new Error(errorMsg || 'Failed to add prompt');
        }
        // 4. Fetch the latest sections and prompts from the backend and update the UI
        await loadSectionsForType(backendType);
        toast.success('Section and prompt added!');
      } catch (err) {
        console.error('Failed to add section or prompt:', err, errorMsg);
        toast.error(
          'Failed to add section or prompt: ' +
            (errorMsg || (err instanceof Error ? err.message : '')),
        );
      }
    }
  };

  // Remove the Save Modal JSX (ReactModal for showSaveModal)

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100/50 font-sans">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full p-8 mb-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2 justify-center">
              <FiFileText className="w-7 h-7 text-slate-400" /> Prompt Templates
            </h2>
          </div>
          {/* Workspace Type Tabs */}
          <div className="flex items-center gap-4 mb-8 justify-center flex-wrap">
            {/* Workspace Type Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="workspace-type-select" className="font-medium text-gray-700">
                Workspace Type:
              </label>
              <select
                id="workspace-type-select"
                className="border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-primary focus:border-primary"
                value={selectedType ? selectedType.id : ''}
                onChange={(e) => {
                  const type = allTypes.find((t) => t.id === e.target.value) || null;
                  setSelectedType(type);
                  setSelectedSection(null);
                }}
              >
                <option value="">Select type...</option>
                {allTypes.map((type, idx) => (
                  <option
                    key={
                      (type.id ? String(type.id) : '') +
                      '-' +
                      (type.name ? type.name : '') +
                      '-' +
                      idx
                    }
                    value={type.id}
                  >
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Section Selector for Selected Type */}
          {selectedType && (
            <div className="flex flex-col gap-3 mb-8 justify-center items-center w-full">
              <div className="flex gap-3 flex-wrap items-center">
                {selectedType.sections.map((section, idx) => (
                  <button
                    key={section.name + '-' + idx}
                    className={`px-4 py-2 rounded-lg font-medium border transition-colors text-sm ${
                      selectedSection && selectedSection.name === section.name
                        ? 'bg-primary text-white border-primary shadow'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/30'
                    }`}
                    onClick={() => {
                      setSelectedSection(section);
                      setEditablePrompt(section.prompt);
                    }}
                  >
                    {section.name}
                  </button>
                ))}
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
                  onClick={() => setShowAddSectionModal((prev) => !prev)}
                >
                  + Add Section
                </button>
              </div>
              {/* Inline Add Section Form */}
              {showAddSectionModal && (
                <form
                  className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-4 flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSection();
                  }}
                >
                  <h2 className="text-xl font-bold mb-2">Add Section</h2>
                  <input
                    type="text"
                    className="w-full border rounded p-2 mb-2"
                    placeholder="Section name..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                  />
                  <textarea
                    className="w-full border rounded p-2 mb-2"
                    placeholder="Prompt for this section..."
                    value={newSectionPrompt}
                    onChange={(e) => setNewSectionPrompt(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                      onClick={() => {
                        setShowAddSectionModal(false);
                        setNewSectionName('');
                        setNewSectionPrompt('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
                      disabled={!newSectionName.trim() || !newSectionPrompt.trim()}
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          {/* Prompt for Selected Section */}
          {selectedType && selectedSection ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-md border border-gray-100 p-4 flex flex-col col-span-2">
                <div className="font-medium text-gray-900 mb-2 text-lg">{selectedSection.name}</div>
                <textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-primary mb-4"
                  rows={5}
                  placeholder="Edit the prompt for this section..."
                />
                {/* Workspace selector if not navigated from a workspace */}
                {!location.state?.workspaceId && (
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Workspace</label>
                    <select
                      className="w-full border rounded p-2"
                      value={selectedWorkspaceId}
                      onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    >
                      <option value="">Select workspace...</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm mt-auto"
                  onClick={handleSaveToWorkspace}
                  disabled={saving || (!location.state?.workspaceId && !selectedWorkspaceId)}
                >
                  {saving ? 'Saving...' : 'Save to Workspace'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 text-lg">
              {selectedType
                ? 'Select a section to view its prompt.'
                : 'Select a workspace type to view prompts.'}
            </div>
          )}
        </div>
        {/* Add Workspace Type Modal */}
        {showAddTypeModal && !showAddSectionModal && (
          <ReactModal
            isOpen={showAddTypeModal}
            onRequestClose={() => setShowAddTypeModal(false)}
            contentLabel="Add Workspace Type"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30"
            overlayClassName=""
          >
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Workspace Type</h2>
              <input
                type="text"
                className="w-full border rounded p-2 mb-4"
                placeholder="Workspace type name..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowAddTypeModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
                  onClick={handleAddType}
                  disabled={!newTypeName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </ReactModal>
        )}
        {/* Save Modal remains unchanged */}
        {/* Removed the Save Modal JSX */}
      </div>
    </div>
  );
};

export default PromptTemplatePage;
