import { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFileText, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { API } from '../../utils/constants';

interface WorkspaceType {
  id: number;
  name: string;
  is_default: boolean;
  sections?: Array<{
    id: number;
    name: string;
    order: number;
    prompt?: string;
  }>;
}

interface Section {
  id: number;
  name: string;
  order: number;
  prompt?: string;
}

const PromptTemplatePanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceType[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch workspace types from backend
  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceTypes();
    }
  }, [isOpen]);

  const fetchWorkspaceTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
        headers: {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
      });
      if (response.ok) {
        const types = await response.json();
        setWorkspaceTypes(types);
      } else {
        console.error('Failed to fetch workspace types');
      }
    } catch (error) {
      console.error('Error fetching workspace types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForType = async (typeId: number) => {
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types/${typeId}/sections`, {
        headers: {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
      });
      if (response.ok) {
        const sections = await response.json();
        return sections;
      } else {
        console.error('Failed to fetch sections');
        return [];
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  };

  const handleTypeSelect = async (type: WorkspaceType) => {
    setSelectedType(type);
    setSelectedSection(null);
    
    // Fetch sections for this type
    const sections = await fetchSectionsForType(type.id);
    setSelectedType({ ...type, sections });
  };

  if (!isOpen) return null;

  // Panel widths
  const leftPanelWidth = selectedType ? (selectedSection ? 'w-1/4' : 'w-1/3') : 'w-full';
  const midPanelWidth = selectedType ? (selectedSection ? 'w-1/3' : 'w-2/3') : 'w-0';
  const rightPanelWidth = selectedSection ? 'w-2/3' : 'w-0';

  return (
    <div className="fixed top-0 right-0 z-50 h-full w-[480px] max-w-full bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300">
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-2xl font-extrabold text-slate-700 tracking-tight flex items-center gap-2">
          <FiFileText className="w-7 h-7 text-slate-400" /> Prompt Templates
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100"
        >
          <FiX className="w-6 h-6" />
        </button>
      </div>
      <div className="flex flex-1 h-full bg-gradient-to-br from-white to-slate-100 relative">
        {/* Panel 1: Types */}
        <div
          className={`transition-all duration-300 h-full ${leftPanelWidth} border-r border-gray-200 bg-gradient-to-br from-slate-100 to-gray-100/80 flex flex-col items-center justify-center z-10`}
        >
          <div className="w-full h-full flex flex-col items-center justify-center px-6 py-8">
            <h3 className="text-xl font-semibold mb-6 text-slate-700">Workspace Types</h3>
            <ul className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar w-full max-w-xs">
              {loading ? (
                <li className="text-center text-slate-500">Loading...</li>
              ) : (
                workspaceTypes.map((type: WorkspaceType) => (
                  <li key={type.name}>
                    <button
                      className={`w-full flex items-center justify-between p-3 rounded-2xl shadow-md border transition-all group ${selectedType && selectedType.name === type.name ? 'bg-slate-200 border-slate-400' : 'bg-white hover:bg-slate-100 border-gray-200'}`}
                      onClick={() => handleTypeSelect(type)}
                    >
                      <span
                        className={`font-semibold text-base ${selectedType && selectedType.name === type.name ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}
                      >
                        {type.name}
                      </span>
                      <FiChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* Panel 2: Sections (only show if a type is selected) */}
        {selectedType && (
          <div
            className={`transition-all duration-300 h-full ${midPanelWidth} border-r border-gray-200 bg-gradient-to-br from-slate-100 to-gray-100/80 flex flex-col z-20`}
          >
            <div className="w-full h-full flex flex-col px-6 py-8">
              {/* Back to Types button */}
              <button
                className="mb-4 flex items-center text-slate-700 font-semibold hover:underline"
                onClick={() => {
                  setSelectedType(null);
                  setSelectedSection(null);
                }}
                type="button"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" /> Back to Types
              </button>
              <h3 className="text-xl font-semibold mb-4 text-slate-700">Sections</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <ul className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                  {selectedType.sections?.map((section: Section) => (
                    <li key={section.name}>
                      <button
                        className={`w-full flex items-center justify-between p-4 rounded-xl shadow-sm border transition-all group ${selectedSection && selectedSection.name === section.name ? 'bg-slate-200 border-slate-400' : 'bg-white hover:bg-slate-100 border-gray-200'}`}
                        onClick={() => setSelectedSection(section)}
                      >
                        <span
                          className={`font-medium transition-colors ${selectedSection && selectedSection.name === section.name ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}
                        >
                          {section.name}
                        </span>
                        <FiChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    </li>
                  )) || <li className="text-center text-slate-500">No sections available</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* Panel 3: Prompts */}
        {selectedSection && (
          <div
            className={`transition-all duration-300 h-full ${rightPanelWidth} bg-white flex flex-col z-30`}
          >
            <div className="w-full h-full flex flex-col px-6 py-8">
              {/* Back to Sections button */}
              <button
                className="mb-4 flex items-center text-slate-700 font-semibold hover:underline"
                onClick={() => setSelectedSection(null)}
                type="button"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" /> Back to Sections
              </button>
              <h3 className="text-xl font-semibold mb-4 text-slate-700">
                Prompt for {selectedSection?.name}
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 text-slate-800 shadow-inner border border-gray-200 text-lg leading-relaxed font-medium">
                  {selectedSection.prompt}
                </div>
                <button
                  className="mt-8 w-full py-3 rounded-xl bg-slate-700 text-white font-semibold text-lg shadow hover:bg-slate-800 transition-colors"
                  onClick={() => {
                    navigate('/dashboard/proposal-authoring/create-proposal', {
                      state: {
                        type: selectedType?.name || '',
                        section: selectedSection?.name || '',
                        prompt: selectedSection?.prompt || '',
                      },
                    });
                    onClose();
                  }}
                >
                  Use This Prompt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; background: #e0e7ef; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #b6c6e3; border-radius: 8px; }
      `}</style>
    </div>
  );
};

export default PromptTemplatePanel;
