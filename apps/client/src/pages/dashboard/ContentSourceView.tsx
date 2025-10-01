import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiFile,
  FiFileText,
  FiGlobe,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { API } from '../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

type MinorChunk = {
  tag: string;
  content: Array<{
    text: string;
    page_number: number;
  }>;
  tags?: string[];
};

type StructuredChunk = {
  title: string;
  start_range: string;
  end_range: string;
  content: MinorChunk[];
  file_source?: string;
  tags?: string[];
};

type SimpleChunk = {
  content: string;
  label: string;
  file_source?: string;
  page?: number;
  section_type?: string;
  tags?: string[];
};

type Chunk = StructuredChunk | SimpleChunk;

type SourceDetails = {
  source: ContentSource;
  chunks: Chunk[];
};

const ContentSourceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [viewingChunk, setViewingChunk] = useState<Chunk | null>(null);

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

  const isStructuredChunk = (chunk: Chunk): chunk is StructuredChunk => {
    return 'title' in chunk && 'content' in chunk && Array.isArray(chunk.content);
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
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
              onClick={() => navigate('/dashboard/content-ingestion')}
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
            details.chunks.map((chunk: Chunk, index: number) =>
              isStructuredChunk(chunk) ? (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className={`p-4 cursor-pointer transition-colors ${
                      expandedSections.has(index) ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => toggleSection(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center">
                          <FiCheck className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{chunk.title}</h4>
                          <p className="text-sm text-gray-500">
                            {chunk.content.length} minor chunks • {chunk.start_range} -{' '}
                            {chunk.end_range}
                          </p>
                          {chunk.tags && chunk.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {chunk.tags.map((tag, tagIdx) => (
                                <span
                                  key={tagIdx}
                                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Set a state to view this chunk in a modal
                            setViewingChunk(chunk);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                          {expandedSections.has(index) ? (
                            <FiChevronDown className="w-4 h-4" />
                          ) : (
                            <FiChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {expandedSections.has(index) && (
                    <div className="border-t border-gray-200 bg-white">
                      {chunk.content.map((minor, minorIdx) => (
                        <div
                          key={minorIdx}
                          className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-4 h-4 mt-1 rounded border-2 border-gray-300 flex items-center justify-center">
                              <FiCheck className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800 mb-2">{minor.tag}</h5>
                              {minor.tags && minor.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {minor.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
                                      className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="text-sm text-gray-600 space-y-1">
                                {minor.content.slice(0, 2).map((content, contentIndex) => (
                                  <p key={contentIndex} className="line-clamp-2">
                                    {content.text.substring(0, 200)}
                                    {content.text.length > 200 && '...'}
                                  </p>
                                ))}
                                {minor.content.length > 2 && (
                                  <p className="text-gray-500 italic">
                                    +{minor.content.length - 2} more items
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 rounded border-2 border-gray-300 flex items-center justify-center">
                      <FiCheck className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {chunk.label || chunk.content.substring(0, 50) + '...'}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {(chunk as SimpleChunk).page && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              Page {(chunk as SimpleChunk).page}
                            </span>
                          )}
                          {(chunk as SimpleChunk).section_type && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              {(chunk as SimpleChunk).section_type}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingChunk(chunk);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {chunk.tags && chunk.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {chunk.tags.map((tag, tagIdx) => (
                            <span
                              key={tagIdx}
                              className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {chunk.content.substring(0, 300)}
                        {chunk.content.length > 300 && '...'}
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>

      {/* View Content Modal */}
      {viewingChunk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black">
                {isStructuredChunk(viewingChunk)
                  ? viewingChunk.title
                  : viewingChunk.label || 'Content Preview'}
              </h3>
              <button
                onClick={() => setViewingChunk(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isStructuredChunk(viewingChunk) ? (
                <div className="space-y-6">
                  <div className="pb-4 mb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">
                      Section Range: {viewingChunk.start_range} - {viewingChunk.end_range}
                    </p>
                    {viewingChunk.tags && viewingChunk.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingChunk.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {viewingChunk.content.map((minor, index) => (
                    <div key={index} className="border-l-4 border-primary/30 pl-4 py-2">
                      <h4 className="font-medium text-gray-900 mb-3">{minor.tag}</h4>
                      {minor.tags && minor.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {minor.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="space-y-3">
                        {minor.content.map((content, contentIdx) => (
                          <div key={contentIdx} className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {content.text}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Page {content.page_number}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {viewingChunk.tags && viewingChunk.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {viewingChunk.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{viewingChunk.content}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {viewingChunk.page && <p>Page: {viewingChunk.page}</p>}
                    {viewingChunk.section_type && <p>Type: {viewingChunk.section_type}</p>}
                    {viewingChunk.file_source && <p>Source: {viewingChunk.file_source}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentSourceView;
