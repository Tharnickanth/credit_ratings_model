'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, User, LogOut, ChevronDown, Menu } from 'lucide-react';

const Header = ({ pageName = 'Dashboard', toggleSidebar, setActiveMenu }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          
          // Fetch user profile from API to get latest profile picture
          const userId = userData._id || userData.id;
          if (userId) {
            try {
              const response = await fetch(`/api/users/${userId}`);
              if (response.ok) {
                const data = await response.json();
                if (data.user.profilePicture) {
                  setProfilePicture(data.user.profilePicture);
                }
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
            }
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    if (setActiveMenu) {
      setActiveMenu('my-profile');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Toggle button and Page Title */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          
          <h1 className="text-2xl font-bold text-gray-800">{pageName}</h1>
        </div>

        <div className="flex items-center gap-4">

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-800">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.username || 'username'}
                </p>
              </div>
              <ChevronDown size={16} className="text-gray-600" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user ? `${user.firstName} ${user.lastName}` : 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
               

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default Header;