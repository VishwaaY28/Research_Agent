/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiFolder, FiPlus, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../hooks/useWorkspace';

const CreateWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.error('Client/Opportunity name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const newWorkspace = await createWorkspace({
        name: formData.name.trim(),
        clientName: formData.clientName.trim(),
        tags: formData.tags,
      });

      toast.success('Workspace created successfully!');
      navigate(`/dashboard/workspaces/${newWorkspace.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard/workspaces')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Workspace</h1>
                <p className="text-gray-600 mt-1">
                  Set up a new content workspace for organizing reusable proposal components
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
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
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                    placeholder="Enter workspace name or title"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a descriptive name for your workspace
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="clientName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Client / Opportunity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                    placeholder="Who is this workspace being prepared for?"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify the client or opportunity this workspace is associated with
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
                    onClick={() => navigate('/dashboard/workspaces')}
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
