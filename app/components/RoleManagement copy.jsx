import React, { useState, useEffect } from 'react';
import { Shield, Save, X, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';

const RoleManagement = () => {
  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    permissions: [],
    status: 'active'
  });

  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRoles, setIsFetchingRoles] = useState(true);
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);

  // Group permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  // Sort categories by position, then sort permissions within each category
  const sortedCategories = Object.keys(groupedPermissions).sort((a, b) => {
    const posA = groupedPermissions[a][0]?.position || 0;
    const posB = groupedPermissions[b][0]?.position || 0;
    return posA - posB;
  });

  // Sort permissions within each category by subPosition
  sortedCategories.forEach(category => {
    groupedPermissions[category].sort((a, b) => (a.subPosition || 0) - (b.subPosition || 0));
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setIsFetchingPermissions(true);
      const response = await fetch('/api/permissions');
      const data = await response.json();
      
      if (response.ok) {
        // Filter only active permission records (type: "permission", not "category")
        const activePermissions = (data.permissions || [])
          .filter(p => p.type === 'permission' && p.status === 'active')
          .map(p => ({
            id: typeof p._id === 'object' ? p._id.toString() : p._id,
            label: p.subCategory, // Use subCategory as the label
            category: p.category,
            position: p.position || 0,
            subPosition: p.subPosition || 0,
            pagename: p.pagename
          }));
        
        console.log('Fetched permissions:', activePermissions);
        setAvailablePermissions(activePermissions);
      } else {
        console.error('Failed to fetch permissions');
        setAvailablePermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setAvailablePermissions([]);
    } finally {
      setIsFetchingPermissions(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setIsFetchingRoles(true);
      const response = await fetch('/api/roles');
      const data = await response.json();
      
      if (response.ok) {
        setRoles(data.roles || []);
      } else {
        console.error('Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setIsFetchingRoles(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId];
      
      return { ...prev, permissions };
    });
    
    if (errors.permissions) {
      setErrors(prev => ({ ...prev, permissions: '' }));
    }
  };

  const handleSelectAllInCategory = (category) => {
    const categoryPermissions = groupedPermissions[category].map(p => p.id);
    const allSelected = categoryPermissions.every(id => formData.permissions.includes(id));
    
    setFormData(prev => {
      const permissions = allSelected
        ? prev.permissions.filter(id => !categoryPermissions.includes(id))
        : [...new Set([...prev.permissions, ...categoryPermissions])];
      
      return { ...prev, permissions };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.roleName.trim()) {
      newErrors.roleName = 'Role name is required';
    }
    
    if (formData.permissions.length === 0) {
      newErrors.permissions = 'Please select at least one permission';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const url = isEditing ? `/api/roles/${editingRoleId}` : '/api/roles';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleName: formData.roleName,
          description: formData.description,
          permissions: formData.permissions,
          status: formData.status
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response');
        const text = await response.text();
        console.error('Response text:', text);
        setErrors({ general: 'Server error: Invalid response format. Check if API route exists.' });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'Role with this name already exists' });
        } else {
          setErrors({ general: data.error || `Failed to ${isEditing ? 'update' : 'create'} role` });
        }
        return;
      }

      setSuccessMessage(isEditing ? 'Role updated successfully!' : 'Role created successfully!');
      handleReset();
      fetchRoles();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving role:', error);
      setErrors({ general: `Network error: ${error.message}. Please check if the API route exists.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (role) => {
    const roleId = typeof role._id === 'object' ? role._id.toString() : role._id;
    
    setFormData({
      roleName: role.roleName,
      description: role.description || '',
      permissions: role.permissions || [],
      status: role.status || 'active'
    });
    setIsEditing(true);
    setEditingRoleId(roleId);
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (roleId) => {
    const id = typeof roleId === 'object' ? roleId.toString() : roleId;
    
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage('Role deleted successfully!');
        fetchRoles();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setErrors({ general: data.error || 'Failed to delete role' });
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleReset = () => {
    setFormData({
      roleName: '',
      description: '',
      permissions: [],
      status: 'active'
    });
    setErrors({});
    setIsEditing(false);
    setEditingRoleId(null);
  };

  // Helper function to get permission label by ID
  const getPermissionLabel = (permissionId) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    return permission ? permission.label : permissionId;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Role' : 'Create New Role'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Update role information and permissions' : 'Define a new role with specific permissions'}
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {errors.general && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{errors.general}</span>
        </div>
      )}

      {isFetchingPermissions ? (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-cyan-500 mr-2" size={24} />
            <span className="text-gray-600">Loading permissions...</span>
          </div>
        </div>
      ) : availablePermissions.length === 0 ? (
        <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">
            No permissions available. Please add subcategories in the Permission Management page first.
          </span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* Role Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-cyan-500" />
              Role Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.roleName ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="e.g., Administrator, Manager, Viewer"
                />
                {errors.roleName && <p className="text-red-500 text-sm mt-1">{errors.roleName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isLoading}
                  rows={3}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Shield size={20} className="text-cyan-500" />
                Permissions <span className="text-red-500">*</span>
              </h2>
              <span className="text-sm text-gray-600">
                {formData.permissions.length} selected
              </span>
            </div>
            
            {errors.permissions && (
              <p className="text-red-500 text-sm mb-3">{errors.permissions}</p>
            )}

            <div className="space-y-6">
              {sortedCategories.map((category) => {
                const permissions = groupedPermissions[category];
                const allSelected = permissions.every(p => formData.permissions.includes(p.id));
                
                return (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-800">{category}</h3>
                      <button
                        type="button"
                        onClick={() => handleSelectAllInCategory(category)}
                        disabled={isLoading}
                        className="text-sm text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {permissions.map(permission => (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-2 p-3 border rounded cursor-pointer transition-colors ${
                            formData.permissions.includes(permission.id)
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            disabled={isLoading}
                            className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-400"
                          />
                          <span className="text-sm text-gray-700">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEditing ? 'Update Role' : 'Create Role'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Roles</h2>
        
        {isFetchingRoles ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No roles found. Create your first role above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{role.roleName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {role.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        <div className="font-medium mb-1">
                          {role.permissions?.length || 0} permissions
                        </div>
                        <div className="text-xs text-gray-500 max-w-md">
                          {role.permissions?.slice(0, 3).map(permId => getPermissionLabel(permId)).join(', ')}
                          {role.permissions?.length > 3 && ` +${role.permissions.length - 3} more`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        role.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {role.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-cyan-600 hover:text-cyan-700"
                          title="Edit role"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(typeof role._id === 'object' ? role._id.toString() : role._id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete role"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;