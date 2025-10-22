import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiArrowRight, FiPlay, FiPlus, FiX } from 'react-icons/fi';
import { useResearch, type ResearchAgentResponse } from '../../hooks/useResearch';

interface ResearchFormData {
  companyName: string;
  productName: string;
  selectedUrls: string[];
}

const ResearchAgent: React.FC = () => {
  const { runResearchAgent, loading: researchLoading } = useResearch();

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const [researchResults, setResearchResults] = useState<ResearchAgentResponse | null>(null);


  const [formData, setFormData] = useState<ResearchFormData>({
    companyName: '',
    productName: '',
    selectedUrls: [],
  });


  const [urlInput, setUrlInput] = useState('');


  const addUrl = () => {
    if (urlInput.trim() && !formData.selectedUrls.includes(urlInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        selectedUrls: [...prev.selectedUrls, urlInput.trim()],
      }));
      setUrlInput('');
    }
  };

  const removeUrl = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedUrls: prev.selectedUrls.filter((u) => u !== url),
    }));
  };

  const updateFormData = (field: keyof ResearchFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.companyName.trim() && formData.productName.trim();
      case 1:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };


  const handleStartResearch = async () => {
    if (!canProceed()) return;

    setIsRunning(true);
    try {
      const researchData = {
        company_name: formData.companyName,
        product_name: formData.productName,
        selected_urls: formData.selectedUrls.length > 0 ? formData.selectedUrls : undefined,
      };

      const response = await runResearchAgent(researchData);

      console.log('Research Agent Response:', response);
      setResearchResults(response);
      setCurrentStep(2);

      toast.success('Research completed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to run research agent');
    } finally {
      setIsRunning(false);
    }
  };

  // Step components
  const stepTitles = ['Company & Product', 'Review & Launch', 'Results'];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  placeholder="e.g., OpenAI, Google, Microsoft"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product/Service Name *
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => updateFormData('productName', e.target.value)}
                  placeholder="e.g., ChatGPT, Google Cloud, Azure"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Additional URLs (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                />
                <button
                  type="button"
                  onClick={addUrl}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
              {formData.selectedUrls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.selectedUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 truncate">{url}</span>
                      <button
                        onClick={() => removeUrl(url)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The AI agent will automatically search for relevant
                information about {formData.companyName} and {formData.productName}
                using multiple sources including company websites, news articles, and industry
                reports. You can also manually add specific URLs you want to include.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Product/Service:</span>
                  <span className="font-medium">{formData.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Additional URLs:</span>
                  <span className="font-medium">
                    {formData.selectedUrls.length} selected
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong> The research agent will automatically search for information,
                analyze content, and generate a comprehensive report with multiple research sections.
                This process typically takes 2-5 minutes.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {researchResults ? (
              <>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Research Completed!</h3>
                  <p className="text-sm text-green-800">
                    Successfully generated {researchResults.sections?.length || 0} research sections from {researchResults.urls?.length || 0} sources.
                  </p>
                </div>

                {researchResults.urls && researchResults.urls.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sources Used</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {researchResults.urls.map((urlItem, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {urlItem.URL}
                          </p>
                          {urlItem.Description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {urlItem.Description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {researchResults.sections && researchResults.sections.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Sections</h3>
                    <div className="space-y-4">
                      {researchResults.sections.map((section, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{section.section_name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              section.relevant
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {section.relevant ? 'Relevant' : 'Not Relevant'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{section.notes}</p>
                          <div className="text-xs text-gray-500">
                            Group: {section.group} | Topic: {section.topic}
                          </div>
                          {section.content && Object.keys(section.content).length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Content:</h5>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                {JSON.stringify(section.content, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Research Sections Generated</h3>
                    <p className="text-sm text-yellow-800">
                      The research agent completed but no sections were generated. This might be due to insufficient data or processing errors.
                    </p>
                  </div>
                )}

                {researchResults.error && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                    <p className="text-sm text-red-800">{researchResults.error}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Research Results</h3>
                <p className="text-sm text-gray-600">
                  Research results will appear here once the agent completes its analysis.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-white">
      {/* Sidebar */}
      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">New Research Run Wizard</h2>
            <p className="text-gray-600">
              Configure your research parameters and let the AI agent gather comprehensive
              information for your report.
            </p>
          </div>

          {/* Wizard Steps */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              {stepTitles.map((title, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      index === currentStep
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index === currentStep
                          ? 'bg-white text-primary'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{title}</span>
                  </div>
                  {index < stepTitles.length - 1 && (
                    <FiArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {currentStep === 1 ? (
              <button
                onClick={handleStartResearch}
                disabled={isRunning || researchLoading || !canProceed()}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isRunning || researchLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Running Research Agent...</span>
                  </>
                ) : (
                  <>
                    <FiPlay className="w-5 h-5" />
                    <span>Start Research Agent</span>
                  </>
                )}
              </button>
            ) : currentStep < 1 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchAgent;
