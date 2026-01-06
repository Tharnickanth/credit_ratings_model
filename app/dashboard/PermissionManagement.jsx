import React, { useState, useEffect } from 'react';
import { Lock, Save, X, Loader2, Trash2, Edit2, Plus, ArrowUp, ArrowDown } from 'lucide-react';

const PermissionManagement = () => {
  const [formData, setFormData] = useState({
    permissionId: '',
    label: '',
    category: '',
    position: 0,
    status: 'active'
  });

  const [permissions, setPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPermissionId, setEditingPermissionId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setIsFetchingPermissions(true);
      const response = await fetch('/api/permissions');
      const data = await response.json();
      
      if (response.ok) {
        setPermissions(data.permissions || []);
        // Extract unique categories
        const uniqueCategories = [...new Set(data.permissions.map(p => p.category))];
        setCategories(uniqueCategories.sort());
      } else {
        console.error('Failed to fetch permissions');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsFetchingPermissions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'position' ? parseInt(value) || 0 : value
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

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setShowNewCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.permissionId.trim()) {
      newErrors.permissionId = 'Permission ID is required';
    } else if (!/^[a-z_]+$/.test(formData.permissionId)) {
      newErrors.permissionId = 'Permission ID must be lowercase letters and underscores only';
    }
    
    if (!formData.label.trim()) {
      newErrors.label = 'Permission label is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
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
      const url = isEditing ? `/api/permissions/${editingPermissionId}` : '/api/permissions';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Response text:', text);
        setErrors({ general: 'Server error: Invalid response format.' });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'Permission with this ID already exists' });
        } else {
          setErrors({ general: data.error || `Failed to ${isEditing ? 'update' : 'create'} permission` });
        }
        return;
      }

      setSuccessMessage(isEditing ? 'Permission updated successfully!' : 'Permission created successfully!');
      handleReset();
      fetchPermissions();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving permission:', error);
      setErrors({ general: `Network error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (permission) => {
    const permissionId = typeof permission._id === 'object' ? permission._id.toString() : permission._id;
    
    setFormData({
      permissionId: permission.permissionId,
      label: permission.label,
      category: permission.category,
      position: permission.position || 0,
      status: permission.status || 'active'
    });
    setIsEditing(true);
    setEditingPermissionId(permissionId);
    setShowNewCategory(false);
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (permissionMongoId) => {
    const id = typeof permissionMongoId === 'object' ? permissionMongoId.toString() : permissionMongoId;
    
    if (!confirm('Are you sure you want to delete this permission? This will affect all roles using it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage('Permission deleted successfully!');
        fetchPermissions();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setErrors({ general: data.error || 'Failed to delete permission' });
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleUpdatePosition = async (permissionMongoId, newPosition) => {
    const id = typeof permissionMongoId === 'object' ? permissionMongoId.toString() : permissionMongoId;
    
    try {
      const permission = permissions.find(p => 
        (typeof p._id === 'object' ? p._id.toString() : p._id) === id
      );
      
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...permission,
          position: newPosition
        }),
      });

      if (response.ok) {
        fetchPermissions();
      }
    } catch (error) {
      console.error('Error updating position:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      permissionId: '',
      label: '',
      category: '',
      position: 0,
      status: 'active'
    });
    setErrors({});
    setIsEditing(false);
    setEditingPermissionId(null);
    setShowNewCategory(false);
    setNewCategory('');
  };

  // Group permissions by category and sort by position
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  // Sort permissions within each category by position
  Object.keys(groupedPermissions).forEach(category => {
    groupedPermissions[category].sort((a, b) => (a.position || 0) - (b.position || 0));
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Permission' : 'Create New Permission'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Update permission information' : 'Define a new permission for the system'}
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
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock size={20} className="text-cyan-500" />
            Permission Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="permissionId"
                value={formData.permissionId}
                onChange={handleChange}
                disabled={isLoading || isEditing}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.permissionId ? 'border-red-500' : 'border-gray-300'
                } ${isLoading || isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="e.g., users_view, roles_create"
              />
              {errors.permissionId && <p className="text-red-500 text-sm mt-1">{errors.permissionId}</p>}
              <p className="text-xs text-gray-500 mt-1">Use lowercase letters and underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.label ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="e.g., View Users, Create Roles"
              />
              {errors.label && <p className="text-red-500 text-sm mt-1">{errors.label}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={showNewCategory ? 'new' : formData.category}
                onChange={handleCategoryChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="new">+ Add New Category</option>
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {showNewCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="e.g., Dashboard, Reports"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <input
                type="number"
                name="position"
                value={formData.position}
                onChange={handleChange}
                disabled={isLoading}
                min="0"
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in the category</p>
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
          </div>
        </div>

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
                {isEditing ? 'Update Permission' : 'Create Permission'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permissions List Grouped by Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Permissions</h2>
        
        {isFetchingPermissions ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : permissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No permissions found. Create your first permission above.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPermissions).sort().map(([category, perms]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                  <span>{category}</span>
                  <span className="text-sm text-gray-500 font-normal">{perms.length} permissions</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {perms.map((perm, index) => (
                        <tr key={perm._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-700">{perm.position || 0}</span>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => handleUpdatePosition(perm._id, (perm.position || 0) - 1)}
                                  disabled={index === 0}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleUpdatePosition(perm._id, (perm.position || 0) + 1)}
                                  disabled={index === perms.length - 1}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                  title="Move down"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {perm.permissionId}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{perm.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              perm.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {perm.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(perm)}
                                className="text-cyan-600 hover:text-cyan-700"
                                title="Edit permission"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(perm._id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete permission"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionManagement;