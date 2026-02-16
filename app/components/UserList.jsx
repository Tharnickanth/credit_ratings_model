import React, { useState, useEffect } from 'react';
import { Users, Edit2, Search, Loader2, X, Save, Mail, Lock, User, Shield } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  // Roles state
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: '',
    status: 'active',
    changePassword: false,
    newPassword: '',
    confirmPassword: ''
  });

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Get current logged-in user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        // Set the username from the logged-in user
        setCurrentUser(userData.username);
        console.log('Current logged-in user:', userData.username);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setCurrentUser('unknown'); // Fallback if parsing fails
      }
    } else {
      console.warn('No user found in localStorage');
      setCurrentUser('unknown'); // Fallback if no user found
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
        setErrors({ general: 'Failed to load users' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
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
      setLoadingRoles(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      username: user.username || '',
      role: user.role || '',
      status: user.status || 'active',
      changePassword: false,
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditModalOpen(true);
    setErrors({});
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!editFormData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!editFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      newErrors.email = 'Email is invalid';
    }
    // Username validation removed - field is not editable
    if (!editFormData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation only if changing password
    if (editFormData.changePassword) {
      if (!editFormData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (editFormData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      }
      if (editFormData.newPassword !== editFormData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEdit = () => {
    if (!validateEditForm()) {
      return;
    }

    // Show confirmation modal instead of saving directly
    setShowConfirmModal(true);
  };

  // Helper function to get role name by ID
  const getRoleName = (roleId) => {
    const role = roles.find(r => r._id === roleId);
    return role ? (role.name || role.roleName || 'Unknown Role') : 'Unknown Role';
  };

  // Helper function to create activity log
  const logActivity = async (description, action = 'User Management') => {
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

  // Helper function to detect changes and create descriptions
  const detectChanges = (oldData, newData) => {
    const changes = [];
    const targetUsername = oldData.username;

    // Check first name change
    if (oldData.firstName !== newData.firstName) {
      changes.push({
        action: 'User Profile Update',
        description: `Changed first name from "${oldData.firstName}" to "${newData.firstName}" for user ${targetUsername}`
      });
    }

    // Check last name change
    if (oldData.lastName !== newData.lastName) {
      changes.push({
        action: 'User Profile Update',
        description: `Changed last name from "${oldData.lastName}" to "${newData.lastName}" for user ${targetUsername}`
      });
    }

    // Check email change
    if (oldData.email !== newData.email) {
      changes.push({
        action: 'User Profile Update',
        description: `Changed email from "${oldData.email}" to "${newData.email}" for user ${targetUsername}`
      });
    }

    // Check role change
    if (oldData.role !== newData.role) {
      const oldRoleName = getRoleName(oldData.role);
      const newRoleName = getRoleName(newData.role);
      changes.push({
        action: 'User Role Update',
        description: `Changed role from "${oldRoleName}" to "${newRoleName}" for user ${targetUsername}`
      });
    }

    // Check status change
    if (oldData.status !== newData.status) {
      changes.push({
        action: 'User Status Update',
        description: `Changed status from "${oldData.status}" to "${newData.status}" for user ${targetUsername}`
      });
    }

    // Check password change
    if (newData.passwordChanged) {
      changes.push({
        action: 'Password Reset',
        description: `Password was reset for user ${targetUsername}`
      });
    }

    return changes;
  };

  const handleConfirmSaveEdit = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setErrors({});

    try {
      const updateData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        username: editFormData.username,
        role: editFormData.role,
        status: editFormData.status
      };

      // Include password if changing
      if (editFormData.changePassword) {
        updateData.password = editFormData.newPassword;
        updateData.passwordChanged = true;
      }

      const userId = typeof editingUser._id === 'object' 
        ? editingUser._id.toString() 
        : editingUser._id;

      // Detect changes before updating
      const changes = detectChanges(
        {
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          username: editingUser.username,
          role: editingUser.role,
          status: editingUser.status
        },
        updateData
      );

      // Create FormData for file upload support
      const formData = new FormData();
      formData.append('firstName', updateData.firstName);
      formData.append('lastName', updateData.lastName);
      formData.append('email', updateData.email);
      formData.append('username', updateData.username);
      formData.append('role', updateData.role);
      formData.append('status', updateData.status);
      
      // Add password fields if changing password
      if (updateData.password) {
        formData.append('password', updateData.password);
        if (editFormData.currentPassword) {
          formData.append('currentPassword', editFormData.currentPassword);
        }
      }
      
      // Add profile picture if exists
      if (editFormData.profilePicture) {
        formData.append('profilePicture', editFormData.profilePicture);
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        // Don't set Content-Type header - browser will set it with boundary for FormData
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'User with this email or username already exists' });
        } else {
          setErrors({ general: data.error || 'Failed to update user' });
        }
        return;
      }

      // Log activity for each change
      if (changes.length > 0) {
        for (const change of changes) {
          await logActivity(change.description, change.action);
        }
      }

      setSuccessMessage('User updated successfully!');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      role: '',
      status: 'active',
      changePassword: false,
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="mx-6 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Users Table */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
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
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getRoleName(user.role)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-cyan-600 hover:text-cyan-900 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Edit User</h2>
            </div>

            <div className="p-6">
              {/* Basic Information Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-cyan-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="firstName"
                        value={editFormData.firstName}
                        onChange={handleEditChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="lastName"
                        value={editFormData.lastName}
                        onChange={handleEditChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          errors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username <span className="text-gray-400 text-xs">(Cannot be changed)</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={editFormData.username}
                      disabled={true}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 text-gray-400" size={18} />
                      <select
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditChange}
                        disabled={isSaving || loadingRoles}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          errors.role ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>
                            {role.name || role.roleName || 'Unnamed Role'}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.role && (
                      <p className="text-red-500 text-sm mt-1">{errors.role}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditChange}
                      disabled={isSaving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Lock size={20} className="text-cyan-500" />
                  Password
                </h3>
                
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    name="changePassword"
                    checked={editFormData.changePassword}
                    onChange={handleEditChange}
                    disabled={isSaving}
                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-400"
                  />
                  <span className="text-sm text-gray-700">Change password</span>
                </label>

                {editFormData.changePassword && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                          type="password"
                          name="newPassword"
                          value={editFormData.newPassword}
                          onChange={handleEditChange}
                          disabled={isSaving}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                            errors.newPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.newPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                          type="password"
                          name="confirmPassword"
                          value={editFormData.confirmPassword}
                          onChange={handleEditChange}
                          disabled={isSaving}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
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
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelConfirm}
        onConfirm={handleConfirmSaveEdit}
        title="Confirm User Update"
        message={`Are you sure you want to save changes to user "${editFormData.firstName} ${editFormData.lastName}" (${editFormData.username})?`}
        confirmText="Yes, Save Changes"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default UserList;