import { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFileText, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { API } from '../../utils/constants';

interface UserIntent {
  id: number;
  name: string;
  is_default: boolean;
  sections?: Array<{
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

interface ResearchSection {
  id: number;
  name: string;
  order: number;
  prompt: string;
  schema: any;
}

const PromptTemplatePanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const [selectedSection, setSelectedSection] = useState<ResearchSection | null>(null);
  const [userIntents, setUserIntents] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch user intents from backend
  useEffect(() => {
    if (isOpen) {
      fetchUserIntents();
    }
  }, [isOpen]);

  const fetchUserIntents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/intents`, {
        headers: {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
      });
      if (response.ok) {
        const intents = await response.json();
        setUserIntents(intents);
      } else {
        console.error('Failed to fetch user intents');
      }
    } catch (error) {
      console.error('Error fetching user intents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForIntent = async (intentId: number) => {
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/intents/${intentId}/sections`, {
        headers: {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
      });
      if (response.ok) {
        const sections = await response.json();
        return sections;
      } else {
        console.error('Failed to fetch research sections');
        return [];
      }
    } catch (error) {
      console.error('Error fetching research sections:', error);
      return [];
    }
  };

  const handleIntentSelect = async (intent: UserIntent) => {
    setSelectedIntent(intent);
    setSelectedSection(null);

    // Fetch sections for this intent
    const sections = await fetchSectionsForIntent(intent.id);
    setSelectedIntent({ ...intent, sections });
  };

  if (!isOpen) return null;

  // Panel widths
  const leftPanelWidth = selectedIntent ? (selectedSection ? 'w-1/4' : 'w-1/3') : 'w-full';
  const midPanelWidth = selectedIntent ? (selectedSection ? 'w-1/3' : 'w-2/3') : 'w-0';
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
            <h3 className="text-xl font-semibold mb-6 text-slate-700">User Intents</h3>
            <ul className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar w-full max-w-xs">
              {loading ? (
                <li className="text-center text-slate-500">Loading...</li>
              ) : (
                userIntents.map((intent: UserIntent) => (
                  <li key={intent.name}>
                    <button
                      className={`w-full flex items-center justify-between p-3 rounded-2xl shadow-md border transition-all group ${selectedIntent && selectedIntent.name === intent.name ? 'bg-slate-200 border-slate-400' : 'bg-white hover:bg-slate-100 border-gray-200'}`}
                      onClick={() => handleIntentSelect(intent)}
                    >
                      <span
                        className={`font-semibold text-base ${selectedIntent && selectedIntent.name === intent.name ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}
                      >
                        {intent.name}
                      </span>
                      <FiChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* Panel 2: Research Sections (only show if an intent is selected) */}
        {selectedIntent && (
          <div
            className={`transition-all duration-300 h-full ${midPanelWidth} border-r border-gray-200 bg-gradient-to-br from-slate-100 to-gray-100/80 flex flex-col z-20`}
          >
            <div className="w-full h-full flex flex-col px-6 py-8">
              {/* Back to Intents button */}
              <button
                className="mb-4 flex items-center text-slate-700 font-semibold hover:underline"
                onClick={() => {
                  setSelectedIntent(null);
                  setSelectedSection(null);
                }}
                type="button"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" /> Back to Intents
              </button>
              <h3 className="text-xl font-semibold mb-4 text-slate-700">Research Sections</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <ul className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                  {selectedIntent.sections?.map((section: ResearchSection) => (
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
                  )) || <li className="text-center text-slate-500">No research sections available</li>}
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
              {/* Back to Research Sections button */}
              <button
                className="mb-4 flex items-center text-slate-700 font-semibold hover:underline"
                onClick={() => setSelectedSection(null)}
                type="button"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" /> Back to Research Sections
              </button>
              <h3 className="text-xl font-semibold mb-4 text-slate-700">
                Research Prompt for {selectedSection?.name}
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 text-slate-800 shadow-inner border border-gray-200 text-lg leading-relaxed font-medium">
                  {selectedSection.prompt}
                </div>
                
                {/* Schema Display */}
                {selectedSection.schema && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Schema Structure</h4>
                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(selectedSection.schema, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <button
                  className="mt-8 w-full py-3 rounded-xl bg-slate-700 text-white font-semibold text-lg shadow hover:bg-slate-800 transition-colors"
                  onClick={() => {
                    navigate('/dashboard/proposal-authoring/create-proposal', {
                      state: {
                        type: selectedIntent?.name || '',
                        section: selectedSection?.name || '',
                        prompt: selectedSection?.prompt || '',
                        schema: selectedSection?.schema || {},
                      },
                    });
                    onClose();
                  }}
                >
                  Use This Research Prompt
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
