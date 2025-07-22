import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiSave } from 'react-icons/fi';
import ReactModal from 'react-modal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContent } from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';

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

const PromptTemplatePage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [selectedSection, setSelectedSection] = useState<{ name: string; prompt: string } | null>(
    null,
  );
  const [userPrompt, setUserPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const userInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { savePromptToWorkspace } = useContent();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalWorkspaceType, setModalWorkspaceType] = useState<string>('');
  const [modalWorkspaceId, setModalWorkspaceId] = useState<string>('');
  const [workspaceTypes, setWorkspaceTypes] = useState<string[]>([]);
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>([]);

  const {
    workspaces,
    loading: workspacesLoading,
    fetchWorkspaces,
    createWorkspace,
    fetchWorkspaceTypes,
  } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
    fetchWorkspaceTypes().then(setWorkspaceTypes);
  }, []);

  // Pre-select workspace and type from navigation state
  useEffect(() => {
    if (location.state?.workspaceId) {
      setModalWorkspaceId(String(location.state.workspaceId));
    }
    if (location.state?.type && workspaces.length > 0) {
      const typeObj = WORKSPACE_TYPES.find((t) => t.name === location.state.type);
      if (typeObj) setSelectedType(typeObj);
    }
  }, [location.state, workspaces]);

  useEffect(() => {
    if (modalWorkspaceType) {
      setFilteredWorkspaces(workspaces.filter((w) => w.workspaceType === modalWorkspaceType));
    } else {
      setFilteredWorkspaces([]);
    }
  }, [modalWorkspaceType, workspaces]);

  useEffect(() => {
    setUserPrompt('');
  }, [selectedSection]);

  const handleSaveToWorkspace = async () => {
    setModalWorkspaceId(''); // Reset selection when opening modal
    setShowSaveModal(true);
  };

  const handleModalSave = async () => {
    console.log('Modal save clicked', { selectedType, modalWorkspaceId, selectedSection });
    if (!selectedType || !selectedType.name || !modalWorkspaceId) {
      console.log('Early return: missing type or workspace', { selectedType, modalWorkspaceId });
      toast.error('Please select a type and workspace');
      return;
    }
    if (!selectedSection || !selectedSection.name) {
      console.log('Early return: missing section', { selectedSection });
      toast.error('Please select a section first');
      return;
    }
    setSaving(true);
    try {
      const workspace = workspaces.find((w) => String(w.id) === String(modalWorkspaceId));
      if (!workspace) {
        toast.error('Workspace not found');
        setSaving(false);
        return;
      }
      const combinedPrompt = selectedSection.prompt + (userPrompt ? ' ' + userPrompt : '');
      const title = `${selectedType.name} - ${selectedSection.name}`;
      console.log('About to call savePromptToWorkspace', { workspace, title, combinedPrompt });
      await savePromptToWorkspace(workspace.id, title, combinedPrompt, []);
      toast.success('Prompt saved to workspace successfully!');
      setUserPrompt('');
      await fetchWorkspaces();
      // After save, navigate to authoring for this workspace and section
      navigate('/dashboard/proposal-authoring', {
        state: { workspaceId: workspace.id, sectionName: selectedSection.name },
      });
    } catch (err) {
      console.error('Failed to save prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt to workspace');
    } finally {
      setShowSaveModal(false);
      setModalWorkspaceId('');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100/90 to-gray-100/80 font-sans">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-xl p-8 mt-10 mb-10">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6 flex items-center gap-2 justify-center">
          <FiFileText className="w-7 h-7 text-slate-400" /> Prompt Templates
        </h2>
        {/* Workspace Type Selector */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-slate-700 mb-2">Workspace Type</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-primary focus:border-primary"
            value={selectedType ? selectedType.name : ''}
            onChange={(e) => {
              const typeObj = WORKSPACE_TYPES.find((t) => t.name === e.target.value);
              setSelectedType(typeObj || null);
              setSelectedSection(null);
            }}
          >
            <option value="">Select workspace type</option>
            {WORKSPACE_TYPES.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        {/* Section Selector */}
        {selectedType && (
          <div className="mb-6">
            <label className="block text-lg font-semibold text-slate-700 mb-2">Section</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-primary focus:border-primary"
              value={selectedSection ? selectedSection.name : ''}
              onChange={(e) => {
                const sectionObj = selectedType.sections.find((s) => s.name === e.target.value);
                setSelectedSection(sectionObj || null);
              }}
            >
              <option value="">Select section</option>
              {selectedType.sections.map((section) => (
                <option key={section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Prompt Input */}
        {selectedSection && (
          <div className="mb-6">
            <label className="block text-lg font-semibold text-slate-700 mb-2">Prompt</label>
            <div className="bg-gray-50 rounded-md p-3 text-gray-800 whitespace-pre-line select-none cursor-not-allowed border border-gray-200 text-sm mb-2">
              {selectedSection.prompt}
            </div>
            <input
              ref={userInputRef}
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-gray-400"
              placeholder="Add your own prompt or instructions..."
            />
          </div>
        )}
        {/* Save Button - always visible, only enabled if type and section are selected */}
        <button
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSaveToWorkspace}
          disabled={saving || !selectedType || !selectedSection}
        >
          <FiSave className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save to Workspace'}
        </button>
      </div>
      {/* Save Modal remains unchanged */}
      <ReactModal
        isOpen={showSaveModal}
        onRequestClose={() => setShowSaveModal(false)}
        contentLabel="Select Workspace"
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30"
        overlayClassName=""
      >
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Select Workspace</h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Workspace</label>
            <select
              className="w-full border rounded p-2"
              value={modalWorkspaceId}
              onChange={(e) => setModalWorkspaceId(e.target.value)}
            >
              <option value="">Select workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={() => setShowSaveModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
              onClick={handleModalSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </ReactModal>
    </div>
  );
};

export default PromptTemplatePage;
