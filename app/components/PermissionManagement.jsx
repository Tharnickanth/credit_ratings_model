import React, { useState, useEffect } from 'react';
import { Lock, Save, X, Loader2, Trash2, Edit2, Search, FolderPlus, Layers } from 'lucide-react';

const PermissionManagement = () => {
  const [activeTab, setActiveTab] = useState('categories');
  
  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    position: '',
    icon: '',
    status: 'active'
  });
  
  // Permission Form State
  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    subPosition: '',
    icon: '',
    pagename: '',
    status: 'active'
  });

  const [categories, setCategories] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [permissions, searchTerm, categoryFilter]);

  const fetchCategories = async () => {
    try {
      setIsFetchingCategories(true);
      const response = await fetch('/api/permissions?type=category');
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...permissions];

    if (searchTerm) {
      filtered = filtered.filter(perm =>
        perm.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.pagename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(perm => perm.category === categoryFilter);
    }

    filtered.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.position !== b.position) return a.position - b.position;
      return a.subPosition - b.subPosition;
    });

    setFilteredPermissions(filtered);
  };

  const fetchPermissions = async () => {
    try {
      setIsFetchingPermissions(true);
      const response = await fetch('/api/permissions');
      const data = await response.json();
      
      if (response.ok) {
        setPermissions(data.permissions || []);
      } else {
        console.error('Failed to fetch permissions');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsFetchingPermissions(false);
    }
  };

  // Category handlers
  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
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

  const validateCategoryForm = () => {
    const newErrors = {};

    if (!categoryForm.name.trim()) {
      newErrors.name = 'Category name is required';
    }

    if (!categoryForm.position) {
      newErrors.position = 'Position is required';
    }

    if (!categoryForm.icon.trim()) {
      newErrors.icon = 'Icon name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCategoryForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const url = isEditing ? `/api/permissions/${editingItemId}` : '/api/permissions';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'category',
          ...categoryForm,
          position: parseInt(categoryForm.position)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'Category with this name already exists' });
        } else {
          setErrors({ general: data.error || `Failed to ${isEditing ? 'update' : 'create'} category` });
        }
        return;
      }

      setSuccessMessage(isEditing ? 'Category updated successfully!' : 'Category created successfully!');
      handleCategoryReset();
      fetchCategories();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ general: `Network error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      position: category.position?.toString() || '',
      icon: category.icon || '',
      status: category.status || 'active'
    });
    setIsEditing(true);
    setEditingItemId(typeof category._id === 'object' ? category._id.toString() : category._id);
    setSuccessMessage('');
  };

  const handleDeleteCategory = async (categoryId) => {
    const id = typeof categoryId === 'object' ? categoryId.toString() : categoryId;
    
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone if there are no related subcategories.')) {
      return;
    }

    try {
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Category deleted successfully!');
        fetchCategories();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ general: data.error || 'Failed to delete category' });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleCategoryReset = () => {
    setCategoryForm({
      name: '',
      description: '',
      position: '',
      icon: '',
      status: 'active'
    });
    setErrors({});
    setIsEditing(false);
    setEditingItemId(null);
  };

  // Permission handlers
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    if (!formData.subCategory.trim()) {
      newErrors.subCategory = 'Sub Category is required';
    }
    if (!formData.subPosition) {
      newErrors.subPosition = 'Sub Position is required';
    }
    if (!formData.icon.trim()) {
      newErrors.icon = 'Icon name is required';
    }
    if (!formData.pagename.trim()) {
      newErrors.pagename = 'Page name is required';
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
      // Get the position from the selected category
      const selectedCategory = categories.find(cat => cat.name === formData.category);
      const categoryPosition = selectedCategory ? selectedCategory.position : 1;

      const url = isEditing ? `/api/permissions/${editingItemId}` : '/api/permissions';
      const method = isEditing ? 'PUT' : 'POST';
      
      const label = formData.subCategory;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'permission',
          category: formData.category,
          subCategory: formData.subCategory,
          label: label,
          position: parseInt(categoryPosition),
          subPosition: parseInt(formData.subPosition),
          icon: formData.icon,
          pagename: formData.pagename,
          status: formData.status
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'Permission with this combination already exists' });
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
    setFormData({
      category: permission.category,
      subCategory: permission.subCategory,
      subPosition: permission.subPosition.toString(),
      icon: permission.icon || '',
      pagename: permission.pagename,
      status: permission.status || 'active'
    });
    setIsEditing(true);
    setEditingItemId(typeof permission._id === 'object' ? permission._id.toString() : permission._id);
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (permissionId) => {
    const id = typeof permissionId === 'object' ? permissionId.toString() : permissionId;
    
    if (!confirm('Are you sure you want to delete this permission?')) {
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

  const handleReset = () => {
    setFormData({
      category: '',
      subCategory: '',
      subPosition: '',
      icon: '',
      pagename: '',
      status: 'active'
    });
    setErrors({});
    setIsEditing(false);
    setEditingItemId(null);
  };

  return (
    <div className="p-8">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('categories');
              handleCategoryReset();
              handleReset();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'categories'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderPlus size={18} />
              Categories
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('permissions');
              handleCategoryReset();
              handleReset();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'permissions'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers size={18} />
              Subcategories & Permissions
            </div>
          </button>
        </nav>
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Edit Category' : 'Create New Category'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update category details' : 'Define a new category for organizing permissions'}
            </p>
          </div>

          {/* Category Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FolderPlus size={20} className="text-cyan-500" />
                Category Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={categoryForm.name}
                    onChange={handleCategoryChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Dashboard, User Management"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="position"
                    value={categoryForm.position}
                    onChange={handleCategoryChange}
                    disabled={isLoading}
                    min="1"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.position ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="1, 2, 3..."
                  />
                  {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="icon"
                    value={categoryForm.icon}
                    onChange={handleCategoryChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.icon ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., BarChart3, Users, FileCheck"
                  />
                  {errors.icon && <p className="text-red-500 text-sm mt-1">{errors.icon}</p>}
                  <p className="text-xs text-gray-500 mt-1">Use Lucide React icon names</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Brief description of this category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={categoryForm.status}
                    onChange={handleCategoryChange}
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
                onClick={handleCategoryReset}
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
                onClick={handleCategorySubmit}
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
                    {isEditing ? 'Update Category' : 'Create Category'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Existing Categories</h2>
            </div>
            
            {isFetchingCategories ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No categories found. Create your first category above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Icon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
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
                    {categories.sort((a, b) => (a.position || 0) - (b.position || 0)).map((category) => (
                      <tr key={category._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{category.position || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{category.icon || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{category.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            category.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {category.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-cyan-600 hover:text-cyan-700"
                              title="Edit category"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(typeof category._id === 'object' ? category._id.toString() : category._id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete category"
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
        </>
      )}
      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Edit Subcategory' : 'Create New Subcategory'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update subcategory details' : 'Define a new subcategory within a category'}
            </p>
          </div>

          {/* Permission Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lock size={20} className="text-cyan-500" />
                Subcategory Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={isLoading || categories.length === 0}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading || categories.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter(cat => cat.status === 'active')
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map(cat => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name} (Position: {cat.position})
                        </option>
                      ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  {categories.length === 0 && (
                    <p className="text-amber-600 text-sm mt-1">Please create a category first</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.subCategory ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., User List, Create User"
                  />
                  {errors.subCategory && <p className="text-red-500 text-sm mt-1">{errors.subCategory}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="subPosition"
                    value={formData.subPosition}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="1"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.subPosition ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="1, 2, 3..."
                  />
                  {errors.subPosition && <p className="text-red-500 text-sm mt-1">{errors.subPosition}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.icon ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Users, UserPlus, Shield"
                  />
                  {errors.icon && <p className="text-red-500 text-sm mt-1">{errors.icon}</p>}
                  <p className="text-xs text-gray-500 mt-1">Use Lucide React icon names</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pagename"
                    value={formData.pagename}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.pagename ? 'border-red-500' : 'border-gray-300'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Dashboard.jsx, UserList.jsx"
                  />
                  {errors.pagename && <p className="text-red-500 text-sm mt-1">{errors.pagename}</p>}
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
                disabled={isLoading || categories.length === 0}
                className={`flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors ${
                  isLoading || categories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
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
                    {isEditing ? 'Update Subcategory' : 'Create Subcategory'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Permissions List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Existing Subcategories</h2>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by category, subcategory, or page..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="all">All Categories</option>
                    {categories
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map(cat => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            
            {isFetchingPermissions ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
              </div>
            ) : filteredPermissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {permissions.length === 0 
                  ? 'No subcategories found. Create your first subcategory above.'
                  : 'No subcategories match your search criteria.'
                }
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sub Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sub Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Icon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Page Name
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
                    {filteredPermissions.map((permission) => (
                      <tr key={permission._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{permission.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{permission.subCategory}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{permission.subPosition}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{permission.icon || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{permission.pagename}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            permission.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {permission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(permission)}
                              className="text-cyan-600 hover:text-cyan-700"
                              title="Edit subcategory"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(typeof permission._id === 'object' ? permission._id.toString() : permission._id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete subcategory"
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
        </>
      )}
    </div>
  );
};

export default PermissionManagement;