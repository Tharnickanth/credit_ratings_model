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
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRoles, setIsFetchingRoles] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);

  // Available permissions list
  const availablePermissions = [
    { id: 'dashboard_view', label: 'View Dashboard', category: 'Dashboard' },
    { id: 'dashboard_edit', label: 'Edit Dashboard', category: 'Dashboard' },
    { id: 'users_view', label: 'View Users', category: 'User Management' },
    { id: 'users_create', label: 'Create Users', category: 'User Management' },
    { id: 'users_edit', label: 'Edit Users', category: 'User Management' },
    { id: 'users_delete', label: 'Delete Users', category: 'User Management' },
    { id: 'roles_view', label: 'View Roles', category: 'Role Management' },
    { id: 'roles_create', label: 'Create Roles', category: 'Role Management' },
    { id: 'roles_edit', label: 'Edit Roles', category: 'Role Management' },
    { id: 'roles_delete', label: 'Delete Roles', category: 'Role Management' },
    { id: 'permissions_manage', label: 'Manage Permissions', category: 'Role Management' },
    { id: 'credit_rating_view', label: 'View Credit Ratings', category: 'Credit Rating' },
    { id: 'credit_rating_approve', label: 'Approve Credit Ratings', category: 'Credit Rating' },
    { id: 'factor_level_view', label: 'View Factor Levels', category: 'Factor Level' },
    { id: 'factor_level_adjust', label: 'Adjust Factor Levels', category: 'Factor Level' },
    { id: 'settings_view', label: 'View Settings', category: 'Settings' },
    { id: 'settings_edit', label: 'Edit Settings', category: 'Settings' }
  ];

  // Group permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  useEffect(() => {
    fetchRoles();
  }, []);

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
      
      console.log('Submitting to:', url, 'with method:', method);
      console.log('Editing Role ID:', editingRoleId);
      
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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response');
        const text = await response.text();
        console.error('Response text:', text);
        setErrors({ general: 'Server error: Invalid response format. Check if API route exists.' });
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

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
    console.log('Editing role:', role);
    console.log('Role ID:', role._id);
    console.log('Role ID type:', typeof role._id);
    
    // Convert ObjectId to string if necessary
    const roleId = typeof role._id === 'object' ? role._id.toString() : role._id;
    console.log('Converted Role ID:', roleId);
    
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
    // Convert ObjectId to string if necessary
    const id = typeof roleId === 'object' ? roleId.toString() : roleId;
    console.log('Deleting role with ID:', id);
    
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
            {Object.entries(groupedPermissions).map(([category, permissions]) => {
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
                      <span className="text-sm text-gray-600">
                        {role.permissions?.length || 0} permissions
                      </span>
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