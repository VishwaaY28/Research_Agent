import React, { useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiClock,
  FiEdit,
  FiFileText,
  FiFolder,
  FiPlus,
  FiRefreshCw,
  FiTag,
  FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useContent, type GeneratedContent } from '../../hooks/useContent';
import { useDashboard } from '../../hooks/useDashboard';
import { useWorkspaceTypes } from '../../hooks/useWorkspaceTypes';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    fetchDashboardData,
  } = useDashboard();
  const { workspaceTypes } = useWorkspaceTypes();
  const {
    getWorkspaceGeneratedContent,
    loading: contentLoading,
    getGeneratedContentDetails,
  } = useContent();
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);
  const [contentLoaded, setContentLoaded] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch recent generated content from recent workspaces
  useEffect(() => {
    const fetchRecentContent = async () => {
      if (dashboardData?.recent_workspaces && dashboardData.recent_workspaces.length > 0) {
        try {
          // Get content from first 3 recent workspaces
          const workspacesToFetch = dashboardData.recent_workspaces.slice(0, 3);
          const contentPromises = workspacesToFetch.map((workspace) =>
            getWorkspaceGeneratedContent(workspace.id),
          );

          const results = await Promise.all(contentPromises);
          // Flatten and sort by date
          const allContent = results
            .flat()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5); // Take most recent 5

          setRecentContent(allContent);
        } catch (err) {
          console.error('Error fetching recent content:', err);
        }
      }
      setContentLoaded(true);
    };

    if (dashboardData && !contentLoaded) {
      fetchRecentContent();
    }
  }, [dashboardData, contentLoaded, getWorkspaceGeneratedContent]);

  if (dashboardLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="text-center py-20">
            <p className="text-red-600">Error loading dashboard: {dashboardError}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Workspaces',
      value: dashboardData?.stats.total_workspaces?.toString() || '0',
      icon: FiFolder,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Content Chunks',
      value: dashboardData?.stats.total_sections?.toString() || '0',
      icon: FiFileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Workspace Types',
      value: workspaceTypes?.length.toString() || '0',
      icon: FiEdit,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Generated Content',
      value: dashboardData?.stats.total_generated_content?.toString() || '0',
      icon: FiTag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks} weeks ago`;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black mb-1">Welcome back.</h1>
            <p className="text-neutral-600 text-base">
              Here's your workspace overview and recent activity.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-full hover:bg-primary/10 transition-colors"
            title="Refresh dashboard stats"
            aria-label="Refresh"
          >
            <FiRefreshCw className="w-5 h-5 text-primary" />
          </button>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-4"
          style={{ gridAutoColumns: 'minmax(120px,1fr)' }}
        >
          {/* {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-1.5 border border-gray-200 min-w-[120px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-600 text-xs font-medium uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-black mt-0.5">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-1.5 rounded-lg`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))} */}
        </div>

        {/* Quick Actions & Recently Used Workspaces side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Quick Actions (1/3 width) */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col md:col-span-1">
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-xs text-gray-600 mt-0.5">Access frequently used features</p>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <button
                onClick={() => navigate('/dashboard/workspaces?create=1')}
                className="group relative p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-white"
              >
                <div className="flex items-center gap-2 text-left w-full">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shadow-sm flex-shrink-0">
                    <FiPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900 text-xs group-hover:text-blue-600">
                      New Workspace
                    </h4>
                    <p className="text-xs text-gray-600 group-hover:text-gray-700">
                      {/* Create new */}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate('/dashboard/prompt-templates')}
                className="group relative p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-white"
              >
                <div className="flex items-center gap-2 text-left w-full">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shadow-sm flex-shrink-0">
                    <FiEdit className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900 text-xs group-hover:text-blue-600">
                      View Prompts
                    </h4>
                    {/* <p className="text-xs text-gray-600 group-hover:text-gray-700">Prompts</p> */}
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate('/dashboard/content-ingestion')}
                className="group relative p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-white"
              >
                <div className="flex items-center gap-2 text-left w-full">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shadow-sm flex-shrink-0">
                    <FiFileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900 text-xs group-hover:text-blue-600">
                      Upload Content
                    </h4>
                    {/* <p className="text-xs text-gray-600 group-hover:text-gray-700">Upload</p> */}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recently Used Workspaces (2/3 width) */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col md:col-span-2">
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recently Used Workspaces
                  </h2>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Quick access to your active workspaces
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/workspaces')}
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-xs font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 flex items-center gap-2 shadow-sm"
                >
                  View all
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 flex-1">
              {dashboardData?.recent_workspaces && dashboardData.recent_workspaces.length > 0 ? (
                <div className="grid gap-2">
                  {dashboardData.recent_workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => navigate(`/dashboard/workspaces/${ws.id}`)}
                      className="group p-3 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <div className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <FiFolder className="w-4 h-4" />
                              </div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-sm">
                                {ws.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <FiFileText className="w-4 h-4 text-gray-400" />
                                Client: {ws.client}
                              </div>
                              <div className="flex items-center gap-1">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                {ws.last_used_at ? formatTimeAgo(ws.last_used_at) : 'Never used'}
                              </div>
                            </div>
                          </div>
                          <div className="transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
                            <FiArrowRight className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiFolder className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    No recently used workspaces
                  </h3>
                  <p className="text-gray-600 mb-3 max-w-sm mx-auto text-xs">
                    Create your first workspace to start organizing your content effectively
                  </p>
                  <button
                    onClick={() => navigate('/dashboard/workspaces?create=1')}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-sm hover:shadow flex items-center gap-2 mx-auto text-xs"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recently Generated Content (full width) */}
        <div className="mt-2">
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recently Generated Content
                  </h2>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Quick access to your recent generations
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              {contentLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentContent && recentContent.length > 0 ? (
                <div className="space-y-2">
                  {recentContent.map((content) => (
                    <div
                      key={content.id}
                      onClick={() => {
                        if (content.prompt_id) {
                          navigate('/dashboard/workspaces');
                        }
                      }}
                      className="group p-3 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl hover:border-blue-500/30 hover:shadow-md cursor-pointer transition-all duration-200 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <div className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                                <FiZap className="w-4 h-4" />
                              </div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                                {content.prompt_title || 'Generated Content'}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                {content.created_at
                                  ? formatTimeAgo(content.created_at)
                                  : 'Recently'}
                              </div>
                              {content.tags && content.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <FiTag className="w-4 h-4 text-gray-400" />
                                  <div className="flex gap-1 flex-wrap">
                                    {content.tags.slice(0, 2).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-gray-100 px-1 py-0.5 rounded"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                    {content.tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{content.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Display content with markdown support */}
                            <div className="mt-1 text-xs text-gray-600 line-clamp-2 prose prose-xs max-w-none">
                              <ReactMarkdown>
                                {content.content.substring(0, 150) +
                                  (content.content.length > 150 ? '...' : '')}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <div className="transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
                            <FiArrowRight className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiZap className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    No recently generated content
                  </h3>
                  <p className="text-gray-600 mb-3 text-xs max-w-sm mx-auto">
                    Start generating content in your workspaces to see it here
                  </p>
                  <button
                    onClick={() => navigate('/dashboard/workspaces')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow flex items-center gap-2 mx-auto text-xs"
                  >
                    <FiFolder className="w-4 h-4" />
                    <span>Go to Workspaces</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
