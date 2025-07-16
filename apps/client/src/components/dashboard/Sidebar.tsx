import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiDatabase, FiEdit3, FiFolder, FiLayers, FiLogOut, FiUpload } from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiLayers },
    { path: '/dashboard/content-ingestion', label: 'Content Ingestion', icon: FiUpload },
    { path: '/dashboard/workspaces', label: 'Workspaces', icon: FiFolder },
    { path: '/dashboard/proposal-authoring', label: 'Proposal Authoring', icon: FiEdit3 },
    { path: '/dashboard/content-sources', label: 'Content Sources', icon: FiDatabase },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-200`}
    >
      <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${collapsed ? 'justify-center p-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Logo" className="h-10 w-auto transition-all duration-200" />
            <span className="text-lg font-bold text-primary">Proposal Authoring</span>
          </div>
        )}
        {/* No logo when collapsed */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={`p-1 rounded hover:bg-gray-100 transition-colors ${collapsed ? '' : 'ml-2'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
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
                    `flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'text-neutral-700 hover:bg-gray-100'
                    }`
                  }
                  end={item.path === '/dashboard'}
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent
                        className={`w-5 h-5 ${
                          collapsed
                            ? isActive
                              ? 'mx-auto text-blue-300'
                              : 'mx-auto text-neutral-700'
                            : isActive
                              ? 'text-white'
                              : 'text-neutral-700'
                        }`}
                      />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </>
                  )}
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
    </aside>
  );
};

export default Sidebar;
