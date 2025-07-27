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
      const title = `${selectedType.name} - ${selectedSection.name}`;
      await savePromptToWorkspace(workspace.id, title, editablePrompt, []);
      toast.success('Prompt added to workspace');
      await fetchWorkspaces();
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
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100/50 font-sans">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full p-8 mb-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2 justify-center">
              <FiFileText className="w-7 h-7 text-slate-400" /> Prompt Templates
            </h2>
            <button
              onClick={handleSeedData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
            >
              Seed Demo Data
            </button>
          </div>

          {/* Workspace Type Card Selector */}
          <div className="flex items-center gap-4 mb-8 justify-center flex-wrap overflow-x-auto pb-2">
            {typesLoading ? (
              <div className="text-center text-gray-500">Loading workspace types...</div>
            ) : workspaceTypes.length === 0 ? (
              <div className="text-center text-gray-500">
                No workspace types found. Click "Seed Demo Data" to add default types.
              </div>
            ) : (
              workspaceTypes.map((type, idx) => (
                <button
                  key={type.id}
                  className={`flex flex-col items-center justify-center px-5 py-3 rounded-xl border shadow-sm transition-all min-w-[140px] max-w-[180px] mx-1 my-1 focus:outline-none focus:ring-2 focus:ring-primary/50
                    ${selectedType && selectedType.id === type.id
                      ? 'bg-primary text-white border-primary scale-105 shadow-lg'
                      : 'bg-white text-slate-800 border-gray-200 hover:bg-primary/10 hover:border-primary/30'}
                  `}
                  onClick={() => {
                    setSelectedType(type);
                    setSelectedSection(null);
                  }}
                >
                  <FiFileText className={`w-7 h-7 mb-2 ${selectedType && selectedType.id === type.id ? 'text-white' : 'text-slate-400'}`} />
                  <span className="font-semibold text-base truncate w-full text-center">{type.name}</span>
                </button>
              ))
            )}
            <button
              className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border-2 border-dashed border-primary text-primary bg-white hover:bg-primary/10 transition-all min-w-[140px] max-w-[180px] mx-1 my-1 focus:outline-none"
              onClick={() => setShowAddTypeModal(true)}
              type="button"
            >
              <span className="text-2xl font-bold mb-1">+</span>
              <span className="font-semibold text-base">Add Workspace Type</span>
            </button>
          </div>

          {/* Section Selector for Selected Type */}
          {selectedType && (
            <div className="flex flex-col gap-3 mb-8 justify-center items-center w-full">
              <div className="flex gap-2 flex-wrap items-center justify-center">
                {sectionsLoading ? (
                  <div className="text-center text-gray-500">Loading sections...</div>
                ) : (selectedType?.sections?.length ?? 0) === 0 ? (
                  <div className="text-center text-gray-500">No sections found for this type.</div>
                ) : (
                  selectedType?.sections?.map((section, idx) => (
                    <button
                      key={section.id}
                      className={`px-4 py-1 rounded-full font-medium border transition-colors text-sm whitespace-nowrap
                        ${selectedSection && selectedSection.id === section.id
                          ? 'bg-primary text-white border-primary shadow'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/30'}
                      `}
                      onClick={() => {
                        setSelectedSection(section);
                        setEditablePrompt(section.prompt || '');
                      }}
                    >
                      {section.name}
                    </button>
                  ))
                )}
                <button
                  className="px-4 py-1 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors text-sm ml-2"
                  onClick={() => setShowAddSectionModal((prev) => !prev)}
                  type="button"
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
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeName('');
                  }}
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
      </div>
    </div>
  );
};

export default PromptTemplatePage;
