import React from 'react';
import { FiEdit3, FiLayers, FiLogOut, FiUpload } from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiLayers },
    { path: '/dashboard/workspaces', label: 'Workspaces', icon: FiLayers },
    { path: '/dashboard/content-ingestion', label: 'Content Ingestion', icon: FiUpload },
    { path: '/dashboard/proposal-authoring', label: 'Proposal Authoring', icon: FiEdit3 },
    { path: '/dashboard/content-sources', label: 'Content Sources', icon: FiLayers },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-primary">ProposalCraft</h2>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'text-neutral-700 hover:bg-gray-100'
                    }`
                  }
                  end={item.path === '/dashboard'}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{user.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
