import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, BarChart3, ChevronDown, ChevronRight, FileCheck, Users, UserPlus, Shield, Lock, UserCheck, Activity, Clock, FilePlus, ClipboardList, CheckSquare, CheckCircle, Home, Menu, X, LogOut } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu, isCollapsed, setIsCollapsed }) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Icon mapping object
  const iconMap = {
    Home,
    BarChart3,
    FileCheck,
    Users,
    UserPlus,
    Shield,
    Lock,
    UserCheck,
    Activity,
    Clock,
    FilePlus,
    ClipboardList,
    CheckSquare,
    CheckCircle,
    Settings
  };

  useEffect(() => {
    fetchUserMenu();
  }, []);

  const fetchUserMenu = async () => {
    try {
      setLoading(true);
      console.log('=== Starting fetchUserMenu ===');
      
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.error('No user found in localStorage');
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      console.log('User from localStorage:', user);
      
      const userId = user._id || user.id;
      console.log('User ID being sent to API:', userId);

      if (!userId) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      // Fetch user privileges
      console.log('Fetching user privileges for:', userId);
      const privilegeResponse = await fetch(`/api/user-privileges/${userId}`);
      console.log('Privilege response status:', privilegeResponse.status);
      
      // Handle 404 - no privileges found
      if (privilegeResponse.status === 404) {
        console.warn('No privileges found for this user. User may not have any permissions assigned.');
        setMenuItems([]);
        setLoading(false);
        return;
      }
      
      if (!privilegeResponse.ok) {
        const errorText = await privilegeResponse.text();
        console.error('Privilege response error:', errorText);
        throw new Error('Failed to fetch user privileges');
      }

      const privilegeData = await privilegeResponse.json();
      console.log('Privilege data:', privilegeData);
      
      const permissionIds = privilegeData.permissions || [];
      console.log('Permission IDs count:', permissionIds.length);
      console.log('Permission IDs:', permissionIds);

      if (permissionIds.length === 0) {
        console.log('No permissions found for user');
        setMenuItems([]);
        setLoading(false);
        return;
      }

      // Fetch all permissions that user has access to
      console.log('Fetching permissions...');
      const permissionsResponse = await fetch('/api/permissions/user-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionIds })
      });

      console.log('Permissions response status:', permissionsResponse.status);

      if (!permissionsResponse.ok) {
        const errorText = await permissionsResponse.text();
        console.error('Permissions response error:', errorText);
        throw new Error('Failed to fetch permissions');
      }

      const permissions = await permissionsResponse.json();
      console.log('Permissions fetched:', permissions.length);
      console.log('Permissions data:', permissions);

      // Fetch all categories
      console.log('Fetching categories...');
      const categoriesResponse = await fetch('/api/permissions/menu-categories');
      console.log('Categories response status:', categoriesResponse.status);
      
      if (!categoriesResponse.ok) {
        const errorText = await categoriesResponse.text();
        console.error('Categories response error:', errorText);
        throw new Error('Failed to fetch categories');
      }

      const categories = await categoriesResponse.json();
      console.log('Categories fetched:', categories.length);
      console.log('Categories data:', categories);

      // Build menu structure
      console.log('Building menu structure...');
      const menu = buildMenuStructure(categories, permissions);
      console.log('Built menu items:', menu.length);
      console.log('Built menu:', menu);
      setMenuItems(menu);
      
      console.log('=== fetchUserMenu completed successfully ===');

    } catch (error) {
      console.error('Error fetching user menu:', error);
      console.error('Error stack:', error.stack);
      setMenuItems([]);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const buildMenuStructure = (categories, permissions) => {
    const menu = [];

    console.log('Building menu with categories:', categories);
    console.log('Building menu with permissions:', permissions);

    // Sort categories by position
    const sortedCategories = categories
      .filter(cat => cat.status === 'active')
      .sort((a, b) => a.position - b.position);

    console.log('Sorted active categories:', sortedCategories);

    sortedCategories.forEach(category => {
      console.log(`Processing category: ${category.name}`);
      
      // Get permissions for this category
      const categoryPermissions = permissions
        .filter(perm => {
          const matches = perm.category === category.name && perm.status === 'active';
          if (matches) {
            console.log(`  - Permission matched: ${perm.label}`);
          }
          return matches;
        })
        .sort((a, b) => (a.subPosition || 0) - (b.subPosition || 0));

      console.log(`Category "${category.name}" has ${categoryPermissions.length} permissions`);

      // Only add category to menu if it has at least 1 sub-item
      if (categoryPermissions.length > 0) {
        const subItems = categoryPermissions.map(perm => ({
          id: perm.pagename ? perm.pagename.replace('.jsx', '').replace(/([A-Z])/g, (match, p1, offset) => 
            offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase()
          ) : perm._id,
          label: perm.label || perm.subCategory,
          icon: iconMap[perm.icon] || FileCheck,
          pagename: perm.pagename
        }));

        menu.push({
          id: category.name.toLowerCase().replace(/\s+/g, '-'),
          icon: iconMap[category.icon] || Settings,
          label: category.name,
          subItems: subItems
        });
      }
    });

    return menu;
  };

  const toggleSubmenu = (menuId) => {
    if (!isCollapsed) {
      setExpandedMenus(prev => ({
        ...prev,
        [menuId]: !prev[menuId]
      }));
    }
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login page
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-b from-gray-800 to-gray-900 text-white flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className={`p-6 flex items-center border-b border-gray-700 ${
          isCollapsed ? 'justify-center' : 'gap-3'
        }`}>
          {!isCollapsed && (
            <>
              <Settings className="text-cyan-400" size={24} />
              <span className="font-bold text-lg">Credit Ratings Model</span>
            </>
          )}
          {isCollapsed && <Settings className="text-cyan-400" size={24} />}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-sm">{isCollapsed ? '...' : 'Loading menu...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-b from-gray-800 to-gray-900 text-white flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header with Logo */}
      <div className={`p-6 flex items-center border-b border-gray-700 ${
        isCollapsed ? 'justify-center' : 'gap-3'
      }`}>
        {!isCollapsed && (
          <>
            <Settings className="text-cyan-400" size={24} />
            <span className="font-bold text-lg">Credit Ratings Model</span>
          </>
        )}
        {isCollapsed && <Settings className="text-cyan-400" size={24} />}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Home Button - Always visible at top */}
        <button
          onClick={() => window.location.reload()}
          className={`w-full flex items-center gap-3 px-6 py-3 transition-colors hover:bg-gray-700/50 mb-2 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Home' : ''}
        >
          <Home size={18} />
          {!isCollapsed && <span className="text-sm font-medium">Home</span>}
        </button>

        {menuItems.length === 0 ? (
          !isCollapsed && (
            <div className="px-6 py-4 text-gray-400 text-sm">
              No menu items available
            </div>
          )
        ) : (
          menuItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.id];
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      if (isCollapsed) {
                        // If collapsed and has subitems, expand sidebar first
                        setIsCollapsed(false);
                        setExpandedMenus(prev => ({ ...prev, [item.id]: true }));
                      } else {
                        toggleSubmenu(item.id);
                      }
                    } else {
                      setActiveMenu(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${
                    activeMenu === item.id && !hasSubItems
                      ? 'bg-gray-700 border-l-4 border-cyan-400'
                      : 'hover:bg-gray-700/50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <Icon size={18} />
                    {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {!isCollapsed && hasSubItems && (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {!isCollapsed && hasSubItems && isExpanded && (
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
          })
        )}
      </nav>

      {/* Logout Button - Always visible at bottom */}
      <div className="border-t border-gray-700">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-6 py-4 transition-colors hover:bg-red-600/20 text-red-400 hover:text-red-300 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;