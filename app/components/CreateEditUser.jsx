'use client';
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, X, Loader2, Shield } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const CreateEditUser = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    role: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  // Fetch roles from API
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const response = await fetch('/api/roles');
        const data = await response.json();
        
        if (response.ok) {
          console.log('=== ROLES DEBUG ===');
          console.log('Full response:', data);
          console.log('Roles array:', data.roles);
          console.log('Roles count:', data.roles?.length);
          console.log('First role object:', data.roles[0]);
          console.log('First role _id:', data.roles[0]?._id);
          console.log('First role name:', data.roles[0]?.name);
          console.log('First role roleName:', data.roles[0]?.roleName);
          console.log('===================');
          
          const rolesArray = data.roles || [];
          console.log('Setting roles state with:', rolesArray);
          setRoles(rolesArray);
        } else {
          console.error('Failed to fetch roles:', data.error);
          setErrors({ general: 'Failed to load roles. Please refresh the page.' });
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setErrors({ general: 'Network error while loading roles. Please refresh the page.' });
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Log activity to the database
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Show confirmation modal instead of directly creating user
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          status: formData.status,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: 'User with this email or username already exists' });
        } else {
          setErrors({ general: data.error || 'Failed to create user' });
        }
        return;
      }

      // Log the activity after successful user creation
      const selectedRole = roles.find(r => r._id === formData.role);
      const roleName = selectedRole?.name || selectedRole?.roleName || 'Unknown Role';
      
      await logActivity(
        `Created new user: ${formData.username} (${formData.firstName} ${formData.lastName}) with role: ${roleName}`,
        'User Creation'
      );

      // Success - clear form and show success message
      setSuccessMessage('User created successfully!');
      handleReset();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      status: 'active',
      role: ''
    });
    setErrors({});
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New User</h1>
        <p className="text-gray-600 mt-1">Fill in the information below to create a new user account</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Personal Information Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-cyan-500" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Enter first name"
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Enter last name"
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="user@example.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* Account Information Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock size={20} className="text-cyan-500" />
            Account Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Enter username"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            {/* Status */}
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
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter password"
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Confirm password"
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        </div>

        {/* Role & Permissions Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-cyan-500" />
            Role & Permissions
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              {loadingRoles ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                  <span className="text-gray-500">Loading roles...</span>
                </div>
              ) : roles.length === 0 ? (
                <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800">
                  No roles available. Please create roles first in Role Management.
                </div>
              ) : (
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => {
                    console.log('Rendering option for role:', role);
                    return (
                      <option key={role._id} value={role._id}>
                        {role.name || role.roleName || 'Unnamed Role'}
                      </option>
                    );
                  })}
                </select>
              )}
              {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              {!loadingRoles && roles.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {roles.length} role{roles.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
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
            type="submit"
            disabled={isLoading || loadingRoles || roles.length === 0}
            className={`flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors ${
              (isLoading || loadingRoles || roles.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create User
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelConfirm}
        onConfirm={handleConfirmCreate}
        title="Confirm User Creation"
        message={`Are you sure you want to create a new user account for "${formData.firstName} ${formData.lastName}" with username "${formData.username}"?`}
        confirmText="Yes, Create User"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
};

export default CreateEditUser;