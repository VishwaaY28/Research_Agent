import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit3,
  FiFileText,
  FiLayout,
  FiPlus,
  FiSave,
} from 'react-icons/fi';
import ReactModal from 'react-modal';
import { useLocation } from 'react-router-dom';
import { useContent } from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';

// Add type for workspace type
interface WorkspaceType {
  id: number;
  name: string;
  is_default: boolean;
  sections: Array<{
    id: number;
    name: string;
    order: number;
    prompt?: string;
  }>;
}

const PromptTemplatePage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [typesCollapsed, setTypesCollapsed] = useState(false);
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{
    id: number;
    name: string;
    prompt?: string;
  } | null>(null);
  const [editablePrompt, setEditablePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  // Removed unused userInputRef and navigate
  const location = useLocation();
  const { savePromptToWorkspace } = useContent();
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceType[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPrompt, setNewSectionPrompt] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [typesLoading, setTypesLoading] = useState(false);
  const { workspaces, fetchWorkspaces } = useWorkspace();
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<typeof workspaces>([]);

  useEffect(() => {
    fetchWorkspaces();
    fetchWorkspaceTypes();
  }, []);

  // Fetch workspace types from backend
  const fetchWorkspaceTypes = async () => {
    setTypesLoading(true);
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const types = await response.json();
        setWorkspaceTypes(types);
      } else {
        console.error('Failed to fetch workspace types');
        toast.error('Failed to fetch workspace types');
      }
    } catch (error) {
      console.error('Error fetching workspace types:', error);
      toast.error('Error fetching workspace types');
    } finally {
      setTypesLoading(false);
    }
  };

  // Helper to fetch all sections and their prompts for a workspace type
  const fetchSectionsWithPrompts = async (typeId: number) => {
    setSectionsLoading(true);
    try {
      const sectionsResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/types/${typeId}/sections`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      if (!sectionsResp.ok) {
        throw new Error('Failed to fetch sections');
      }
      const sections = await sectionsResp.json();
      return sections;
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to fetch sections');
      return [];
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Workspace type name is required.');
      return;
    }

    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          is_default: false,
        }),
      });

      if (response.ok) {
        const newType = await response.json();
        setWorkspaceTypes([...workspaceTypes, newType]);
        toast.success('Workspace type added!');
        setNewTypeName('');
        setShowAddTypeModal(false);
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to add workspace type');
      }
    } catch (error) {
      console.error('Error adding workspace type:', error);
      toast.error('Failed to add workspace type');
    }
  };

  // Fetch and set sections+prompts for the selected type
  const loadSectionsForType = async (typeObj: WorkspaceType) => {
    if (!typeObj || !typeObj.id) return;

    const sectionsWithPrompts = await fetchSectionsWithPrompts(typeObj.id);
    const updatedType = {
      ...typeObj,
      sections: sectionsWithPrompts,
    };

    setWorkspaceTypes((prev) => prev.map((t) => (t.id === typeObj.id ? updatedType : t)));
    setSelectedType(updatedType);
  };

  // On type selection, fetch sections+prompts from backend
  useEffect(() => {
    if (selectedType && selectedType.id) {
      loadSectionsForType(selectedType);

      // Filter workspaces by the selected workspace type
      const filtered = workspaces.filter(
        (workspace) => workspace.workspace_type === selectedType.name,
      );
      setFilteredWorkspaces(filtered);
    }
  }, [selectedType?.id, workspaces]);

  // Pre-select workspace and type from navigation state
  useEffect(() => {
    if (location.state?.workspaceId) {
      setSelectedWorkspaceId(String(location.state.workspaceId));
    }
    if (location.state?.type && workspaceTypes.length > 0) {
      const typeObj = workspaceTypes.find((t) => t.name === location.state.type);
      if (typeObj) setSelectedType(typeObj);
    }
  }, [location.state, workspaceTypes]);

  useEffect(() => {
    setEditablePrompt(selectedSection ? selectedSection.prompt || '' : '');
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

    // Check if the selected workspace matches the selected type
    if (workspace.workspace_type !== selectedType.name) {
      toast.error(`The selected workspace must be of type "${selectedType.name}"`);
      return;
    }
    setSaving(true);
    try {
      // 1. Update the prompt template for the section (if it exists)
      // Fetch the prompt templates for this section
      const promptTemplatesResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${selectedSection.id}/prompts`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      let promptTemplates: any[] = [];
      if (promptTemplatesResp.ok) {
        promptTemplates = await promptTemplatesResp.json();
      }
      // Find the default prompt template (or first one)
      const templateToUpdate = promptTemplates.find((p) => p.is_default) || promptTemplates[0];
      if (templateToUpdate) {
        // Update the prompt template
        const updateResp = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/prompts/${templateToUpdate.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt: editablePrompt,
              is_default: true,
            }),
          },
        );
        if (!updateResp.ok) {
          const error = await updateResp.text();
          toast.error(error || 'Failed to update prompt template');
          setSaving(false);
          return;
        }
      } else {
        // If no template exists, create one
        const createResp = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/sections/${selectedSection.id}/prompts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt: editablePrompt,
              is_default: true,
            }),
          },
        );
        if (!createResp.ok) {
          const error = await createResp.text();
          toast.error(error || 'Failed to create prompt template');
          setSaving(false);
          return;
        }
      }

      // 2. Save the prompt to the workspace as before
      const title = `${selectedType.name} - ${selectedSection.name}`;
      await savePromptToWorkspace(workspace.id, title, editablePrompt, []);
      toast.success('Prompt template updated and added to workspace');
      await fetchWorkspaces();
      // Refresh section prompts
      await loadSectionsForType(selectedType);
      // Reset section and prompt for new entry
      setSelectedSection(null);
      setEditablePrompt('');
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
      try {
        // 1. Create the section
        const response = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/types/${selectedType.id}/sections`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              name: newSectionName.trim(),
              order: selectedType.sections.length,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          toast.error(error || 'Failed to add section');
          return;
        }

        const sectionData = await response.json();
        const sectionId = sectionData.id;

        // 2. Create the prompt for the section
        const promptResp = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt: newSectionPrompt.trim(),
              is_default: true,
            }),
          },
        );

        if (!promptResp.ok) {
          const error = await promptResp.text();
          toast.error(error || 'Failed to add prompt');
          return;
        }

        // 3. Refresh the sections for this type
        await loadSectionsForType(selectedType);

        setNewSectionName('');
        setNewSectionPrompt('');
        setShowAddSectionModal(false);
        toast.success('Section and prompt added!');
      } catch (err) {
        console.error('Failed to add section or prompt:', err);
        toast.error('Failed to add section or prompt');
      }
    } else {
      toast.error('Section name and prompt are required.');
    }
  };

  // Seed default data
  const handleSeedData = async () => {
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/seed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        await fetchWorkspaceTypes();
      } else {
        toast.error('Failed to seed data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
    }
  };

  return (
    <div className="min-h-full bg-white font-sans">
      <div className="flex flex-col md:flex-row h-full w-full px-2 md:px-8 py-8 gap-6">
        {/* Left Panel: Types & Sections */}
        <div className="w-full md:w-1/3 max-w-xs border-r border-gray-100 pr-0 md:pr-6 flex flex-col gap-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-black-700 flex items-center gap-2">
              <FiFileText className="w-5 h-5 text-indigo-600" />
              Prompt Templates
            </h2>
            {/* <div className="flex items-center gap-1">
              <button
                onClick={() => setTypesCollapsed((c) => !c)}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500"
                title={typesCollapsed ? 'Expand Types' : 'Collapse Types'}
              >
                <span
                  className={`transition-transform ${typesCollapsed ? 'rotate-180' : ''}`}
                ></span>
              </button>
            </div> */}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Workspace Type Heading */}
            <div className="flex items-center justify-between mb-1 mt-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Workspace Type
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTypesCollapsed((c) => !c)}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500"
                  title={typesCollapsed ? 'Expand Types' : 'Collapse Types'}
                >
                  {typesCollapsed ? (
                    <FiChevronDown className="w-4 h-4" />
                  ) : (
                    <FiChevronUp className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowAddTypeModal(true)}
                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-600"
                  title="Add Workspace Type"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!typesCollapsed && (
              <div className="flex flex-col gap-1">
                {typesLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading types...</div>
                ) : workspaceTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No workspace types found.
                    <br />
                    <button
                      onClick={handleSeedData}
                      className="mt-2 text-xs text-indigo-600 underline hover:text-indigo-800"
                    >
                      Seed Demo Data
                    </button>
                  </div>
                ) : (
                  workspaceTypes.map((type) => (
                    <button
                      key={type.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-sm font-medium
                        ${
                          selectedType && selectedType.id === type.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-indigo-50 text-gray-700'
                        }
                      `}
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedSection(null);
                        setSectionsCollapsed(false);
                      }}
                    >
                      <FiFileText className="w-4 h-4" />
                      <span className="truncate">{type.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {/* Sections for selected type */}
            {selectedType && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Sections</h3>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500"
                      onClick={() => setSectionsCollapsed((c) => !c)}
                      title={sectionsCollapsed ? 'Expand Sections' : 'Collapse Sections'}
                    >
                      {sectionsCollapsed ? (
                        <FiChevronDown className="w-4 h-4" />
                      ) : (
                        <FiChevronUp className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-600"
                      onClick={() => setShowAddSectionModal(true)}
                      title="Add Section"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!sectionsCollapsed && (
                  <div className="flex flex-col gap-1">
                    {sectionsLoading ? (
                      <div className="text-center py-4 text-gray-400">Loading sections...</div>
                    ) : (selectedType?.sections?.length ?? 0) === 0 ? (
                      <div className="text-center py-4 text-gray-400">No sections found.</div>
                    ) : (
                      selectedType.sections.map((section) => (
                        <button
                          key={section.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-sm font-medium
                            ${
                              selectedSection && selectedSection.id === section.id
                                ? 'bg-indigo-500 text-white'
                                : 'hover:bg-indigo-50 text-gray-700'
                            }
                          `}
                          onClick={() => {
                            setSelectedSection(section);
                            setEditablePrompt(section.prompt || '');
                          }}
                        >
                          <FiLayout className="w-4 h-4" />
                          <span className="truncate">{section.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right Panel: Prompt Editor */}
        <div className="flex-1 flex flex-col items-stretch min-w-0">
          {selectedType && selectedSection ? (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center">
                  <FiEdit3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-0.5">
                    {selectedSection.name}
                  </h3>
                  <p className="text-xs text-gray-500">Edit prompt template</p>
                </div>
                {saving && (
                  <div className="flex items-center gap-2 text-indigo-600 ml-4">
                    <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium">Saving...</span>
                  </div>
                )}
              </div>
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full bg-gray-50 border border-indigo-100 rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] resize-y transition-all duration-150"
                placeholder="Edit the prompt for this section..."
              />
              {/* Workspace selector if not navigated from a workspace */}
              {!location.state?.workspaceId && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Select Workspace ({selectedType?.name} type only)
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-gray-800 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={selectedWorkspaceId}
                      onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    >
                      <option value="">Choose a workspace...</option>
                      {filteredWorkspaces.length > 0 ? (
                        filteredWorkspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No workspaces available for this type
                        </option>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FiChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors text-sm"
                  onClick={() => setEditablePrompt(selectedSection.prompt || '')}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm"
                  onClick={handleSaveToWorkspace}
                  disabled={saving || (!location.state?.workspaceId && !selectedWorkspaceId)}
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save to Workspace'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-gray-400">
              <FiFileText className="w-16 h-16 text-indigo-200 mb-4" />
              <div className="text-lg font-medium">
                {selectedType
                  ? 'Select a section to view its prompt template'
                  : 'Select a workspace type to get started'}
              </div>
              <div className="text-gray-400 mt-2 text-sm">
                {selectedType
                  ? 'Choose a section from the left to edit its prompt template'
                  : 'Choose a workspace type to view and edit prompt templates'}
              </div>
            </div>
          )}
        </div>
        {/* Modals */}
        {showAddTypeModal && (
          <ReactModal
            isOpen={showAddTypeModal}
            onRequestClose={() => setShowAddTypeModal(false)}
            contentLabel="Add Workspace Type"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="border-b border-gray-100 px-6 py-3 bg-gray-50 flex items-center gap-3">
                <FiLayout className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Add Workspace Type</h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter workspace type name..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 font-medium"
                    onClick={() => {
                      setShowAddTypeModal(false);
                      setNewTypeName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleAddType}
                    disabled={!newTypeName.trim()}
                  >
                    <FiPlus className="w-4 h-4" /> Add Type
                  </button>
                </div>
              </div>
            </div>
          </ReactModal>
        )}
        {showAddSectionModal && (
          <ReactModal
            isOpen={showAddSectionModal}
            onRequestClose={() => setShowAddSectionModal(false)}
            contentLabel="Add Section"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="border-b border-gray-100 px-6 py-3 bg-gray-50 flex items-center gap-3">
                <FiEdit3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Add New Section</h2>
                <span className="text-xs text-gray-400 ml-2">to {selectedType?.name}</span>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter section name..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Prompt Template
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-y"
                  placeholder="Enter the prompt template for this section..."
                  value={newSectionPrompt}
                  onChange={(e) => setNewSectionPrompt(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 font-medium"
                    onClick={() => {
                      setShowAddSectionModal(false);
                      setNewSectionName('');
                      setNewSectionPrompt('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleAddSection}
                    disabled={!newSectionName.trim() || !newSectionPrompt.trim()}
                  >
                    <FiPlus className="w-4 h-4" /> Add Section
                  </button>
                </div>
              </div>
            </div>
          </ReactModal>
        )}
      </div>
    </div>
  );
};

export default PromptTemplatePage;
