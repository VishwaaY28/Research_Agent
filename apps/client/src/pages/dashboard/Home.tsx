import React from 'react';
import { FiFolder, FiFileText, FiEdit, FiTag, FiTrendingUp, FiClock, FiArrowRight, FiPlus, FiStar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { 
      label: 'Workspaces', 
      value: '12', 
      icon: FiFolder, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Active Proposals', 
      value: '8', 
      icon: FiFileText, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      label: 'Draft Sections', 
      value: '24', 
      icon: FiEdit, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: 'Popular Tags', 
      value: '15', 
      icon: FiTag, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  const recentProposals = [
    {
      id: '1',
      title: 'Marketing Campaign Proposal Q2',
      status: 'In Progress',
      lastModified: '2 hours ago',
      progress: 75,
      priority: 'high'
    },
    {
      id: '2',
      title: 'Technical Architecture Document',
      status: 'Draft',
      lastModified: '1 day ago',
      progress: 45,
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Client Onboarding Process',
      status: 'Review',
      lastModified: '3 days ago',
      progress: 90,
      priority: 'low'
    },
    {
      id: '4',
      title: 'Budget Allocation Proposal 2025',
      status: 'Draft',
      lastModified: '1 week ago',
      progress: 30,
      priority: 'medium'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Review': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-black mb-2">
            Welcome back.
          </h1>
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
                  <div className="flex items-center mt-2 text-green-600">
                    <FiTrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">+12%</span>
                  </div>
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
                    <h2 className="text-xl font-semibold text-black">Recent Proposals</h2>
                    <p className="text-neutral-600 text-sm mt-1">Track your latest work and progress</p>
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
                <div className="space-y-4">
                  {recentProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      onClick={() => navigate(`/dashboard/proposal-authoring/${proposal.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <FiStar className={`w-4 h-4 mr-2 ${getPriorityColor(proposal.priority)}`} />
                            <h3 className="font-medium text-black">{proposal.title}</h3>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(proposal.status)}`}>
                              {proposal.status}
                            </span>
                            <div className="flex items-center text-sm text-neutral-500">
                              <FiClock className="w-4 h-4 mr-1" />
                              {proposal.lastModified}
                            </div>
                          </div>
                        </div>
                        <FiArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-600">Progress</span>
                          <span className="text-black font-medium">{proposal.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${proposal.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  onClick={() => navigate('/dashboard/proposal-authoring/create-proposal')}
                  className="w-full p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <div className="flex items-center">
                    <FiPlus className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <span className="font-medium block">New Proposal</span>
                      <span className="text-white/80 text-sm">Start fresh</span>
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

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">This Week</h3>
                <p className="text-sm text-neutral-600 mt-1">Your productivity insights</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-neutral-600">Proposals Created</span>
                  </div>
                  <span className="font-semibold text-black">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
                    <span className="text-neutral-600">Content Processed</span>
                  </div>
                  <span className="font-semibold text-black">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-neutral-600">Collaborators</span>
                  </div>
                  <span className="font-semibold text-black">5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;