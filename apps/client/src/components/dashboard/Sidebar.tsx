import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import hlogo from '../../assets/H_logo.png';
import logo from '../../assets/HexawareBlueLogo 2.png';
import { useAuth } from '../../hooks/useAuth';
import PromptTemplateModal from './PromptTemplateModal';
import { SidebarIcons } from './SidebarIcons';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showPromptTemplateModal, setShowPromptTemplateModal] = useState(false);

  const [ingestionOpen, setIngestionOpen] = useState(
    location.pathname.startsWith('/dashboard/content-ingestion') ||
      location.pathname.startsWith('/dashboard/content-sources'),
  );

  // Collapse ingestion tree when navigating to any other sidebar tab
  React.useEffect(() => {
    if (
      !location.pathname.startsWith('/dashboard/content-ingestion') &&
      !location.pathname.startsWith('/dashboard/content-sources')
    ) {
      setIngestionOpen(false);
    }
  }, [location.pathname]);
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: SidebarIcons.dashboard },
    {
      label: 'Content Ingestion',
      icon: SidebarIcons.ingestion,
      isParent: true,
      open: ingestionOpen,
      onClick: () => {
        if (!ingestionOpen) {
          setIngestionOpen(true);
          navigate('/dashboard/content-ingestion');
        } else {
          setIngestionOpen(false);
        }
      },
      children: [
        {
          path: '/dashboard/content-ingestion',
          label: 'Ingest Content',
          icon: SidebarIcons.ingestion,
        },
        {
          path: '/dashboard/content-sources',
          label: 'Content Sources',
          icon: SidebarIcons.sources,
        },
      ],
    },
    { path: '/dashboard/workspaces', label: 'Workspaces', icon: SidebarIcons.workspaces },
    {
      path: '/dashboard/prompt-templates',
      label: 'Prompt Templates',
      icon: SidebarIcons.templates,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={`${collapsed ? 'w-16' : 'w-60'} h-full`}
        style={{ backgroundColor: '#f5f5f5', borderRight: '1px solid #e0e0e0' }}
      >
        <div
          className={`flex items-center justify-between p-6`}
          style={{
            borderBottom: '1px solid #e0e0e0',
            ...(collapsed ? { justifyContent: 'center', padding: '0.5rem' } : {}),
          }}
        >
          {!collapsed && (
            <div className="flex flex-col items-center space-y-1 w-full">
              <img src={logo} alt="Logo" className="h-5 w-auto transition-all duration-200" />
              <span className="text-base font-medium mt-1 tracking-wide text-gray-900">
                HexAuthor
              </span>
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
              if (item.isParent) {
                const IconComponent = item.icon;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={`flex items-center w-full ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-200 shadow-sm text-gray-900 hover:bg-[#e0e0e0] font-normal tracking-wide text-sm`}
                    >
                      <IconComponent
                        className={`w-5 h-5 text-gray-700 ${collapsed ? 'mx-auto' : ''}`}
                      />
                      {!collapsed && (
                        <span className="font-normal z-10 flex-1 text-left text-gray-900 text-sm">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && (
                        <span className="ml-auto">
                          {item.open ? <FiChevronLeft /> : <FiChevronRight />}
                        </span>
                      )}
                    </button>
                    {/* Children */}
                    {item.open && !collapsed && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <li key={child.path}>
                              <NavLink
                                to={child.path}
                                className={({ isActive }) =>
                                  `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                                    isActive
                                      ? 'bg-[#e0e0e0] text-gray-900 font-medium'
                                      : 'text-gray-900 hover:bg-[#e0e0e0] font-normal'
                                  }`
                                }
                              >
                                <ChildIcon className="w-4 h-4 text-gray-700" />
                                <span className="font-normal text-gray-900 text-xs">
                                  {child.label}
                                </span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              } else if (item.path) {
                const IconComponent = item.icon;
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
                        return `relative flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-200 shadow-sm text-sm font-normal ${
                          active
                            ? 'bg-[#e0e0e0] text-gray-900 font-medium'
                            : 'text-gray-900 hover:bg-[#e0e0e0] font-normal'
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
                              className={`w-5 h-5 z-10 text-gray-700 ${collapsed ? 'mx-auto' : ''}`}
                            />
                            {!collapsed && (
                              <span className="font-normal z-10 text-gray-900 text-sm">
                                {item.label}
                              </span>
                            )}
                          </>
                        );
                      }}
                    </NavLink>
                  </li>
                );
              } else {
                return null;
              }
            })}
          </ul>
        </nav>

        {user && !collapsed && (
          <div
            className="p-4"
            style={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}
          >
            <div className="flex items-center space-x-3 mb-3">
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal text-gray-900 truncate">{user.name}</p>
                <p className="text-xs font-normal text-gray-700 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-gray-900 hover:bg-gray-300 rounded-lg transition-colors font-normal"
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
