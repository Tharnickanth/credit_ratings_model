'use client';
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Wrench, Users, Heart, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import CreateEditUser from './CreateEditUser';
import RoleManagement from './RoleManagement';

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Data for Users Behavior chart
  const behaviorData = [
    { time: '9:00AM', Open: 250, Click: 100, ClickSecond: 50 },
    { time: '12:00AM', Open: 350, Click: 150, ClickSecond: 100 },
    { time: '3:00PM', Open: 450, Click: 180, ClickSecond: 80 },
    { time: '6:00PM', Open: 500, Click: 220, ClickSecond: 120 },
    { time: '9:00PM', Open: 550, Click: 280, ClickSecond: 180 },
    { time: '12:00PM', Open: 650, Click: 320, ClickSecond: 220 },
    { time: '3:00AM', Open: 700, Click: 400, ClickSecond: 280 },
    { time: '6:00AM', Open: 680, Click: 420, ClickSecond: 300 },
  ];

  // Data for Email Statistics pie chart
  const emailData = [
    { name: 'Open', value: 40, color: '#3B82F6' },
    { name: 'Bounce', value: 20, color: '#EF4444' },
    { name: 'Unsubscribe', value: 40, color: '#F59E0B' },
  ];

  // Render different content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'create-edit-user':
        return <CreateEditUser />;
      
      case 'role-management':
        return <RoleManagement />;
      
      case 'user-list':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">User List</h1>
              <p className="text-gray-600 mt-1">Manage all system users</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">User list component coming soon...</p>
            </div>
          </div>
        );
      
      case 'permission-management':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Permission Management</h1>
              <p className="text-gray-600 mt-1">Configure system permissions</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Permission management component coming soon...</p>
            </div>
          </div>
        );
      
      case 'assign-roles':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Assign Roles to Users</h1>
              <p className="text-gray-600 mt-1">Assign roles and permissions to users</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Role assignment component coming soon...</p>
            </div>
          </div>
        );
      
      case 'activity-logs':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">User Activity Logs</h1>
              <p className="text-gray-600 mt-1">View user activity and system logs</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Activity logs component coming soon...</p>
            </div>
          </div>
        );
      
      case 'login-history':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Login History</h1>
              <p className="text-gray-600 mt-1">Track user login activity</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Login history component coming soon...</p>
            </div>
          </div>
        );
      
      case 'approval-list':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Approval List</h1>
              <p className="text-gray-600 mt-1">Factor Level Adjustment approvals</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Approval list component coming soon...</p>
            </div>
          </div>
        );
      
      case 'approvals':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Credit Rating Approvals</h1>
              <p className="text-gray-600 mt-1">Review and approve credit ratings</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Credit rating approvals component coming soon...</p>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
              <p className="text-gray-600 mt-1">Configure system settings</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Settings component coming soon...</p>
            </div>
          </div>
        );
      
      default:
        // Default dashboard content
        return (
          <div className="p-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Card 1 - Total Considered */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Total Considered</p>
                    <h3 className="text-3xl font-bold text-gray-800">500</h3>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Clock className="text-orange-500" size={24} />
                  </div>
                </div>
              </div>

              {/* Card 2 - Pending */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Pending</p>
                    <h3 className="text-3xl font-bold text-gray-800">132</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Wrench className="text-green-500" size={24} />
                  </div>
                </div>
              </div>

              {/* Card 3 - Approved */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Approved</p>
                    <h3 className="text-3xl font-bold text-gray-800">292</h3>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <Users className="text-red-500" size={24} />
                  </div>
                </div>
              </div>

              {/* Card 4 - Rejected */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Rejected</p>
                    <h3 className="text-3xl font-bold text-gray-800">75</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Heart className="text-blue-500" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Users Behavior Chart */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Users Behavior</h3>
                  <p className="text-sm text-gray-500">24 Hours performance</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={behaviorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Open" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Click" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ClickSecond" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Email Statistics Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Email Statistics</h3>
                    <p className="text-sm text-gray-500">Last Campaign Performance</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Settings size={20} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={emailData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {emailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {emailData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Component */}
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Component */}
        <Header />

        {/* Dynamic Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;