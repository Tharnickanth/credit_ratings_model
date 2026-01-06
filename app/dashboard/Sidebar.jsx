import React, { useState } from 'react';
import { Settings, BarChart3, ChevronDown, ChevronRight, Sliders, CheckSquare, FileCheck, Users, UserPlus, Shield, Lock, UserCheck, Activity, Clock } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const menuItems = [
    { 
      id: 'dashboard', 
      icon: BarChart3, 
      label: 'Dashboard' 
    },
    { 
      id: 'factor-level', 
      icon: Sliders, 
      label: 'Factor Level Adjustment',
      subItems: [
        { id: 'approval-list', label: 'Approval List', icon: CheckSquare }
      ]
    },
    { 
      id: 'credit-rating', 
      icon: FileCheck, 
      label: 'Credit Rating Assessment',
      subItems: [
        { id: 'approvals', label: 'Approvals', icon: CheckSquare }
      ]
    },
    { 
      id: 'user-role', 
      icon: Users, 
      label: 'User & Role Management',
      subItems: [
        { id: 'user-list', label: 'User List', icon: Users },
        { id: 'create-edit-user', label: 'Create User', icon: UserPlus },
        { id: 'role-management', label: 'Role Management', icon: Shield },
        { id: 'permission-management', label: 'Permission Management', icon: Lock },
        { id: 'assign-roles', label: 'Assign Roles to Users', icon: UserCheck },
        { id: 'activity-logs', label: 'User Activity Logs', icon: Activity },
        { id: 'login-history', label: 'Login History', icon: Clock }
      ]
    },
    { 
      id: 'settings', 
      icon: Settings, 
      label: 'Settings' 
    }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-700">
        <Settings className="text-cyan-400" size={24} />
        <span className="font-bold text-lg">Credit Ratings Model</span>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus[item.id];
          
          return (
            <div key={item.id}>
              {/* Main Menu Item */}
              <button
                onClick={() => {
                  if (hasSubItems) {
                    toggleSubmenu(item.id);
                  } else {
                    setActiveMenu(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-6 py-3 text-left transition-colors ${
                  activeMenu === item.id && !hasSubItems
                    ? 'bg-gray-700 border-l-4 border-cyan-400'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {hasSubItems && (
                  isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                )}
              </button>

              {/* Submenu Items */}
              {hasSubItems && isExpanded && (
                <div className="bg-gray-900/50">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveMenu(subItem.id)}
                        className={`w-full flex items-center gap-3 pl-14 pr-6 py-2.5 text-left transition-colors ${
                          activeMenu === subItem.id
                            ? 'bg-gray-700 border-l-4 border-cyan-400'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <SubIcon size={16} />
                        <span className="text-xs font-medium">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </div>
  );
};

export default Sidebar;