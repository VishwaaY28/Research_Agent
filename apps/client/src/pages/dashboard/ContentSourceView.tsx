import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCalendar, FiFile, FiFileText, FiGlobe } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { API } from '../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

type ContentChunk = {
  label: string;
  content: string;
  file_source?: string;
  page?: number;
  section_type?: string;
};

type SourceDetails = {
  source: ContentSource;
  chunks: ContentChunk[];
};

const ContentSourceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSourceDetails();
    }
  }, [id]);

  const fetchSourceDetails = async () => {
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.BY_ID(id!)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        toast.error('Failed to load content source details');
        navigate('/dashboard/content-sources');
      }
    } catch (error) {
      console.error('Error fetching source details:', error);
      toast.error('Failed to load content source details');
      navigate('/dashboard/content-sources');
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FiFile className="w-6 h-6 text-red-500" />;
      case 'docx':
        return <FiFileText className="w-6 h-6 text-blue-500" />;
      case 'web':
        return <FiGlobe className="w-6 h-6 text-green-500" />;
      default:
        return <FiFile className="w-6 h-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!details || !details.source) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Content source not found</h2>
        <button
          onClick={() => navigate('/dashboard/content-sources')}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Back to Sources
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/content-sources')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            {getSourceIcon(details.source.type)}
            <div>
              <h1 className="text-2xl font-bold text-black">{details.source.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {details.source.type.toUpperCase()}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <FiCalendar className="w-4 h-4 mr-1" />
                  {new Date(details.source.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <FiFileText className="w-4 h-4 mr-1" />
                  {details.chunks?.length || 0} sections
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {!details.chunks || details.chunks.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content chunks found</h3>
              <p className="text-gray-500">
                This source doesn't have any extracted content chunks.
              </p>
            </div>
          ) : (
            details.chunks.map((chunk, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black">{chunk.label}</h3>
                  {chunk.page && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Page {chunk.page}
                    </span>
                  )}
                </div>
                <div className="text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                  {chunk.content.substring(0, 500)}
                  {chunk.content.length > 500 && '...'}
                </div>
                {chunk.section_type && (
                  <div className="mt-3">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {chunk.section_type}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentSourceView;
