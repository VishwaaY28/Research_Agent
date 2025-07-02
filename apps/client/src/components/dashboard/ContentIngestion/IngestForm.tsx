import React, { useState } from 'react';
import { FiUpload, FiFile, FiGlobe } from 'react-icons/fi';

type IngestForm = {
  onContentUploaded: (content: any) => void;
}

const IngestForm: React.FC<IngestForm> = ({ onContentUploaded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [webLink, setWebLink] = useState('');
  const [errors, setErrors] = useState<{ file?: string; url?: string }>({});
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return allowedTypes.includes(file.type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        setErrors(prev => ({ ...prev, file: undefined }));
      } else {
        setErrors(prev => ({ ...prev, file: 'Only PDF and DOCX files are allowed' }));
        setSelectedFile(null);
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setWebLink(url);
    if (url && !validateUrl(url)) {
      setErrors(prev => ({ ...prev, url: 'Please enter a valid URL' }));
    } else {
      setErrors(prev => ({ ...prev, url: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadType === 'file' && selectedFile) {
      onContentUploaded({ type: 'file', data: selectedFile });
    } else if (uploadType === 'url' && webLink && validateUrl(webLink)) {
      onContentUploaded({ type: 'url', data: webLink });
    }
  };

  const canSubmit = uploadType === 'file' ? selectedFile && !errors.file : webLink && !errors.url;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-black mb-3">Content Ingestion</h2>
        <p className="text-neutral-600">Upload documents or web content to extract valuable insights for your proposals</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div
          className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'file'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setUploadType('file')}
        >
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary/10 rounded-xl mr-4">
              <FiFile className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-black">File Upload</h3>
          </div>
          <p className="text-neutral-600 text-sm mb-6">
            Upload PDF or DOCX documents for intelligent content extraction and analysis
          </p>
          
          {uploadType === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-neutral-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-neutral-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                </label>
              </div>
              {errors.file && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.file}</p>
                </div>
              )}
              {selectedFile && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✓ Selected: {selectedFile.name}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
            uploadType === 'url'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setUploadType('url')}
        >
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary/10 rounded-xl mr-4">
              <FiGlobe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-black">Web Link</h3>
          </div>
          <p className="text-neutral-600 text-sm mb-6">
            Extract content from web pages, articles, and online resources
          </p>
          
          {uploadType === 'url' && (
            <div className="space-y-4">
              <input
                type="url"
                placeholder="https://example.com/article"
                value={webLink}
                onChange={handleUrlChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {errors.url && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.url}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-4 px-8 rounded-xl font-semibold transition-all duration-200 ${
            canSubmit
              ? 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <FiUpload className="w-5 h-5 inline mr-3" />
          Process Content
        </button>
      </form>
    </div>
  );
};

export default IngestForm;