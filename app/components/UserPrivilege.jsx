import React, { useState, useEffect, useRef } from 'react';
import { Search, Shield, User, Edit2, Save, X, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const UserPrivilege = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPrivilege, setUserPrivilege] = useState(null);
  const [customPermissions, setCustomPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const pageTopRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Get current logged-in user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setCurrentUser(userData.username);
        console.log('Current logged-in user:', userData.username);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setCurrentUser('unknown');
      }
    } else {
      console.warn('No user found in localStorage');
      setCurrentUser('unknown');
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/permissions')
      ]);

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();

      if (usersRes.ok) {
        setUsers(usersData.users || []);
      }
      if (rolesRes.ok) {
        setRoles(rolesData.roles || []);
      }
      if (permissionsRes.ok) {
        const filteredPermissions = (permissionsData.permissions || []).filter(
          p => p.type === 'permission'
        );
        setPermissions(filteredPermissions);
        
        const categories = {};
        filteredPermissions.forEach(p => {
          if (p.category) categories[p.category] = true;
        });
        setExpandedCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Log activity to the database
  const logActivity = async (description, action = 'User Privilege Management') => {
    if (!currentUser) {
      console.warn('No current user found for activity logging');
      return;
    }

    try {
      console.log('Logging activity:', { username: currentUser, description, action });
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser,
          description,
          action
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Activity logged successfully:', data);
      } else {
        console.error('Failed to log activity:', data);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't fail the main operation if logging fails
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setIsEditing(false);
    setSuccessMessage('');
    setErrorMessage('');
    
    if (user.privilegeDetails) {
      setUserPrivilege(user.privilegeDetails);
      setCustomPermissions(user.privilegeDetails.permissions || []);
    } else {
      setUserPrivilege(null);
      setCustomPermissions([]);
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setCustomPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleCategoryToggle = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSelectAllInCategory = (category, permissionIds) => {
    const allSelected = permissionIds.every(id => customPermissions.includes(id));
    
    setCustomPermissions(prev => {
      if (allSelected) {
        return prev.filter(id => !permissionIds.includes(id));
      } else {
        const newPermissions = [...prev];
        permissionIds.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      }
    });
  };

  const handleSavePrivileges = () => {
    if (!selectedUser) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    
    if (!selectedUser) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/userprivilege/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: customPermissions
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('User privileges updated successfully!');
        setIsEditing(false);
        
        // Update the userPrivilege state with the returned data
        const updatedPrivilege = data.privilege;
        const updatedPermissions = updatedPrivilege.permissions || [];
        
        setUserPrivilege(updatedPrivilege);
        setCustomPermissions(updatedPermissions);
        
        // Update the selected user's privilege details
        setSelectedUser(prev => ({
          ...prev,
          privilegeDetails: updatedPrivilege
        }));
        
        // Update users array with the new privilege details
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u._id === selectedUser._id 
              ? { ...u, privilegeDetails: updatedPrivilege }
              : u
          )
        );

        // Log the activity
        await logActivity(
          `Updated privileges for user: ${selectedUser.firstName} ${selectedUser.lastName} (@${selectedUser.username}) - Granted ${customPermissions.length} custom permissions`,
          'User Privilege Update'
        );

        // Scroll to top of User Privilege Management page
        setTimeout(() => {
          if (pageTopRef.current) {
            pageTopRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);

        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update privileges');
      }
    } catch (error) {
      console.error('Error saving privileges:', error);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.roleDetails?.roleName?.toLowerCase().includes(searchLower)
    );
  });

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  Object.keys(groupedPermissions).forEach(category => {
    groupedPermissions[category].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return (a.subPosition || 0) - (b.subPosition || 0);
    });
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
        <span className="ml-2 text-gray-600">Loading users and privileges...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div ref={pageTopRef} className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Privilege Management</h1>
          <p className="text-gray-600 mt-1">Manage and customize user permissions</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* User Selection Section */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={22} />
              Select User
            </h2>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="mx-auto mb-3 text-gray-300" size={48} />
                <p>No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleUserSelect(user)}
                    className={`p-4 border-2 rounded-lg hover:shadow-md transition-all text-left ${
                      selectedUser?._id === user._id
                        ? 'border-cyan-500 bg-cyan-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">@{user.username}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Shield size={14} className="text-cyan-500 flex-shrink-0" />
                          <span className="text-xs text-cyan-600 font-medium truncate">
                            {user.roleDetails?.roleName || 'No Role'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permissions Section */}
        {selectedUser && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500 mt-1">@{selectedUser.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Shield size={16} className="text-cyan-500" />
                      <span className="text-sm font-medium text-cyan-600">
                        {selectedUser.roleDetails?.roleName || 'No Role Assigned'}
                      </span>
                    </div>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors shadow-md"
                  >
                    <Edit2 size={18} />
                    Edit Privileges
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {isEditing && permissions.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Custom permissions will override the default role permissions. 
                    Changes will take effect immediately after saving.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Shield size={22} className="text-cyan-500" />
                  Permissions
                </h3>
                <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                  <span className="font-bold text-cyan-600">{customPermissions.length}</span> of{' '}
                  <span className="font-bold">{permissions.length}</span> permissions granted
                </div>
              </div>
              
              {permissions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="mx-auto mb-3 text-gray-300" size={48} />
                  <p>No permissions available. Please create permissions first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                    const isExpanded = expandedCategories[category];
                    const categoryPermissionIds = categoryPermissions.map(p => p._id);
                    const grantedCount = categoryPermissionIds.filter(id => 
                      customPermissions.includes(id)
                    ).length;
                    const allSelected = categoryPermissionIds.every(id => 
                      customPermissions.includes(id)
                    );
                    
                    return (
                      <div key={category} className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                        <div className="bg-gray-50">
                          <div className="flex items-center justify-between p-4">
                            <button
                              onClick={() => handleCategoryToggle(category)}
                              className="flex items-center gap-3 flex-1 text-left group"
                            >
                              {isExpanded ? (
                                <ChevronDown size={20} className="text-gray-600 group-hover:text-cyan-500 transition-colors" />
                              ) : (
                                <ChevronRight size={20} className="text-gray-600 group-hover:text-cyan-500 transition-colors" />
                              )}
                              <h4 className="font-semibold text-gray-800 text-lg">{category}</h4>
                              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                                {grantedCount}/{categoryPermissions.length}
                              </span>
                            </button>
                            {isEditing && (
                              <button
                                onClick={() => handleSelectAllInCategory(category, categoryPermissionIds)}
                                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors"
                              >
                                {allSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-white">
                            <div className="space-y-2">
                              {categoryPermissions.map((permission) => {
                                const isGranted = customPermissions.includes(permission._id);
                                
                                return (
                                  <div
                                    key={permission._id}
                                    className={`p-4 border-2 rounded-lg transition-all ${
                                      isGranted
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-200 bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3 flex-1">
                                        <input
                                          type="checkbox"
                                          checked={isGranted}
                                          onChange={() => handlePermissionToggle(permission._id)}
                                          disabled={!isEditing}
                                          className="w-5 h-5 text-cyan-500 rounded focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-800">
                                            {permission.label || permission.subCategory}
                                          </p>
                                          <p className="text-sm text-gray-500 mt-1">
                                            {permission.pagename}
                                          </p>
                                        </div>
                                      </div>
                                      {isGranted && (
                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isEditing && permissions.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        if (userPrivilege) {
                          setCustomPermissions(userPrivilege.permissions || []);
                        }
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePrivileges}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 shadow-md font-medium"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSave}
        title="Confirm Privilege Changes"
        message={`Are you sure you want to update privileges for ${selectedUser?.firstName} ${selectedUser?.lastName}? This will grant ${customPermissions.length} custom permissions.`}
        confirmText="Save Changes"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default UserPrivilege;