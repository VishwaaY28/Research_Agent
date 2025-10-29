import jsPDF from 'jspdf';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft,
  FiArrowRight,
  FiFileText,
  FiPlay,
  FiPlus,
  FiTerminal,
  FiX,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import {
  useResearch,
  type ResearchAgentResponse,
  type StreamMessage,
} from '../../hooks/useResearch';
import { useUserIntents } from '../../hooks/useUserIntents';
import { API } from '../../utils/constants';

// Strip ANSI escape codes and control sequences for human-readable logs
function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  const ansiRegex =
    /[\u001B\u009B][[\]()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><~]|\u001B\].*?(?:\u0007|\u001B\\)/g;
  return input.replace(ansiRegex, '');
}

function cleanLog(input?: string): string {
  if (!input) return '';
  let text = stripAnsi(input);
  // Remove carriage returns that produce overstrike behavior
  text = text.replace(/\r/g, '');
  // Collapse very long sequences of dashes/underscores
  text = text.replace(/[_=\-]{6,}/g, '——');
  // Normalize excessive spaces while preserving monospace look
  text = text.replace(/\s{3,}/g, '  ');
  return text.trim();
}

interface ResearchFormData {
  companyName: string;
  productName: string;
  userIntentId?: number;
  selectedUrls: string[];
}

interface PdfHelpers {
  doc: jsPDF;
  addText: (text: string, fontSize?: number, isBold?: boolean, color?: string) => void;
  processContent: (content: string) => void;
  yPosition: number;
  maxWidth: number;
  margin: number;
  pageHeight: number;
}

const createPdfHelpers = (): PdfHelpers => {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const addText = (
    text: string,
    fontSize: number = 12,
    isBold: boolean = false,
    color: string = '#000000',
  ): void => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color);

    const lines = doc.splitTextToSize(text, maxWidth);

    // Check if we need a new page
    const lineHeight = fontSize * 1.2;
    if (yPosition + lines.length * lineHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    doc.text(lines, margin, yPosition);
    yPosition += lines.length * lineHeight + 5;
  };

  const processContent = (content: string): void => {
    const paragraphs = content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Handle lists
      if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
        const listItems = paragraph.split('\n');
        for (const item of listItems) {
          if (!item.trim()) continue;
          const bulletText = item.trim().startsWith('- ')
            ? item.substring(2)
            : item.trim().startsWith('* ')
              ? item.substring(2)
              : item;
          addText(`  • ${bulletText.trim()}`, 12, false);
        }
        yPosition += 8;
      }
      // Handle blockquotes
      else if (paragraph.trim().startsWith('> ')) {
        addText(paragraph.substring(2).trim(), 12, false, '#666666');
        yPosition += 8;
      }
      // Regular paragraph
      else {
        addText(paragraph.trim(), 12, false);
        yPosition += 8;
      }
    }
  };

  return {
    doc,
    addText,
    processContent,
    yPosition,
    maxWidth,
    margin,
    pageHeight,
  };
};

