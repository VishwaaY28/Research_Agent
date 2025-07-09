import React, { useEffect } from 'react';
import {
  FiArrowRight,
  FiClock,
  FiEdit,
  FiFileText,
  FiFolder,
  FiPlus,
  FiTag,
  FiUser,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardData, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
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

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="text-center py-20">
            <p className="text-red-600">Error loading dashboard: {error}</p>
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
      label: 'Saved Prompts',
      value: dashboardData?.stats.total_prompts?.toString() || '0',
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
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-black mb-2">Welcome back.</h1>
          <p className="text-neutral-600 text-lg">
            Here's your workspace overview and recent activity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-600 text-sm font-medium uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-black mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Recently Generated</h2>
                    <p className="text-neutral-600 text-sm mt-1">
                      Your latest AI-generated content
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/proposal-authoring')}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    View all
                  </button>
                </div>
              </div>
              <div className="p-6">
                {dashboardData?.recent_generated_content &&
                dashboardData.recent_generated_content.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recent_generated_content.map((content) => (
                      <div
                        key={content.id}
                        onClick={() => navigate(`/dashboard/workspaces/${content.workspace_id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="font-medium text-black">{content.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {content.content_preview}
                            </p>
                            <div className="flex items-center space-x-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                {content.workspace_name}
                              </span>
                              <div className="flex items-center text-sm text-neutral-500">
                                <FiUser className="w-4 h-4 mr-1" />
                                {content.user_name}
                              </div>
                              <div className="flex items-center text-sm text-neutral-500">
                                <FiClock className="w-4 h-4 mr-1" />
                                {formatTimeAgo(content.created_at)}
                              </div>
                            </div>
                          </div>
                          <FiArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No generated content yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Start creating proposals to see your recent work here
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/workspaces')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      Browse Workspaces
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">Quick Actions</h3>
                <p className="text-sm text-neutral-600 mt-1">Jump into your workflow</p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => navigate('/dashboard/workspaces/create')}
                  className="w-full p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <div className="flex items-center">
                    <FiPlus className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <span className="font-medium block">New Workspace</span>
                      <span className="text-white/80 text-sm">Start organizing content</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/dashboard/content-ingestion')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-center">
                    <FiFolder className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <span className="font-medium text-black block">Upload Content</span>
                      <span className="text-neutral-600 text-sm">Add resources</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
