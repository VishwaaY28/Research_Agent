/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiEye,
  FiFile,
  FiFileText,
  FiGlobe,
  FiMoreVertical,
  FiTrash,
  FiX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { API } from '../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

const ContentSources: React.FC = () => {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'pdf' | 'docx' | 'web'>('all');
  const [deleteTarget, setDeleteTarget] = useState<null | { id: number; name: string }>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.three-dot-menu')) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpenId]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.LIST()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Failed to load content sources');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (sourceId: number, sourceName: string) => {
    setDeleteTarget({ id: sourceId, name: sourceName });
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FiFile className="w-5 h-5 text-red-500" />;
      case 'docx':
        return <FiFileText className="w-5 h-5 text-blue-500" />;
      case 'web':
        return <FiGlobe className="w-5 h-5 text-green-500" />;
      default:
        return <FiFile className="w-5 h-5 text-gray-500" />;
    }
  };

  const truncateName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const filteredSources = sources.filter(
    (source) => selectedType === 'all' || source.type === selectedType,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 md:px-8">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
        <h1 className="text-lg font-bold text-black">Content Sources</h1>
        <button
          onClick={() => navigate('/dashboard/content-ingestion')}
          className="bg-white text-primary border border-primary px-3 py-1.5 rounded font-medium text-sm hover:bg-primary hover:text-white transition-colors"
        >
          + Upload
        </button>
      </div>

      {/* Horizontal Filter Bar */}
      <div className="flex flex-row gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
        {[
          { key: 'all', label: 'All' },
          { key: 'pdf', label: 'PDF' },
          { key: 'docx', label: 'DOCX' },
          { key: 'web', label: 'Web' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key as any)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
              selectedType === tab.key
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-primary/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="px-2 py-4">
        {filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FiFile className="w-10 h-10 text-gray-300 mb-2" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No content sources</h3>
            <p className="text-gray-500 mb-2 text-xs text-center max-w-xs">
              {selectedType === 'all'
                ? "You haven't uploaded any content sources yet."
                : `No ${selectedType.toUpperCase()} sources found.`}
            </p>
            <button
              onClick={() => navigate('/dashboard/content-ingestion')}
              className="bg-white text-primary border border-primary px-3 py-1.5 rounded font-medium text-xs hover:bg-primary hover:text-white transition-colors"
            >
              Upload Content
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mt-2">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 bg-gray-50">
              <div className="col-span-1">Type</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Source URL</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
            <div>
              {filteredSources.map((source) => (
                <div
                  key={source.id}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-2 border-b last:border-b-0 hover:bg-gray-50 text-sm"
                >
                  <div className="col-span-1 flex items-center">
                    {getSourceIcon(source.type)}
                    <span className="ml-1 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full md:hidden">
                      {source.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-4 truncate" title={source.name}>
                    {truncateName(source.name, 40)}
                  </div>
                  <div
                    className="col-span-3 truncate text-blue-700 underline"
                    title={source.source_url}
                  >
                    {source.source_url ? (
                      <a href={source.source_url} target="_blank" rel="noopener noreferrer">
                        {truncateName(source.source_url, 40)}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-gray-500">
                    <FiCalendar className="w-3 h-3 mr-1 inline" />
                    {new Date(source.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 flex justify-center relative three-dot-menu">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === source.id ? null : source.id)}
                      className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                      aria-label="Actions"
                    >
                      <FiMoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    {menuOpenId === source.id && (
                      <div className="absolute right-0 top-8 z-10 w-32 bg-white border border-gray-200 rounded shadow-md py-1">
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            navigate(`/dashboard/content-sources/${source.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <FiEye className="w-4 h-4" /> View
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            handleDeleteSource(source.id, source.name);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                          <FiTrash className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-xs mx-2 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-black">Delete Source</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 text-neutral-700 text-xs">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-2 border border-gray-300 rounded text-neutral-700 hover:bg-gray-50 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.DELETE_HARD(deleteTarget.id)}`,
                      { method: 'DELETE' },
                    );
                    if (response.ok) {
                      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
                      toast.success('Content source deleted');
                    } else {
                      toast.error('Failed to delete content source');
                    }
                  } catch (error) {
                    toast.error('Failed to delete content source');
                  } finally {
                    setDeleteTarget(null);
                  }
                }}
                className="flex-1 py-2 px-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentSources;
