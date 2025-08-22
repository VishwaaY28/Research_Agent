import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiPlus, FiSave, FiLayout, FiEdit3, FiArchive, FiCheckCircle, FiAlertCircle, FiChevronDown } from 'react-icons/fi';
import ReactModal from 'react-modal';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [selectedSection, setSelectedSection] = useState<{ id: number; name: string; prompt?: string } | null>(
    null,
  );
  const [editablePrompt, setEditablePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const userInputRef = useRef(null);
  const navigate = useNavigate();
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

    setWorkspaceTypes(prev =>
      prev.map(t => t.id === typeObj.id ? updatedType : t)
    );
    setSelectedType(updatedType);
  };

  // On type selection, fetch sections+prompts from backend
  useEffect(() => {
    if (selectedType && selectedType.id) {
      loadSectionsForType(selectedType);
    }
  }, [selectedType?.id]);

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
    setSaving(true);
    try {
      // 1. Update the prompt template for the section (if it exists)
      // Fetch the prompt templates for this section
      const promptTemplatesResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${selectedSection.id}/prompts`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      let promptTemplates = [];
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
          }
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
          }
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
              order: selectedType.sections.length
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
              is_default: true
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
    <div className="min-h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans">
      <div className="px-4 sm:px-6 lg:px-8 py-12 w-full">
       <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API.BASE_URL()}/api/prompt-templates/seed`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
                            },
                          });
                          if (res.ok) {
                            console.log('Database seeded successfully');
                            // Retry fetching templates
                            window.location.reload();
                          } else {
                            console.error('Failed to seed database');
                          }
                        } catch (error) {
                          console.error('Error seeding database:', error);
                        }
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Seed Database
                    </button>
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 w-full p-8 mb-10 backdrop-blur-sm bg-white/90">
          <div className="flex items-center justify-between mb-10 border-b border-indigo-100 pb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
                <FiFileText className="w-8 h-8 text-indigo-500" /> Prompt Templates
              </h2>
              <p className="text-gray-500 mt-2">Manage and organize your workspace templates</p>
            </div>
            <button
              onClick={() => setShowAddTypeModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium
                hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg
                flex items-center gap-2 text-sm"
            >
              <FiPlus className="w-4 h-4" /> Add Workspace Type
            </button>
          </div>

          {/* Workspace Type Card Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {typesLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-200 rounded-full mb-4"></div>
                  <div className="h-4 bg-indigo-100 rounded w-48"></div>
                </div>
              </div>
            ) : workspaceTypes.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-200">
                <FiAlertCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No workspace types found.</p>
                <p className="text-gray-400 text-sm mt-2">Click "Seed Demo Data" to add default types.</p>
              </div>
            ) : (
              <>
                {workspaceTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm
                      flex items-center gap-3 shadow-sm hover:shadow group
                      ${selectedType && selectedType.id === type.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white transform scale-[1.02]'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'}
                    `}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedSection(null);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                      ${selectedType && selectedType.id === type.id
                        ? 'bg-white/20'
                        : 'bg-indigo-50 group-hover:bg-indigo-100/70'}
                    `}>
                      <FiFileText className={`w-4 h-4 ${
                        selectedType && selectedType.id === type.id ? 'text-white' : 'text-indigo-400'
                      }`} />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-sm truncate w-full">{type.name}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Section Selector for Selected Type */}
          {selectedType && (
            <div className="mb-8 w-full">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700">Sections</h3>
                  <button
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium
                hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg
                flex items-center gap-2 text-sm"
                    onClick={() => setShowAddSectionModal(true)}
                    type="button"
                  >
                    <FiPlus className="w-4 h-4" /> Add Section
                  </button>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                  {sectionsLoading ? (
                    <div className="w-full py-8">
                      <div className="animate-pulse flex gap-3">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="h-10 bg-indigo-100 rounded-xl w-32"></div>
                        ))}
                      </div>
                    </div>
                  ) : (selectedType?.sections?.length ?? 0) === 0 ? (
                    <div className="w-full text-center py-8 bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200">
                      <FiLayout className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                      <p className="text-gray-600">No sections found for this type.</p>
                    </div>
                  ) : (
                    selectedType?.sections?.map((section) => (
                      <button
                        key={section.id}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm
                          flex items-center gap-3 shadow-sm hover:shadow group
                          ${selectedSection && selectedSection.id === section.id
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white transform scale-[1.02]'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                          }`}
                        onClick={() => {
                          setSelectedSection(section);
                          setEditablePrompt(section.prompt || '');
                        }}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                          ${selectedSection && selectedSection.id === section.id
                            ? 'bg-white/20'
                            : 'bg-indigo-50 group-hover:bg-indigo-100/70'
                          }`}>
                          <FiLayout className={`w-4 h-4 ${
                            selectedSection && selectedSection.id === section.id ? 'text-white' : 'text-indigo-400'
                          }`} />
                        </div>
                        {section.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompt for Selected Section */}
          {selectedType && selectedSection ? (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden">
              <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <FiEdit3 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{selectedSection.name}</h3>
                      <p className="text-sm text-gray-500">Edit prompt template</p>
                    </div>
                  </div>
                  {saving && (
                    <div className="flex items-center gap-2 text-indigo-600">
                      <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm font-medium">Saving...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  className="w-full bg-gray-50/50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800
                    placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-6
                    min-h-[200px] resize-y transition-all duration-200"
                  placeholder="Edit the prompt for this section..."
                />

                {/* Workspace selector if not navigated from a workspace */}
                {!location.state?.workspaceId && (
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700">Select Workspace</label>
                    <div className="relative">
                      <select
                        className="w-full bg-gray-50/50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800
                          appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                          transition-all duration-200"
                        value={selectedWorkspaceId}
                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                      >
                        <option value="">Choose a workspace...</option>
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FiChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl
                      font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200
                      shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-2"
                    onClick={handleSaveToWorkspace}
                    disabled={saving || (!location.state?.workspaceId && !selectedWorkspaceId)}
                  >
                    <FiSave className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save to Workspace'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-200">
              <FiFileText className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">
                {selectedType
                  ? 'Select a section to view its prompt template'
                  : 'Select a workspace type to get started'}
              </p>
              <p className="text-gray-400 mt-2">
                {selectedType
                  ? 'Choose a section from above to edit its prompt template'
                  : 'Choose a workspace type to view and edit prompt templates'}
              </p>
            </div>
          )}
        </div>

        {/* Add Workspace Type Modal */}
        {showAddTypeModal && (
          <ReactModal
            isOpen={showAddTypeModal}
            onRequestClose={() => setShowAddTypeModal(false)}
            contentLabel="Add Workspace Type"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-300 scale-100">
              <div className="border-b border-primary-100 px-6 py-4 bg-gradient-to-r from-primary-50/50 to-primary-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FiLayout className="w-5 h-5 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Add Workspace Type</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type Name</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50/50 border border-indigo-100 rounded-xl px-4 py-3
                      text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500
                      focus:border-indigo-500 transition-all duration-200"
                    placeholder="Enter workspace type name..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100
                      transition-all duration-200 font-medium"
                    onClick={() => {
                      setShowAddTypeModal(false);
                      setNewTypeName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                      rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700
                      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-md hover:shadow-lg flex items-center gap-2"
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

        {/* Add Section Modal */}
        {showAddSectionModal && (
          <ReactModal
            isOpen={showAddSectionModal}
            onRequestClose={() => setShowAddSectionModal(false)}
            contentLabel="Add Section"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 scale-100">
              <div className="border-b border-indigo-100 px-6 py-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FiEdit3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Section</h2>
                    <p className="text-sm text-gray-500">to {selectedType?.name}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50/50 border border-indigo-100 rounded-xl px-4 py-3
                        text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500
                        focus:border-indigo-500 transition-all duration-200"
                      placeholder="Enter section name..."
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Template</label>
                    <textarea
                      className="w-full bg-gray-50/50 border border-indigo-100 rounded-xl px-4 py-3
                        text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500
                        focus:border-indigo-500 transition-all duration-200 min-h-[200px] resize-y"
                      placeholder="Enter the prompt template for this section..."
                      value={newSectionPrompt}
                      onChange={(e) => setNewSectionPrompt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100
                      transition-all duration-200 font-medium"
                    onClick={() => {
                      setShowAddSectionModal(false);
                      setNewSectionName('');
                      setNewSectionPrompt('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                      rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700
                      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-md hover:shadow-lg flex items-center gap-2"
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