const ResearchAgent = () => {
  const { runResearchAgentStream } = useResearch();
  const { userIntents, loading: userIntentsLoading } = useUserIntents();

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const [researchResults, setResearchResults] = useState<ResearchAgentResponse | null>(null);
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [streamLogs, setStreamLogs] = useState<StreamMessage[]>([]);
  const [currentStepInfo, setCurrentStepInfo] = useState<{ step: number; message: string } | null>(
    null,
  );
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ResearchFormData>({
    companyName: '',
    productName: '',
    userIntentId: undefined,
    selectedUrls: [],
  });

  const [urlInput, setUrlInput] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs]);

  // Handlers
  const handleDownloadCsv = async () => {
    if (!researchResults) {
      toast.error('No research data to download');
      return;
    }

    // Derive filename from company and product names
    let filename = 'research-report.csv';
    try {
      const companyName = formData.companyName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      const productName = formData.productName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      if (companyName && productName) {
        filename = `${companyName}-${productName}-research-report.csv`;
      } else if (companyName) {
        filename = `${companyName}-research-report.csv`;
      }
    } catch (e) {
      filename = 'research-report.csv';
    }

    const escapeCsv = (value: any) => {
      const str = value === null || value === undefined ? '' : String(value);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    // Recursively flatten nested objects/arrays into human-readable rows
    const flattenObject = (
      obj: any,
      prefix: string = '',
      rows: any[] = [],
      parentRow: any = {},
    ): any[] => {
      if (obj === null || obj === undefined) {
        return rows;
      }

      if (Array.isArray(obj)) {
        // For arrays, create a row for each element
        obj.forEach((item, index) => {
          const arrayPrefix = prefix ? `${prefix}[${index + 1}]` : `Item ${index + 1}`;
          if (typeof item === 'object' && item !== null) {
            flattenObject(item, arrayPrefix, rows, { ...parentRow });
          } else {
            rows.push({
              ...parentRow,
              Field: arrayPrefix,
              Value: String(item),
            });
          }
        });
      } else if (typeof obj === 'object') {
        // For objects, recursively process each key
        const keys = Object.keys(obj);
        if (keys.length === 0) {
          return rows;
        }

        keys.forEach((key) => {
          const value = obj[key];
          const fieldName = prefix ? `${prefix}.${key}` : key;

          if (value === null || value === undefined) {
            rows.push({
              ...parentRow,
              Field: fieldName,
              Value: '',
            });
          } else if (Array.isArray(value)) {
            if (value.length === 0) {
              rows.push({
                ...parentRow,
                Field: fieldName,
                Value: '(empty)',
              });
            } else {
              flattenObject(value, fieldName, rows, parentRow);
            }
          } else if (typeof value === 'object') {
            flattenObject(value, fieldName, rows, parentRow);
          } else {
            rows.push({
              ...parentRow,
              Field: fieldName,
              Value: String(value),
            });
          }
        });
      } else {
        rows.push({
          ...parentRow,
          Field: prefix || 'Value',
          Value: String(obj),
        });
      }

      return rows;
    };

    try {
      const sections = researchResults.sections || [];
      const intentName = formData.userIntentId
        ? userIntents.find((ui) => ui.id === formData.userIntentId)?.name ||
          String(formData.userIntentId)
        : '';

      const allRows: any[] = [];

      // Process each section
      sections.forEach((section: any) => {
        const baseInfo = {
          Company: formData.companyName,
          Product: formData.productName,
          'User Intent': intentName,
          'Section Name': section.section_name,
          Group: section.group,
          Relevant: String(section.relevant),
          Topic: section.topic,
          Notes: section.notes || '',
        };

        // Add section metadata row
        allRows.push({
          ...baseInfo,
          Field: 'Section Info',
          Value: `${section.section_name} (${section.group})`,
        });

        // Flatten the content object
        if (section.content && typeof section.content === 'object') {
          const contentRows = flattenObject(section.content, '', [], baseInfo);
          allRows.push(...contentRows);
        }

        // Add empty row for separation between sections
        allRows.push({
          Company: '',
          Product: '',
          'User Intent': '',
          'Section Name': '',
          Group: '',
          Relevant: '',
          Topic: '',
          Notes: '',
          Field: '',
          Value: '',
        });
      });

      // Build CSV headers
      const headers = [
        'Company',
        'Product',
        'User Intent',
        'Section Name',
        'Group',
        'Relevant',
        'Topic',
        'Notes',
        'Field',
        'Value',
      ];

      const lines: string[] = [];
      lines.push(headers.join(','));

      // Add data rows
      allRows.forEach((row) => {
        const csvRow = headers.map((header) => escapeCsv(row[header] || ''));
        lines.push(csvRow.join(','));
      });

      // Create CSV blob and trigger download
      const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV downloaded successfully!');
    } catch (err) {
      console.error('CSV generation failed', err);
      toast.error('Failed to generate CSV');
    }
  };

  const handleDownloadPdf = async () => {
    if (!researchResults?.final_report) {
      toast.error('No final report to download');
      return;
    }

    // Derive filename from company and product names
    let filename = 'research-report.pdf';
    try {
      const companyName = formData.companyName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      const productName = formData.productName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      if (companyName && productName) {
        filename = `${companyName}-${productName}-research-report.pdf`;
      } else if (companyName) {
        filename = `${companyName}-research-report.pdf`;
      }
    } catch (e) {
      filename = 'research-report.pdf';
    }

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Helper function to add text with proper formatting
    const addText = (
      text: string,
      fontSize: number = 12,
      isBold: boolean = false,
      color: string = '#000000',
    ) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(color);

      const lines = doc.splitTextToSize(text, maxWidth);

      // Check if we need a new page
      const lineHeight = fontSize * 1.2;
      if (yPosition + lines.length * lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(lines, margin, yPosition);
      yPosition += lines.length * lineHeight + 5;
    };

    // Helper function to add a line break
    const addLineBreak = (size: number = 10) => {
      yPosition += size;
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    try {
      // Add header
      addText('Research Report', 20, true, '#1f2937');
      addLineBreak(10);

      // Add company and product info
      addText(`Company: ${formData.companyName}`, 14, true, '#374151');
      addText(`Product/Service: ${formData.productName}`, 14, true, '#374151');
      addLineBreak(15);

      // Process the markdown content
      const content = researchResults.final_report;

      // Split content into lines and process each line
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
          addLineBreak(5);
          continue;
        }

        // Handle different markdown elements
        if (line.startsWith('# ')) {
          // Main heading
          addLineBreak(10);
          addText(line.substring(2), 18, true, '#1f2937');
          addLineBreak(5);
        } else if (line.startsWith('## ')) {
          // Sub heading
          addLineBreak(8);
          addText(line.substring(3), 16, true, '#374151');
          addLineBreak(3);
        } else if (line.startsWith('### ')) {
          // Sub sub heading
          addLineBreak(5);
          addText(line.substring(4), 14, true, '#4b5563');
          addLineBreak(2);
        } else if (line.startsWith('#### ')) {
          // Small heading
          addLineBreak(3);
          addText(line.substring(5), 13, true, '#6b7280');
          addLineBreak(2);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // Bullet point
          const bulletText = line.substring(2);
          addText(`• ${bulletText}`, 11, false, '#374151');
        } else if (line.match(/^\d+\./)) {
          // Numbered list
          addText(line, 11, false, '#374151');
        } else if (line.startsWith('> ')) {
          // Quote
          const quoteText = line.substring(2);
          addText(`"${quoteText}"`, 11, false, '#6b7280');
        } else if (line.startsWith('```')) {
          // Code block start/end - skip for now
          continue;
        } else if (line.startsWith('**') && line.endsWith('**')) {
          // Bold text
          const boldText = line.substring(2, line.length - 2);
          addText(boldText, 12, true, '#374151');
        } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
          // Italic text
          const italicText = line.substring(1, line.length - 1);
          addText(italicText, 12, false, '#4b5563');
        } else if (line.includes('---') || line.includes('===')) {
          // Horizontal rule
          addLineBreak(5);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        } else {
          // Regular paragraph
          addText(line, 11, false, '#374151');
        }
      }

      // Add footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${totalPages}`,
          pageWidth - 100,
          pageHeight - 20,
        );
      }

      doc.save(filename);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF');
    }
  };

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
        return formData.companyName.trim() && formData.productName.trim() && formData.userIntentId;
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
    setStreamLogs([]);
    setCurrentStepInfo(null);
    setShowLogs(true);

    try {
      const researchData = {
        company_name: formData.companyName,
        product_name: formData.productName,
        user_intent_id: formData.userIntentId,
        selected_urls: formData.selectedUrls.length > 0 ? formData.selectedUrls : undefined,
      };

      const cleanup = await runResearchAgentStream(
        researchData,
        (message: StreamMessage) => {
          setStreamLogs((prev) => [...prev, message]);

          if (message.type === 'step') {
            setCurrentStepInfo({ step: message.step || 0, message: message.message || '' });
          }
        },
        (result: ResearchAgentResponse) => {
          console.log('Research Agent Response:', result);
          setResearchResults(result);
          setCurrentStep(2);
        },
        (error: string) => {
          console.error('Research agent error:', error);
        },
      );

      streamCleanupRef.current = cleanup;
    } catch (error: any) {
      toast.error(error.message || 'Failed to run research agent');
      setIsRunning(false);
    }
  };

  const handleStopResearch = () => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    setIsRunning(false);
    toast('Research stopped by user', { icon: 'ℹ️' });
  };

  const handleSeedDemoSections = async () => {
    setSeeding(true);
    try {
      const response = await fetch(
        API.BASE_URL() +
          API.ENDPOINTS.RESEARCH_SECTION_TEMPLATES.BASE_URL() +
          API.ENDPOINTS.RESEARCH_SECTION_TEMPLATES.SEED(),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
      } else {
        toast.error('Failed to seed demo sections');
      }
    } catch (error) {
      console.error('Error seeding demo sections:', error);
      toast.error('Failed to seed demo sections');
    } finally {
      setSeeding(false);
    }
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Intent *
              </label>
              <select
                value={formData.userIntentId || ''}
                onChange={(e) =>
                  updateFormData(
                    'userIntentId',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                disabled={userIntentsLoading}
              >
                <option value="">Select a research intent...</option>
                {userIntents.map((intent) => (
                  <option key={intent.id} value={intent.id}>
                    {intent.name} {intent.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              {userIntentsLoading && (
                <p className="text-sm text-gray-500 mt-1">Loading research intents...</p>
              )}
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

            {/* <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Setup Required</h4>
                  <p className="text-sm text-yellow-700">
                    Before running research, you need to seed the default research section
                    templates.
                  </p>
                </div>
                <button
                  onClick={handleSeedDemoSections}
                  disabled={seeding}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {seeding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                      Seeding...
                    </>
                  ) : (
                    'Seed Demo Sections'
                  )}
                </button>
              </div>
            </div> */}
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
                  <span className="text-gray-600">Research Intent:</span>
                  <span className="font-medium">
                    {userIntents.find((intent) => intent.id === formData.userIntentId)?.name ||
                      'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Additional URLs:</span>
                  <span className="font-medium">{formData.selectedUrls.length} selected</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong> The research agent will automatically search for
                information, analyze content, and generate a comprehensive report with multiple
                research sections. This process typically takes 2-5 minutes.
              </p>
            </div>

            {/* Live Logs Display */}
            {isRunning && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiTerminal className="w-4 h-4 text-green-400" />
                    <h4 className="text-sm font-medium text-white">Live Research Logs</h4>
                  </div>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {showLogs ? 'Hide' : 'Show'} Logs
                  </button>
                </div>

                {currentStepInfo && (
                  <div className="mb-3 p-2 bg-blue-900/50 rounded border border-blue-700">
                    <div className="text-sm text-blue-300">
                      Step {currentStepInfo.step}: {currentStepInfo.message}
                    </div>
                  </div>
                )}

                {showLogs && (
                  <div className="max-h-64 overflow-y-auto bg-black/50 rounded p-3 font-mono text-xs">
                    {streamLogs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span
                          className={`inline-block w-12 text-right mr-2 ${
                            log.type === 'error'
                              ? 'text-red-400'
                              : log.type === 'step'
                                ? 'text-blue-400'
                                : log.type === 'log'
                                  ? 'text-green-400'
                                  : 'text-gray-400'
                          }`}
                        >
                          [{log.type}]
                        </span>
                        <span className="text-gray-300">{cleanLog(log.message)}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            )}
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
                    Successfully generated {researchResults.sections?.length || 0} research sections
                    from {researchResults.urls?.length || 0} sources.
                  </p>
                </div>

                {/* Toggle between sections and final report */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setShowFinalReport(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !showFinalReport
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Research Sections
                  </button>
                  <button
                    onClick={() => setShowFinalReport(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showFinalReport
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Final Report
                  </button>
                </div>

                {!showFinalReport ? (
                  <>
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
                                <p className="text-xs text-gray-600 mt-1">{urlItem.Description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {researchResults.sections && researchResults.sections.length > 0 ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Research Sections
                        </h3>
                        <div className="space-y-4">
                          {researchResults.sections.map((section, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {section.section_name}
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    section.relevant
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {section.relevant ? 'Relevant' : 'Not Relevant'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{section.notes}</p>
                              <div className="text-xs text-gray-500">
                                Group: {section.group} | Topic: {section.topic}
                              </div>
                              {section.content && Object.keys(section.content).length > 0 && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Content:
                                  </h5>
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
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          No Research Sections Generated
                        </h3>
                        <p className="text-sm text-yellow-800">
                          The research agent completed but no sections were generated. This might be
                          due to insufficient data or processing errors.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Final Research Report</h3>
                      {(researchResults as any).final_report && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDownloadPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <FiFileText className="w-4 h-4" />
                            Download as PDF
                          </button>
                          <button
                            onClick={handleDownloadCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <FiFileText className="w-4 h-4" />
                            Download as CSV
                          </button>
                        </div>
                      )}
                    </div>
                    {(researchResults as any).final_report ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{(researchResults as any).final_report}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          No Final Report Generated
                        </h3>
                        <p className="text-sm text-yellow-800">
                          The final report could not be generated. Please check the research
                          sections for details.
                        </p>
                      </div>
                    )}
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={isRunning ? handleStopResearch : handleStartResearch}
                  disabled={!canProceed() && !isRunning}
                  className={`flex items-center space-x-2 px-8 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg ${
                    isRunning
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <FiX className="w-5 h-5" />
                      <span>Stop Research</span>
                    </>
                  ) : (
                    <>
                      <FiPlay className="w-5 h-5" />
                      <span>Start Research Agent</span>
                    </>
                  )}
                </button>
                {isRunning && currentStepInfo && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    <span>
                      Step {currentStepInfo.step}: {currentStepInfo.message}
                    </span>
                  </div>
                )}
              </div>
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
