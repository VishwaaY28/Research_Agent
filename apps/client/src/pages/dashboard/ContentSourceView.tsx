/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCalendar,
  FiFile,
  FiFileText,
  FiGlobe,
  FiImage,
  FiTable,
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

type ContentChunk = {
  label: string;
  content: string;
  file_source?: string;
  page?: number;
  section_type?: string;
};

type SourceImage = {
  id: number;
  path: string;
  page_number?: number;
  caption?: string;
  ocr_text?: string;
};

type SourceTable = {
  id: number;
  path: string;
  page_number?: number;
  caption?: string;
  data?: string;
  extraction_method?: string;
};

type SourceDetails = {
  source: ContentSource;
  chunks: ContentChunk[];
  images: SourceImage[];
  tables: SourceTable[];
};

const ContentSourceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chunks' | 'images' | 'tables'>('chunks');
  const [selectedImage, setSelectedImage] = useState<SourceImage | null>(null);
  const [selectedTable, setSelectedTable] = useState<SourceTable | null>(null);

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
              </div>
            </div>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              {
                key: 'chunks',
                label: 'Content',
                icon: FiFileText,
                count: details.chunks?.length || 0,
              },
              { key: 'images', label: 'Images', icon: FiImage, count: details.images?.length || 0 },
              { key: 'tables', label: 'Tables', icon: FiTable, count: details.tables?.length || 0 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'chunks' && (
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
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!details.images || details.images.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
                <p className="text-gray-500">This source doesn't have any extracted images.</p>
              </div>
            ) : (
              details.images.map((image) => (
                <div key={image.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-center min-h-32">
                    <FiImage className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    {image.caption && (
                      <p className="text-sm text-gray-700 font-medium">{image.caption}</p>
                    )}
                    {image.page_number && (
                      <p className="text-xs text-gray-500">Page {image.page_number}</p>
                    )}
                    <button
                      onClick={() => setSelectedImage(image)}
                      className="w-full py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="space-y-4">
            {!details.tables || details.tables.length === 0 ? (
              <div className="text-center py-12">
                <FiTable className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
                <p className="text-gray-500">This source doesn't have any extracted tables.</p>
              </div>
            ) : (
              details.tables.map((table) => (
                <div key={table.id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FiTable className="w-5 h-5 text-gray-500" />
                      <div>
                        <h3 className="font-semibold text-black">
                          {table.caption || `Table ${table.id}`}
                        </h3>
                        {table.page_number && (
                          <p className="text-sm text-gray-500">Page {table.page_number}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {table.data && (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {table.data.substring(0, 300)}
                      {table.data.length > 300 && '...'}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedTable(table)}
                    className="mt-4 w-full py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    View Full Table
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">
                {selectedImage.caption || `Image ${selectedImage.id}`}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-center min-h-64">
              <FiImage className="w-32 h-32 text-gray-400" />
            </div>
            {selectedImage.ocr_text && (
              <div className="mt-4">
                <h4 className="font-medium text-black mb-2">Extracted Text</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  {selectedImage.ocr_text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">
                {selectedTable.caption || `Table ${selectedTable.id}`}
              </h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            {selectedTable.data && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedTable.data}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentSourceView;
