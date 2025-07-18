import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFileText, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const WORKSPACE_TYPES = [
  {
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
    name: 'Service Agreement',
    sections: [
      {
        name: 'Agreement Overview',
        prompt: 'Summarize the purpose and scope of the service agreement.',
      },
      {
        name: 'Services Provided',
        prompt: 'List and describe the services to be provided under this agreement.',
      },
      {
        name: 'Service Levels',
        prompt: 'Define the expected service levels and performance metrics.',
      },
      { name: 'Responsibilities', prompt: 'Outline the responsibilities of both parties.' },
      {
        name: 'Payment Terms',
        prompt: 'Specify the payment terms, schedule, and invoicing process.',
      },
      {
        name: 'Termination Clause',
        prompt: 'Describe the conditions under which the agreement may be terminated.',
      },
      {
        name: 'Confidentiality',
        prompt: 'Explain the confidentiality obligations of both parties.',
      },
    ],
  },
  {
    name: 'Report',
    sections: [
      {
        name: 'Introduction',
        prompt: 'Provide an introduction to the report, including objectives and background.',
      },
      {
        name: 'Methodology',
        prompt: 'Describe the methods and processes used to gather and analyze data.',
      },
      { name: 'Findings', prompt: 'Summarize the key findings of the report.' },
      { name: 'Analysis', prompt: 'Provide a detailed analysis of the findings.' },
      {
        name: 'Recommendations',
        prompt: 'Offer actionable recommendations based on the analysis.',
      },
      { name: 'Conclusion', prompt: 'Summarize the main points and conclusions of the report.' },
      { name: 'Appendices', prompt: 'Include any supplementary material or data.' },
    ],
  },
  {
    name: 'Research',
    sections: [
      { name: 'Abstract', prompt: 'Summarize the research topic, objectives, and key findings.' },
      { name: 'Introduction', prompt: 'Introduce the research problem and its significance.' },
      { name: 'Literature Review', prompt: 'Review relevant literature and previous research.' },
      { name: 'Methodology', prompt: 'Describe the research design, methods, and procedures.' },
      { name: 'Results', prompt: 'Present the results of the research.' },
      { name: 'Discussion', prompt: 'Interpret the results and discuss their implications.' },
      { name: 'References', prompt: 'List all references and sources cited in the research.' },
    ],
  },
  {
    name: 'Template',
    sections: [
      { name: 'Header', prompt: 'Provide the header for the template, including title and date.' },
      { name: 'Body', prompt: 'Describe the main content or body of the template.' },
      { name: 'Footer', prompt: 'Include footer information such as page numbers or disclaimers.' },
      {
        name: 'Instructions',
        prompt: 'Provide instructions for using or filling out the template.',
      },
      { name: 'Checklist', prompt: 'List items to be checked or completed in the template.' },
      { name: 'Summary', prompt: 'Summarize the purpose and key points of the template.' },
      { name: 'Appendix', prompt: 'Include any additional material or resources.' },
    ],
  },
  {
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

const PromptTemplatePanel = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const navigate = useNavigate();

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
              {WORKSPACE_TYPES.map((type) => (
                <li key={type.name}>
                  <button
                    className={`w-full flex items-center justify-between p-3 rounded-2xl shadow-md border transition-all group ${selectedType && selectedType.name === type.name ? 'bg-slate-200 border-slate-400' : 'bg-white hover:bg-slate-100 border-gray-200'}`}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedSection(null);
                    }}
                  >
                    <span
                      className={`font-semibold text-base ${selectedType && selectedType.name === type.name ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}
                    >
                      {type.name}
                    </span>
                    <FiChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                </li>
              ))}
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
                  {selectedType.sections.map((section) => (
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
                  ))}
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
                Prompt for {selectedSection.name}
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
                        type: selectedType.name,
                        section: selectedSection.name,
                        prompt: selectedSection.prompt,
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
