import React, { useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiLayers,
  FiLogOut,
  FiSettings,
  FiUpload
} from 'react-icons/fi';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import hlogo from '../../assets/H_logo.png';
import logo from '../../assets/HexawareBlueLogo 2.png';
import { useAuth } from '../../hooks/useAuth';
import PromptTemplateModal from './PromptTemplateModal';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showPromptTemplateModal, setShowPromptTemplateModal] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiLayers },
    { path: '/dashboard/content-ingestion', label: 'Content Ingestion', icon: FiUpload },
    { path: '/dashboard/workspaces', label: 'Workspaces', icon: FiFolder },
    { path: '/dashboard/prompt-templates', label: 'Prompt Templates', icon: FiSettings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-200`}
      >
        <div
          className={`flex items-center justify-between p-6 border-b border-gray-200 ${collapsed ? 'justify-center p-2' : ''}`}
        >
          {!collapsed && (
            <div className="flex flex-col items-center space-y-1 w-full">
              <img src={logo} alt="Logo" className="h-5 w-auto transition-all duration-200" />
              <span className="text-base font-semibold mt-1">HexAuthor</span>
            </div>
          )}
          {/* No logo when collapsed */}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${collapsed ? '' : 'ml-2'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <div className="flex items-center space-x-1">
                <img src={hlogo} alt="H Logo" className="h-5 w-auto transition-all duration-200" />
                <FiChevronRight />
              </div>
            ) : (
              <FiChevronLeft />
            )}
          </button>
        </div>

        <nav className="flex-1 p-4">

          <ul className="space-y-1">

            {navItems.map((item) => {
              const IconComponent = item.icon;
              if (item.isPromptTemplate) {
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => setShowPromptTemplateModal(true)}
                      className={`flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors text-neutral-700 hover:bg-gray-100 w-full`}
                    >
                      <IconComponent className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => {
                      const isWorkspaceActive =
                        item.path === '/dashboard/workspaces' &&
                        (location.pathname.startsWith('/dashboard/workspaces') ||
                          location.pathname.startsWith('/dashboard/proposal-authoring'));
                      const active = isActive || isWorkspaceActive;
                      return `relative flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-200 shadow-sm ${
                        active
                          ? 'bg-gradient-to-l from-indigo-50 to-white text-indigo-700 font-semibold'
                          : 'text-neutral-700 hover:bg-gray-50'
                      }`;
                    }}
                    end={item.path === '/dashboard'}
                  >
                    {({ isActive }) => {
                      const isWorkspaceActive =
                        item.path === '/dashboard/workspaces' &&
                        (location.pathname.startsWith('/dashboard/workspaces') ||
                          location.pathname.startsWith('/dashboard/proposal-authoring'));
                      const active = isActive || isWorkspaceActive;
                      return (
                        <>
                          {active && !collapsed && (
                            <div className="absolute left-0 top-2 bottom-2 border-l-4 border-indigo-500 rounded-r-lg"></div>
                          )}
                          <IconComponent
                            className={`w-5 h-5 z-10 ${
                              collapsed
                                ? active
                                  ? 'mx-auto text-indigo-500 drop-shadow'
                                  : 'mx-auto text-neutral-700'
                                : active
                                  ? 'text-indigo-700 drop-shadow'
                                  : 'text-neutral-700'
                            }`}
                          />
                          {!collapsed && <span className="font-medium z-10">{item.label}</span>}
                        </>
                      );
                    }}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {user && !collapsed && (
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
        {/* Prompt Template Modal */}
        <PromptTemplateModal
          isOpen={showPromptTemplateModal}
          onClose={() => setShowPromptTemplateModal(false)}
        />
      </aside>
    </>
  );
};

export default Sidebar;
