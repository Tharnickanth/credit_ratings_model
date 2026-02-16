'use client';
import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, Save, X, Loader2, Edit2, AlertCircle, Shield, Info, Upload, Crop, Check } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const Profile = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    status: '',
    role: '',
    profilePicture: ''
  });

  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Profile picture states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Image cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    aspect: 1
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  
  // Roles state
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Get current logged-in user from localStorage and fetch their profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setErrors({ general: 'No user session found. Please login again.' });
        setIsLoadingProfile(false);
        return;
      }

      try {
        const userData = JSON.parse(userStr);
        setCurrentUser(userData.username);

        const userId = userData._id || userData.id;

        if (!userId) {
          setErrors({ general: 'Invalid user data. Please login again.' });
          setIsLoadingProfile(false);
          return;
        }

        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (response.ok) {
          const profileData = {
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
            username: data.user.username || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            status: data.user.status || 'active',
            role: data.user.role || '',
            profilePicture: data.user.profilePicture || ''
          };
          
          setFormData(profileData);
          setOriginalData(profileData);
          
          if (data.user.profilePicture) {
            setPreviewUrl(data.user.profilePicture);
          }
        } else {
          setErrors({ general: data.error || 'Failed to load profile' });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setErrors({ general: 'Failed to load profile data' });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const response = await fetch('/api/roles');
        const data = await response.json();
        
        if (response.ok) {
          setRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const getRoleName = (roleId) => {
    if (!roleId) return 'N/A';
    const role = roles.find(r => r._id === roleId);
    return role ? (role.name || role.roleName || 'Unknown Role') : 'Unknown Role';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        profilePicture: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        profilePicture: 'Image size should be less than 5MB'
      }));
      return;
    }

    setErrors(prev => ({
      ...prev,
      profilePicture: ''
    }));

    // Read the file and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        blob.name = fileName;
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      return;
    }

    try {
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        'cropped-profile.jpg'
      );

      // Create a File object from the blob
      const file = new File([croppedBlob], 'cropped-profile.jpg', { type: 'image/jpeg' });
      
      setSelectedFile(file);
      setCroppedImageBlob(croppedBlob);

      // Create preview URL
      const previewURL = URL.createObjectURL(croppedBlob);
      setPreviewUrl(previewURL);

      // Close the crop modal
      setShowCropModal(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error cropping image:', error);
      setErrors(prev => ({
        ...prev,
        profilePicture: 'Failed to crop image. Please try again.'
      }));
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageSrc(null);
    setCrop({ unit: '%', width: 90, aspect: 1 });
    setCompletedCrop(null);
    
    // Clear the file input
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setCroppedImageBlob(null);
    setPreviewUrl(formData.profilePicture || '');
    
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
      fileInput.value = '';
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

  const validateForm = () => {
    const newErrors = {};
    const missingFields = [];

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      missingFields.push('First Name');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      missingFields.push('Last Name');
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      missingFields.push('Email');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (missingFields.length > 0) {
      newErrors.general = `Missing required fields: ${missingFields.join(', ')}`;
    }

    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'New password must be at least 8 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const logActivity = async (description, action = 'Profile Management') => {
    if (!currentUser) return;

    try {
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser,
          action: action,
          description: description,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const userStr = localStorage.getItem('user');
      const userData = JSON.parse(userStr);
      const userId = userData._id || userData.id;

      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('role', formData.role);

      if (formData.currentPassword && formData.newPassword) {
        formDataToSend.append('currentPassword', formData.currentPassword);
        formDataToSend.append('password', formData.newPassword);
      }

      if (selectedFile) {
        formDataToSend.append('profilePicture', selectedFile);
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Profile updated successfully!');
        
        const updatedUserData = {
          ...userData,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          username: data.user.username,
          profilePicture: data.user.profilePicture
        };
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        const updatedFormData = {
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          username: data.user.username,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          status: data.user.status,
          role: data.user.role,
          profilePicture: data.user.profilePicture || ''
        };
        
        setFormData(updatedFormData);
        setOriginalData(updatedFormData);
        
        if (data.user.profilePicture) {
          setPreviewUrl(data.user.profilePicture);
        }
        
        setSelectedFile(null);
        setCroppedImageBlob(null);
        setIsEditing(false);

        await logActivity(
          `Updated profile information${selectedFile ? ' including profile picture' : ''}`,
          'Profile Management'
        );

        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        setErrors({ general: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ general: 'An error occurred while updating profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setSelectedFile(null);
    setCroppedImageBlob(null);
    setPreviewUrl(originalData.profilePicture || '');
    setErrors({});
    setSuccessMessage('');
    setIsEditing(false);
    
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSuccessMessage('');
    setErrors({});
  };

  const getChangesMessage = () => {
    const changes = [];
    
    if (formData.firstName !== originalData.firstName) {
      changes.push(`First Name: ${originalData.firstName} → ${formData.firstName}`);
    }
    if (formData.lastName !== originalData.lastName) {
      changes.push(`Last Name: ${originalData.lastName} → ${formData.lastName}`);
    }
    if (formData.email !== originalData.email) {
      changes.push(`Email: ${originalData.email} → ${formData.email}`);
    }
    if (formData.newPassword) {
      changes.push('Password will be changed');
    }
    if (selectedFile) {
      changes.push('Profile picture will be updated');
    }

    if (changes.length === 0) {
      return 'No changes detected.';
    }

    return `The following changes will be made:\n\n${changes.join('\n')}`;
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-cyan-500" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-8xl mx-auto">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your personal information</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
              <AlertCircle size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
              <AlertCircle size={18} />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Account Information Section */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User size={18} className="text-cyan-500" />
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    disabled={true}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={loadingRoles ? 'Loading...' : getRoleName(formData.role)}
                      disabled={true}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <span className="inline-flex items-center px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium capitalize">
                    {formData.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 italic">
                <Info size={12} />
                These fields are managed by administrators and cannot be changed
              </p>
            </div>

            {/* Personal Information Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <User size={18} className="text-cyan-500" />
                  Personal Information
                </h2>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Profile Picture Row */}
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  {/* Profile Picture Preview */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    {isEditing && selectedFile && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {isEditing && previewUrl && !selectedFile && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="file"
                          id="profilePictureInput"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={isLoading}
                        />
                        <div className="flex items-center gap-3">
                          <label
                            htmlFor="profilePictureInput"
                            className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm w-fit ${
                              isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Upload size={14} />
                            {selectedFile ? 'Change Picture' : 'Upload Picture'}
                          </label>
                          {selectedFile && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          JPG, PNG, GIF or WebP (Max 5MB)
                        </p>
                        {selectedFile && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check size={14} />
                            {selectedFile.name}
                          </p>
                        )}
                        {errors.profilePicture && (
                          <p className="text-xs text-red-500">{errors.profilePicture}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Click "Edit Profile" to update your profile picture</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name and Email Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="user@example.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Change Password Section */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Lock size={18} className="text-cyan-500" />
                Change Password
              </h2>
              <p className="text-xs text-gray-600 mb-3">Leave blank if you don't want to change your password</p>
              
              {/* Current Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                    } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter current password"
                  />
                </div>
                {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      disabled={!isEditing || isLoading}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        errors.newPassword ? 'border-red-500' : 'border-gray-300'
                      } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      placeholder="Enter new password"
                    />
                  </div>
                  {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={!isEditing || isLoading}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      } ${!isEditing || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      placeholder="Confirm new password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons - Only show when editing */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Crop size={20} className="text-cyan-500" />
                  Crop Profile Picture
                </h3>
                <button
                  onClick={handleCropCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Drag to adjust the crop area. The image will be cropped to a square format.
              </p>

              <div className="mb-6 flex justify-center bg-gray-100 rounded-lg p-4">
                {imageSrc && (
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop={false}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      style={{ maxHeight: '60vh', maxWidth: '100%' }}
                      onLoad={(e) => {
                        const { width, height } = e.currentTarget;
                        const minDimension = Math.min(width, height);
                        const cropSize = Math.min(minDimension * 0.9, 400);
                        
                        setCrop({
                          unit: 'px',
                          width: cropSize,
                          height: cropSize,
                          x: (width - cropSize) / 2,
                          y: (height - cropSize) / 2,
                          aspect: 1
                        });
                      }}
                    />
                  </ReactCrop>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropComplete}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
                >
                  <Check size={16} />
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelConfirm}
        onConfirm={handleConfirmUpdate}
        title="Confirm Profile Update"
        message={getChangesMessage()}
        confirmText="Yes, Update Profile"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default Profile;