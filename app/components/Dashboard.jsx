'use client';
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Wrench, Users, Heart, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import LandingPage from './LandingPage';

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('home');
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pageNames, setPageNames] = useState({
    'home': 'Home',
    'dashboard': 'Dashboard',
    'settings': 'Settings'
  });
  const [componentMap, setComponentMap] = useState({});
  const [loadedComponents, setLoadedComponents] = useState({});

  useEffect(() => {
    fetchPageNames();
  }, []);

    const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  const fetchPageNames = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.error('No user found in localStorage');
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user._id || user.id;

      if (!userId) {
        console.error('No user ID found');
        return;
      }

      const privilegeResponse = await fetch(`/api/user-privileges/${userId}`);
      
      if (privilegeResponse.status === 404) {
        console.warn('No privileges found for this user');
        return;
      }
      
      if (!privilegeResponse.ok) {
        throw new Error('Failed to fetch user privileges');
      }

      const privilegeData = await privilegeResponse.json();
      const permissionIds = privilegeData.permissions || [];

      if (permissionIds.length === 0) {
        console.log('No permissions found for user');
        return;
      }

      const permissionsResponse = await fetch('/api/permissions/user-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionIds })
      });

      if (!permissionsResponse.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const permissions = await permissionsResponse.json();

      const categoriesResponse = await fetch('/api/permissions/menu-categories');
      
      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categories = await categoriesResponse.json();

      const names = {
        'home': 'Home',
        'dashboard': 'Dashboard',
        'settings': 'Settings'
      };

      const compMap = {};

      categories.forEach(category => {
        const categoryId = category.name.toLowerCase().replace(/\s+/g, '-');
        names[categoryId] = category.name;
      });

      permissions.forEach(perm => {
        if (perm.pagename && perm.label) {
          const pageId = perm.pagename
            .replace('.jsx', '')
            .replace(/([A-Z])/g, (match, p1, offset) => 
              offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase()
            );
          
          names[pageId] = perm.label;
          
          compMap[pageId] = {
            pagename: perm.pagename,
            label: perm.label,
            componentName: perm.pagename.replace('.jsx', '')
          };
        }
      });

      names['edit-rating-assessment'] = 'Edit Credit Rating Assessment Template';

      setPageNames(names);
      setComponentMap(compMap);
      console.log('Page names loaded:', names);
      console.log('Component map loaded:', Object.keys(compMap));

    } catch (error) {
      console.error('Error fetching page names:', error);
    }
  };

  const getPageName = () => {
    return pageNames[activeMenu] || 'Home';
  };

  const loadComponent = async (pageId) => {
    if (loadedComponents[pageId]) {
      return loadedComponents[pageId];
    }

    const compInfo = componentMap[pageId];
    if (!compInfo) return null;

    try {
      console.log('📄 Loading component:', compInfo.componentName);
      
      const module = await import(`./${compInfo.componentName}.jsx`);
      const Component = module.default;

      setLoadedComponents(prev => ({
        ...prev,
        [pageId]: Component
      }));

      return Component;
    } catch (error) {
      console.error(`Failed to load component ${compInfo.componentName}:`, error);
      return null;
    }
  };


  const DynamicComponent = ({ pageId }) => {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const load = async () => {
        setLoading(true);
        const LoadedComponent = await loadComponent(pageId);
        setComponent(() => LoadedComponent);
        setLoading(false);
      };
      load();
    }, [pageId]);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading component...</p>
          </div>
        </div>
      );
    }

    if (!Component) {
      return (
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Component Not Found</h3>
            <p className="text-red-600">
              Could not load component for page: {pageId}
            </p>
          </div>
        </div>
      );
    }

    const compInfo = componentMap[pageId];
    
    if (compInfo.pagename === 'CreateRatingAssessment.jsx') {
      console.log('🎯 Rendering CreateRatingAssessment with:', {
        activeMenu,
        editingAssessmentId,
        isEditMode: activeMenu === 'edit-rating-assessment'
      });
      
      if (activeMenu === 'edit-rating-assessment' && editingAssessmentId) {
        return (
          <Component
            editMode={true}
            assessmentId={editingAssessmentId}
            onSaveSuccess={() => {
              console.log('✅ Save success - returning to list');
              setEditingAssessment(null);
              setEditingAssessmentId(null);
              setRefreshKey(prev => prev + 1);
              setActiveMenu('rating-assessment-list');
            }}
            onCancel={() => {
              console.log('❌ Edit cancelled - returning to list');
              setEditingAssessment(null);
              setEditingAssessmentId(null);
              setActiveMenu('rating-assessment-list');
            }}
          />
        );
      }
      
      return (
        <Component
          editMode={false}
          assessmentId={null}
          onSaveSuccess={() => {
            setEditingAssessment(null);
            setEditingAssessmentId(null);
            setRefreshKey(prev => prev + 1);
            setActiveMenu('rating-assessment-list');
          }}
          onCancel={() => {
            setEditingAssessment(null);
            setEditingAssessmentId(null);
            setActiveMenu('rating-assessment-list');
          }}
        />
      );
    }
    
    if (compInfo.pagename === 'RatingAssessmentList.jsx') {
      return (
        <Component
          refreshTrigger={refreshKey}
          onCreateNew={() => {
            console.log('📝 Create new clicked');
            setEditingAssessment(null);
            setEditingAssessmentId(null);
            setActiveMenu('create-rating-assessment');
          }}
          onEdit={(assessmentId) => {
            console.log('✏️ Edit clicked for ID:', assessmentId);
            setEditingAssessmentId(assessmentId);
            setActiveMenu('edit-rating-assessment');
          }}
        />
      );
    }
    
    if (compInfo.pagename === 'ApprovedTemplatesList.jsx') {
      return <Component key={refreshKey} />;
    }
    
    if (compInfo.pagename === 'ApprovalList.jsx') {
      return (
        <Component 
          key={refreshKey}
          onApprovalComplete={() => {
            setRefreshKey(prev => prev + 1);
          }}
        />
      );
    }
    
    if (compInfo.pagename === 'CustomerAssessmentEntry.jsx') {
      console.log('🎯 Rendering CustomerAssessmentEntry with editMode:', editingAssessment !== null);
      return (
        <Component 
          editMode={editingAssessment !== null}
          assessmentData={editingAssessment}
          onSaveSuccess={() => {
            console.log('✅ Customer assessment saved successfully');
            setEditingAssessment(null);
            setRefreshKey(prev => prev + 1);
            setActiveMenu('customer-assessment-list');
          }}
          onCancel={() => {
            console.log('❌ Customer assessment cancelled');
            setEditingAssessment(null);
            setActiveMenu('customer-assessment-list');
          }}
        />
      );
    }
    
    if (compInfo.pagename === 'CustomerAssessmentList.jsx') {
      console.log('📋 Rendering CustomerAssessmentList');
      return (
        <Component 
          refreshTrigger={refreshKey}
          onEdit={(assessment) => {
            console.log('✏️ CustomerAssessmentList Edit clicked:', assessment);
            setEditingAssessment(assessment);
            setActiveMenu('customer-assessment-entry');
          }}
          onCreateNew={() => {
            console.log('📝 CustomerAssessmentList Create new clicked');
            setEditingAssessment(null);
            setActiveMenu('customer-assessment-entry');
          }}
        />
      );
    }
    
    if (compInfo.pagename === 'CustomerAssessmentApprovals.jsx') {
      return (
        <Component 
          key={refreshKey}
          onEdit={(assessment) => {
            setEditingAssessment(assessment);
            setActiveMenu('customer-assessment-entry');
          }}
          onApprovalComplete={() => {
            setRefreshKey(prev => prev + 1);
          }}
        />
      );
    }
    
    return <Component />;
  };

  const renderContent = () => {
    console.log('🔍 Rendering content for activeMenu:', activeMenu);
    console.log('🔍 Current editingAssessment:', editingAssessment);
    
    if (componentMap[activeMenu]) {
      console.log('✅ Rendering dynamic component:', componentMap[activeMenu].label);
      return <DynamicComponent pageId={activeMenu} />;
    }

    switch (activeMenu) {
      case 'home':
        return <LandingPage onNavigate={setActiveMenu} />;
      
      case 'edit-rating-assessment':
        return <DynamicComponent pageId="create-rating-assessment" />;
      
      case 'settings':
        return (
          <div className="p-8">
            <div className="mb-6">
              <p className="text-gray-600 mt-1">Configure system settings</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Settings component coming soon...</p>
            </div>
          </div>
        );
      
      default:
        return <LandingPage onNavigate={setActiveMenu} />;
    }
  };

 return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 overflow-auto">
        <Header 
          pageName={getPageName()} 
          toggleSidebar={toggleSidebar}
        />
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;