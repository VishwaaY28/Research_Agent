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
import { API } from '../../utils/constants';

// Add type for user intent
interface UserIntent {
  id: number;
  name: string;
  is_default: boolean;
  sections: Array<{
    id: number;
    name: string;
    order: number;
    prompt: string;
    schema: any;
    sub_sections?: Array<{
      id: number;
      name: string;
      order: number;
    }>;
  }>;
}

const PromptTemplatePage: React.FC = () => {
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const [typesCollapsed, setTypesCollapsed] = useState(false);
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{
    id: number;
    name: string;
    prompt: string;
    schema: any;
  } | null>(null);
  const [editablePrompt, setEditablePrompt] = useState('');
  const [editableSchema, setEditableSchema] = useState<any>({});
  const [saving, setSaving] = useState(false);
  // Removed unused userInputRef and navigate
  const location = useLocation();
  const [userIntents, setUserIntents] = useState<UserIntent[]>([]);
  const [showAddIntentModal, setShowAddIntentModal] = useState(false);
  const [newIntentName, setNewIntentName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPrompt, setNewSectionPrompt] = useState('');
  const [newSectionSchema, setNewSectionSchema] = useState<any>({});
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [intentsLoading, setIntentsLoading] = useState(false);

  useEffect(() => {
    fetchUserIntents();
  }, []);

  // Fetch user intents from backend
  const fetchUserIntents = async () => {
    setIntentsLoading(true);
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/intents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const intents = await response.json();
        setUserIntents(intents);
      } else {
        console.error('Failed to fetch user intents');
        toast.error('Failed to fetch user intents');
      }
    } catch (error) {
      console.error('Error fetching user intents:', error);
      toast.error('Error fetching user intents');
    } finally {
      setIntentsLoading(false);
    }
  };

  // Helper to fetch all sections and their prompts for a user intent
  const fetchSectionsWithPrompts = async (intentId: number) => {
    setSectionsLoading(true);
    try {
      const sectionsResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/intents/${intentId}/sections`,
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

  const handleAddIntent = async () => {
    if (!newIntentName.trim()) {
      toast.error('User intent name is required.');
      return;
    }

    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newIntentName.trim(),
          is_default: false,
        }),
      });

      if (response.ok) {
        const newIntent = await response.json();
        setUserIntents([...userIntents, newIntent]);
        toast.success('User intent added!');
        setNewIntentName('');
        setShowAddIntentModal(false);
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to add user intent');
      }
    } catch (error) {
      console.error('Error adding user intent:', error);
      toast.error('Failed to add user intent');
    }
  };

  // Fetch and set sections+prompts for the selected intent
  const loadSectionsForIntent = async (intentObj: UserIntent) => {
    if (!intentObj || !intentObj.id) return;

    const sectionsWithPrompts = await fetchSectionsWithPrompts(intentObj.id);
    const updatedIntent = {
      ...intentObj,
      sections: sectionsWithPrompts,
    };

    setUserIntents((prev) => prev.map((i) => (i.id === intentObj.id ? updatedIntent : i)));
    setSelectedIntent(updatedIntent);
  };

  // On intent selection, fetch sections+prompts from backend
  useEffect(() => {
    if (selectedIntent && selectedIntent.id) {
      loadSectionsForIntent(selectedIntent);
    }
  }, [selectedIntent?.id]);

  // Pre-select intent from navigation state
  useEffect(() => {
    if (location.state?.type && userIntents.length > 0) {
      const intentObj = userIntents.find((i) => i.name === location.state.type);
      if (intentObj) setSelectedIntent(intentObj);
    }
  }, [location.state, userIntents]);

  useEffect(() => {
    setEditablePrompt(selectedSection ? selectedSection.prompt || '' : '');
    setEditableSchema(selectedSection ? selectedSection.schema || {} : {});
  }, [selectedSection]);

  // Save research section template directly to database
  const handleSaveToDatabase = async () => {
    if (!selectedIntent || !selectedSection) {
      toast.error('Please select an intent and section');
      return;
    }
    
    // Validate JSON schema
    let parsedSchema = editableSchema;
    if (typeof editableSchema === 'string') {
      try {
        parsedSchema = JSON.parse(editableSchema);
      } catch (err) {
        toast.error('Invalid JSON schema format. Please check your schema syntax.');
        return;
      }
    }
    
    setSaving(true);
    try {
      // Update the research section template
      const updateResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/sections/${selectedSection.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            name: selectedSection.name,
            order: 0, // Default order for research sections
            prompt: editablePrompt,
            schema: parsedSchema,
          }),
        },
      );
      if (!updateResp.ok) {
        const error = await updateResp.text();
        toast.error(error || 'Failed to update research section template');
        setSaving(false);
        return;
      }

      toast.success('Research section template updated successfully');
      // Refresh section prompts
      await loadSectionsForIntent(selectedIntent);
      // Reset section, prompt, and schema for new entry
      setSelectedSection(null);
      setEditablePrompt('');
      setEditableSchema({});
    } catch (err) {
      console.error('Failed to save research section template:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save research section template');
    } finally {
      setSaving(false);
    }
  };

  // Place this above the return statement
  const handleAddSection = async () => {
    if (selectedIntent && newSectionName.trim() && newSectionPrompt.trim()) {
      try {
        // Parse schema if it's a string
        let parsedSchema = newSectionSchema;
        if (typeof newSectionSchema === 'string') {
          try {
            parsedSchema = JSON.parse(newSectionSchema);
          } catch (err) {
            toast.error('Invalid JSON schema format');
            return;
          }
        }

        // 1. Create the research section template
        const response = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/intents/${selectedIntent.id}/sections`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              name: newSectionName.trim(),
              order: selectedIntent.sections.length,
              prompt: newSectionPrompt.trim(),
              schema: parsedSchema,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          toast.error(error || 'Failed to add research section');
          return;
        }

        // 2. Refresh the sections for this intent
        await loadSectionsForIntent(selectedIntent);

        setNewSectionName('');
        setNewSectionPrompt('');
        setNewSectionSchema({});
        setShowAddSectionModal(false);
        toast.success('Research section added!');
      } catch (err) {
        console.error('Failed to add research section:', err);
        toast.error('Failed to add research section');
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
        await fetchUserIntents();
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
            {/* User Intent Heading */}
            <div className="flex items-center justify-between mb-1 mt-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                User Intent
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTypesCollapsed((c) => !c)}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500"
                  title={typesCollapsed ? 'Expand Intents' : 'Collapse Intents'}
                >
                  {typesCollapsed ? (
                    <FiChevronDown className="w-4 h-4" />
                  ) : (
                    <FiChevronUp className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowAddIntentModal(true)}
                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-600"
                  title="Add User Intent"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!typesCollapsed && (
              <div className="flex flex-col gap-1">
                {intentsLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading intents...</div>
                ) : userIntents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No user intents found.
                    <br />
                    <button
                      onClick={handleSeedData}
                      className="mt-2 text-xs text-indigo-600 underline hover:text-indigo-800"
                    >
                      Seed Demo Data
                    </button>
                  </div>
                ) : (
                  userIntents.map((intent) => (
                    <button
                      key={intent.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-sm font-medium
                        ${
                          selectedIntent && selectedIntent.id === intent.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-indigo-50 text-gray-700'
                        }
                      `}
                      onClick={() => {
                        setSelectedIntent(intent);
                        setSelectedSection(null);
                        setSectionsCollapsed(false);
                      }}
                    >
                      <FiFileText className="w-4 h-4" />
                      <span className="truncate">{intent.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {/* Sections for selected intent */}
            {selectedIntent && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Research Sections</h3>
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
                      title="Add Research Section"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!sectionsCollapsed && (
                  <div className="flex flex-col gap-1">
                    {sectionsLoading ? (
                      <div className="text-center py-4 text-gray-400">Loading sections...</div>
                    ) : (selectedIntent?.sections?.length ?? 0) === 0 ? (
                      <div className="text-center py-4 text-gray-400">No research sections found.</div>
                    ) : (
                      selectedIntent.sections.map((section) => (
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
          {selectedIntent && selectedSection ? (
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
              {/* Editable Schema */}
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Schema Structure (JSON)
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-indigo-100 rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] resize-y font-mono text-sm"
                  placeholder='{"group": "example", "relevant": true, "topic": ""}'
                  value={typeof editableSchema === 'string' ? editableSchema : JSON.stringify(editableSchema, null, 2)}
                  onChange={(e) => {
                    setEditableSchema(e.target.value);
                  }}
                />
                <div className="mt-1 text-xs text-gray-500">
                  Enter valid JSON format for the schema structure
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors text-sm"
                  onClick={() => {
                    setEditablePrompt(selectedSection?.prompt || '');
                    setEditableSchema(selectedSection?.schema || {});
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm"
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save to Database'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-gray-400">
              <FiFileText className="w-16 h-16 text-indigo-200 mb-4" />
              <div className="text-lg font-medium">
                {selectedIntent
                  ? 'Select a research section to view its prompt template'
                  : 'Select a user intent to get started'}
              </div>
              <div className="text-gray-400 mt-2 text-sm">
                {selectedIntent
                  ? 'Choose a research section from the left to edit its prompt template'
                  : 'Choose a user intent to view and edit research section templates'}
              </div>
            </div>
          )}
        </div>
        {/* Modals */}
        {showAddIntentModal && (
          <ReactModal
            isOpen={showAddIntentModal}
            onRequestClose={() => setShowAddIntentModal(false)}
            contentLabel="Add User Intent"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="border-b border-gray-100 px-6 py-3 bg-gray-50 flex items-center gap-3">
                <FiLayout className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Add User Intent</h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Intent Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter user intent name..."
                  value={newIntentName}
                  onChange={(e) => setNewIntentName(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 font-medium"
                    onClick={() => {
                      setShowAddIntentModal(false);
                      setNewIntentName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleAddIntent}
                    disabled={!newIntentName.trim()}
                  >
                    <FiPlus className="w-4 h-4" /> Add Intent
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
            contentLabel="Add Research Section"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="border-b border-gray-100 px-6 py-3 bg-gray-50 flex items-center gap-3">
                <FiEdit3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Add New Research Section</h2>
                <span className="text-xs text-gray-400 ml-2">to {selectedIntent?.name}</span>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter research section name..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Prompt Template
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-y"
                  placeholder="Enter the prompt template for this research section..."
                  value={newSectionPrompt}
                  onChange={(e) => setNewSectionPrompt(e.target.value)}
                />
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Schema (JSON)
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-indigo-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] resize-y font-mono text-sm"
                  placeholder='{"group": "example", "relevant": true, "topic": ""}'
                  value={typeof newSectionSchema === 'string' ? newSectionSchema : JSON.stringify(newSectionSchema, null, 2)}
                  onChange={(e) => {
                    setNewSectionSchema(e.target.value);
                  }}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 font-medium"
                    onClick={() => {
                      setShowAddSectionModal(false);
                      setNewSectionName('');
                      setNewSectionPrompt('');
                      setNewSectionSchema({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleAddSection}
                    disabled={!newSectionName.trim() || !newSectionPrompt.trim()}
                  >
                    <FiPlus className="w-4 h-4" /> Add Research Section
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
