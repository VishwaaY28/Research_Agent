/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFolder, FiPlus, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSources } from '../../hooks/useSources';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';
import SelectChunksModal from './SelectChunksModal';

interface CreateWorkspaceProps {
  onClose?: () => void;
  onWorkspaceCreated: (newWorkspace: any) => void;
}

const CreateWorkspace: React.FC<CreateWorkspaceProps> = ({ onClose, onWorkspaceCreated }) => {
  const internalNavigate = useNavigate();
  const { createWorkspace } = useWorkspace();
  const { listSources } = useSources();

  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [workspaceType, setWorkspaceType] = useState('');
  const [workspaceTypes, setWorkspaceTypes] = useState<{ id: number; name: string }[]>([]);
  const [workspaceTypesLoading, setWorkspaceTypesLoading] = useState(false);

  // Content selection state
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<number[]>([]); // source IDs
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const [sourceChunks, setSourceChunks] = useState<{ [key: number]: any[] }>({}); // sourceId -> chunks
  const [selectedChunks, setSelectedChunks] = useState<{ [key: number]: Set<string> }>({}); // sourceId -> chunk indices
  const [selectingSourceId, setSelectingSourceId] = useState<number | null>(null);

  // Fetch sources on mount
  React.useEffect(() => {
    setSourcesLoading(true);
    listSources()
      .then((data) => {
        if (Array.isArray(data.sources)) setSources(data.sources);
        else if (Array.isArray(data)) setSources(data);
        else setSources([]);
      })
      .catch(() => setSources([]))
      .finally(() => setSourcesLoading(false));
  }, [listSources]);

  // Fetch workspace types on mount
  useEffect(() => {
    setWorkspaceTypesLoading(true);
    fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
      headers: {
        Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Accept both {workspace_types: [...]}, or just an array
        if (Array.isArray(data)) setWorkspaceTypes(data);
        else if (Array.isArray(data.workspace_types)) setWorkspaceTypes(data.workspace_types);
        else setWorkspaceTypes([]);
      })
      .catch(() => setWorkspaceTypes([]))
      .finally(() => setWorkspaceTypesLoading(false));
  }, []);

  // Fetch chunks for a source
  const fetchChunksForSource = async (sourceId: number) => {
    if (sourceChunks[sourceId]) return; // already fetched
    try {
      const res = await fetch(`http://localhost:8000/api/sources/${sourceId}/chunks`);
      const data = await res.json();
      setSourceChunks((prev) => ({ ...prev, [sourceId]: data.chunks || [] }));
    } catch {
      setSourceChunks((prev) => ({ ...prev, [sourceId]: [] }));
    }
  };

  const handleSourceToggle = (sourceId: number) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter((id) => id !== sourceId));
      setSelectedChunks((prev) => {
        const copy = { ...prev };
        delete copy[sourceId];
        return copy;
      });
    } else {
      setSelectedSources([...selectedSources, sourceId]);
      setSelectedChunks((prev) => {
        const copy = { ...prev };
        delete copy[sourceId];
        return copy;
      });
    }
  };

  const handleExpandSource = (sourceId: number) => {
    setExpandedSource(expandedSource === sourceId ? null : sourceId);
    if (expandedSource !== sourceId) fetchChunksForSource(sourceId);
  };

  const handleChunkToggle = (sourceId: number, idx: number) => {
    setSelectedSources(selectedSources.filter((id) => id !== sourceId)); // unselect full source if chunk is selected
    setSelectedChunks((prev) => {
      const set = new Set(prev[sourceId] || []);
      if (set.has(idx.toString())) set.delete(idx.toString());
      else set.add(idx.toString());
      return { ...prev, [sourceId]: set };
    });
  };

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
      // Prepare content selection payload
      const source_ids = selectedSources;
      const chunks: any[] = [];
      Object.entries(selectedChunks).forEach(([sourceId, idxSet]) => {
        const sid = Number(sourceId);
        const chunkArr = sourceChunks[sid] || [];
        // Track which major chunks are fully selected to avoid duplicate minors
        const majorSelected = new Set<string>();
        idxSet.forEach((key) => {
          if (/^\d+$/.test(key)) {
            // Major chunk selected
            const idx = Number(key);
            const chunk = chunkArr[idx];
            if (chunk) {
              let heading = chunk.name || chunk.title || '';
              try {
                const parsed = typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
                if (Array.isArray(parsed)) {
                  const firstTag = parsed.find((item: any) => item.tag && item.tag.trim() !== '');
                  if (firstTag && firstTag.tag) heading = firstTag.tag;
                }
              } catch {}
              chunks.push({
                name: heading || `Chunk ${idx + 1}`,
                content: typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
                source: sources.find((s) => s.id === sid)?.name || '',
                tags: chunk.tags || [],
                content_source_id: sid,
              });
              majorSelected.add(key);
            }
          } else if (/^\d+-\d+$/.test(key)) {
            // Minor chunk selected
            const [majorIdx, minorIdx] = key.split('-').map(Number);
            // If the major chunk is also selected, skip this minor to avoid duplicate
            if (majorSelected.has(String(majorIdx))) return;
            const majorChunk = chunkArr[majorIdx];
            if (majorChunk && Array.isArray(majorChunk.content)) {
              const minor = majorChunk.content[minorIdx];
              if (minor) {
                chunks.push({
                  name: minor.tag || minor.title || minor.name || `Minor Chunk ${minorIdx + 1}`,
                  content: minor.content ? (typeof minor.content === 'string' ? minor.content : JSON.stringify(minor.content)) : '',
                  source: sources.find((s) => s.id === sid)?.name || '',
                  tags: minor.tags || [],
                  content_source_id: sid,
                });
              }
            }
          }
        });
      });
      const newWorkspace = await createWorkspace({
        name: workspaceName,
        client: formData.clientName.trim(),
        tags: formData.tags,
        workspace_type: workspaceType,
        source_ids: source_ids.length > 0 ? source_ids : undefined,
        chunks: chunks.length > 0 ? chunks : undefined,
      });

      toast.success('Workspace created successfully!');
      if (onWorkspaceCreated) {
        onWorkspaceCreated(newWorkspace);
      }
      if (onClose) {
        onClose();
      } else {
        const defaultSectionMap: Record<string, string> = {
          Proposal: 'Executive Summary',
          'Service Agreement': 'Agreement Overview',
          Report: 'Introduction',
          Research: 'Abstract',
          Template: 'Header',
          Blog: 'Title',
        };
        const defaultSectionName = defaultSectionMap[workspaceType] || '';
        const navFn = internalNavigate;
        if (navFn) {
          navFn(`/dashboard/proposal-authoring/${newWorkspace.id}`, {
            state: {
              workspaceId: newWorkspace.id,
              sectionName: defaultSectionName,
              workspaceName: newWorkspace.name, // Pass the name for fallback
            },
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 max-h-[90vh] overflow-y-auto relative">
        {/* Close button at top right */}
        <button
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              const navFn = internalNavigate;
              if (navFn) navFn('/dashboard/workspaces');
            }
          }}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <FiX className="w-6 h-6" />
        </button>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
              <FiFolder className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create New Workspace</h2>
              <p className="text-gray-600 text-xs mt-1">
                Fill in the details and add content to get started.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Workspace Details */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Workspace Details</h3>
              <div className="space-y-4">
                {/* Vertical */}
                <div>
                  <label htmlFor="vertical" className="block text-xs font-medium text-gray-700 mb-1">
                    Vertical <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vertical"
                    value={selectedVertical}
                    onChange={(e) => setSelectedVertical(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
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
                </div>
                {/* Workspace Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="Enter workspace name or title"
                    required
                  />
                </div>
                {/* Client Name */}
                <div>
                  <label htmlFor="clientName" className="block text-xs font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    list="client-suggestions"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
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
                </div>
                {/* Workspace Type */}
                <div>
                  <label htmlFor="workspaceType" className="block text-xs font-medium text-gray-700 mb-1">
                    Workspace Type
                  </label>
                  <select
                    id="workspaceType"
                    name="workspaceType"
                    value={workspaceType}
                    onChange={(e) => setWorkspaceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    required
                  >
                    <option value="">{workspaceTypesLoading ? 'Loading...' : 'Select Type'}</option>
                    {workspaceTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-xs font-medium text-gray-700 mb-1">
                    Tags / Keywords
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="Enter a tag and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!currentTag.trim()}
                      className="px-3 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
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
              </div>
            </div>
            {/* Content Selection */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mt-6">
              <h3 className="text-base font-semibold mb-3 text-gray-900">
                Add Content from Existing Sources
              </h3>
              {sourcesLoading ? (
                <div className="text-gray-500">Loading sources...</div>
              ) : sources.length === 0 ? (
                <div className="text-gray-500">No sources found.</div>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="border rounded-lg p-2 bg-white flex items-center justify-between hover:shadow transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="font-medium underline text-primary text-sm text-left"
                          onClick={() => setSelectingSourceId(source.id)}
                        >
                          {source.name}
                        </button>
                        <span className="text-xs text-gray-500 ml-2">({source.type})</span>
                      </div>
                      {selectedChunks[source.id] && selectedChunks[source.id].size > 0 && (
                        <span className="text-xs text-green-600">
                          {selectedChunks[source.id].size} chunk(s) selected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Selected Chunks Summary */}
            {Object.entries(selectedChunks).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mt-6">
                <h3 className="text-base font-semibold mb-2 text-blue-900">
                  Selected Chunks Summary
                </h3>
                {Object.entries(selectedChunks).map(([sourceId, idxSet]) => {
                  const sid = Number(sourceId);
                  const chunkArr = sourceChunks[sid] || [];
                  const source = sources.find((s) => s.id === sid);
                  return (
                    <div key={sid} className="mb-2">
                      <div className="font-bold text-sm text-blue-900 text-left">
                        {source?.name || source?.title || 'Untitled Section'}
                      </div>
                      <ul className="list-disc ml-6 mt-1">
                        {[...idxSet].map((idx) => {
                          const chunk = chunkArr[Number(idx)];
                          if (!chunk) return null;
                          // Find the first non-empty tag in chunk.content
                          let chunkTitle = '';
                          if (Array.isArray(chunk.content)) {
                            const firstTag = chunk.content.find(
                              (item: any) => item.tag && item.tag.trim() !== '',
                            );
                            if (firstTag) chunkTitle = firstTag.tag;
                          }
                          if (!chunkTitle)
                            chunkTitle = chunk.name || chunk.title || 'Untitled Chunk';
                          return (
                            <li
                              key={idx}
                              className="text-xs text-blue-800 mb-1 text-left font-semibold"
                            >
                              {chunkTitle}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6 sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    const navFn = internalNavigate;
                    if (navFn) navFn('/dashboard/workspaces');
                  }
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs"
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
        {selectingSourceId !== null && (
          <SelectChunksModal
            source={sources.find((s) => s.id === selectingSourceId)}
            chunks={sourceChunks[selectingSourceId as number] || []}
            fetchChunks={async (sourceId: number) => {
              if (!sourceChunks[sourceId]) {
                const res = await fetch(`http://localhost:8000/api/sources/${sourceId}/chunks`);
                const data = await res.json();
                setSourceChunks((prev) => ({ ...prev, [sourceId]: data.chunks || [] }));
                return data.chunks || [];
              }
              return sourceChunks[sourceId];
            }}
            selected={selectedChunks[selectingSourceId as number] || new Set()}
            onSave={(selectedSet: Set<string>) => {
              setSelectedChunks((prev) => ({
                ...prev,
                [selectingSourceId as number]: selectedSet,
              }));
              setSelectingSourceId(null);
            }}
            onClose={() => setSelectingSourceId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default CreateWorkspace;
