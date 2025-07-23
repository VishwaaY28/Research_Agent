/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFolder, FiPlus, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../hooks/useWorkspace';

const CreateWorkspace: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [workspaceType, setWorkspaceType] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    if (!formData.clientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const workspaceName = `${selectedVertical} - ${formData.name}`;
      const newWorkspace = await createWorkspace({
        name: workspaceName,
        client: formData.clientName.trim(),
        tags: formData.tags,
        workspace_type: workspaceType,
      });

      toast.success('Workspace created successfully!');
      if (onClose) {
        onClose();
      } else {
        navigate(`/dashboard/workspaces/${newWorkspace.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-white">
      {/* Removed header section for compact modal */}
      <div className="px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
            {/* Close button at top right */}
            <button
              onClick={() => (onClose ? onClose() : navigate('/dashboard/workspaces'))}
              className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close"
            >
              <FiX className="w-6 h-6" />
            </button>
            <div className="p-6">
              {/* Optionally, you can add a small title here if needed */}
              {/* <h2 className="text-xl font-semibold text-gray-900 mb-6">Workspace Details</h2> */}
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                  <FiFolder className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Workspace Details</h2>
                  <p className="text-gray-600 text-sm">
                    Provide information about your new workspace
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedVertical}
                      onChange={(e) => setSelectedVertical(e.target.value)}
                      className="w-40 px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 custom-select appearance-none"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3Csvg fill='none' stroke='%236B7280' stroke-width='2' viewBox='0 0 24 24' width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1.25rem center',
                        backgroundSize: '16px 16px',
                      }}
                      required
                    >
                      <option value="">Select Vertical</option>
                      <option value="FS">FS</option>
                      <option value="GEN-AI">GEN-AI</option>
                      <option value="H&I">H&I</option>
                      <option value="TT">TT</option>
                      <option value="M&C">M&C</option>
                      <option value="RE">RE</option>
                      <option value="STG">STG</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                      placeholder="Enter workspace name or title"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a descriptive name for your workspace
                  </p>
                </div>
                {/* Workspace Type Dropdown */}
                <div>
                  <label
                    htmlFor="workspaceType"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Workspace Type
                  </label>
                  <select
                    id="workspaceType"
                    name="workspaceType"
                    value={workspaceType}
                    onChange={(e) => setWorkspaceType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 custom-select appearance-none"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg fill='none' stroke='%236B7280' stroke-width='2' viewBox='0 0 24 24' width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1.25rem center',
                      backgroundSize: '16px 16px',
                    }}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Blog">Blog</option>
                    <option value="Service Agreement">Service Agreement</option>
                    <option value="Template">Template</option>
                    <option value="Report">Report</option>
                    <option value="Research">Research</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the type of workspace you are creating
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="clientName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    list="client-suggestions"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200 custom-select appearance-none"
                    style={{ backgroundImage: 'none' }}
                    placeholder="Who is this workspace being prepared for?"
                    required
                  />
                  <datalist id="client-suggestions">
                    <option value="NYSE" />
                    <option value="BSE" />
                    <option value="UHG" />
                    <option value="Coca-Cola" />
                    <option value="Walmart" />
                    <option value="Delta Air Lines" />
                    <option value="MetLife" />
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Specify the client name this workspace is associated with{' '}
                  </p>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags / Keywords
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                        placeholder="Enter a tag and press Enter"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        disabled={!currentTag.trim()}
                        className="px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-primary/60 hover:text-primary transition-colors"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Add tags for filtering and categorization (e.g., industry, project type, year)
                  </p>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => (onClose ? onClose() : navigate('/dashboard/workspaces'))}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiFolder className="w-4 h-4 mr-2" />
                        Create Workspace
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspace;
