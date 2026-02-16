'use client';
import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, XCircle, Clock, Users, UserCheck, 
  Activity, TrendingUp, Shield, Database, BarChart3, AlertCircle, UserX 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, RadialBarChart, RadialBar,
  AreaChart, Area
} from 'recharts';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [templateStats, setTemplateStats] = useState({
    activeAssessments: 0,
    pendingApprovals: 0,
    rejectedAssessments: 0,
    totalTemplates: 0
  });
  const [customerStats, setCustomerStats] = useState({
    totalCustomerAssessments: 0,
    approvedCustomerAssessments: 0,
    pendingCustomerAssessments: 0,
    rejectedCustomerAssessments: 0
  });
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    suspendedUsers: 0,
    totalRoles: 0
  });
  const [systemStats, setSystemStats] = useState({
    totalAssessments: 0,
    todayAssessments: 0,
    weekAssessments: 0,
    monthAssessments: 0
  });

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTemplateStats(),
        fetchCustomerStats(),
        fetchUserStats(),
        fetchSystemStats()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateStats = async () => {
    try {
      const response = await fetch('/api/rating-assessments');
      if (response.ok) {
        const data = await response.json();
        const assessments = data.assessments || [];
        
        const activeAssessments = assessments.filter(a => 
          a.status === 'active' && !a.isDeleted
        ).length;
        
        const pendingApprovals = assessments.filter(a => 
          a.approvalStatus === 'pending' && !a.isDeleted
        ).length;
        
        const rejectedAssessments = assessments.filter(a => 
          a.approvalStatus === 'rejected' && !a.isDeleted
        ).length;

        const totalTemplates = assessments.filter(a => !a.isDeleted).length;

        setTemplateStats({
          activeAssessments,
          pendingApprovals,
          rejectedAssessments,
          totalTemplates
        });
      }
    } catch (error) {
      console.error('Error fetching template stats:', error);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const response = await fetch('/api/customer-assessments');
      if (response.ok) {
        const data = await response.json();
        const assessments = data.assessments || [];
        
        const activeAssessments = assessments.filter(a => !a.isDeleted);
        
        const totalCustomerAssessments = activeAssessments.length;
        
        const approvedCustomerAssessments = activeAssessments.filter(a => 
          a.approvalStatus === 'approved'
        ).length;
        
        const pendingCustomerAssessments = activeAssessments.filter(a => 
          a.approvalStatus === 'pending'
        ).length;
        
        const rejectedCustomerAssessments = activeAssessments.filter(a => 
          a.approvalStatus === 'rejected'
        ).length;

        setCustomerStats({
          totalCustomerAssessments,
          approvedCustomerAssessments,
          pendingCustomerAssessments,
          rejectedCustomerAssessments
        });
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles')
      ]);

      let totalUsers = 0;
      let activeUsers = 0;
      let inactiveUsers = 0;
      let suspendedUsers = 0;

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const users = usersData.users || [];
        totalUsers = users.length;
        activeUsers = users.filter(u => u.status === 'active').length;
        inactiveUsers = users.filter(u => u.status === 'inactive').length;
        suspendedUsers = users.filter(u => u.status === 'suspended').length;
      }

      let totalRoles = 0;
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        totalRoles = rolesData.roles?.length || 0;
      }

      setUserStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        totalRoles
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/customer-assessments');
      if (response.ok) {
        const data = await response.json();
        const assessments = data.assessments || [];
        
        const totalAssessments = assessments.filter(a => !a.isDeleted).length;
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayAssessments = assessments.filter(a => {
          if (!a.assessmentDate || a.isDeleted) return false;
          const assessmentDate = new Date(a.assessmentDate);
          return assessmentDate >= todayStart;
        }).length;

        const weekAssessments = assessments.filter(a => {
          if (!a.assessmentDate || a.isDeleted) return false;
          const assessmentDate = new Date(a.assessmentDate);
          return assessmentDate >= weekStart;
        }).length;

        const monthAssessments = assessments.filter(a => {
          if (!a.assessmentDate || a.isDeleted) return false;
          const assessmentDate = new Date(a.assessmentDate);
          return assessmentDate >= monthStart;
        }).length;

        setSystemStats({
          totalAssessments,
          todayAssessments,
          weekAssessments,
          monthAssessments
        });
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Admin Dashboard 📊
        </h1>
        <p className="text-gray-600">
          Complete overview of your credit rating system
        </p>
      </div>

      {/* System Activity Summary */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">System Activity Summary</h2>
        <p className="text-gray-500 text-sm mb-4">Assessment activity over different time periods</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Database size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{systemStats.totalAssessments}</h3>
          <p className="text-cyan-100 text-sm">Total Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{systemStats.todayAssessments}</h3>
          <p className="text-emerald-100 text-sm">Today's Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{systemStats.weekAssessments}</h3>
          <p className="text-orange-100 text-sm">This Week</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{systemStats.monthAssessments}</h3>
          <p className="text-pink-100 text-sm">This Month</p>
        </div>
      </div>

      {/* Data Visualizations */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Data Visualizations</h2>
        <p className="text-gray-500 text-sm mb-4">Visual representation of key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie Chart - Template Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 aspect-square flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Template Status Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: templateStats.activeAssessments, color: '#10b981' },
                    { name: 'Pending', value: templateStats.pendingApprovals, color: '#eab308' },
                    { name: 'Rejected', value: templateStats.rejectedAssessments, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { name: 'Active', value: templateStats.activeAssessments, color: '#10b981' },
                    { name: 'Pending', value: templateStats.pendingApprovals, color: '#eab308' },
                    { name: 'Rejected', value: templateStats.rejectedAssessments, color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600">Active ({templateStats.activeAssessments})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs text-gray-600">Pending ({templateStats.pendingApprovals})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-600">Rejected ({templateStats.rejectedAssessments})</span>
            </div>
          </div>
        </div>

        {/* Bar Chart - Customer Assessment Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 aspect-square flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Customer Assessment Status</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Approved', count: customerStats.approvedCustomerAssessments, fill: '#10b981' },
                  { name: 'Pending', count: customerStats.pendingCustomerAssessments, fill: '#eab308' },
                  { name: 'Rejected', count: customerStats.rejectedCustomerAssessments, fill: '#ef4444' }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888" style={{ fontSize: '12px' }} />
                <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {[
                    { name: 'Approved', count: customerStats.approvedCustomerAssessments, fill: '#10b981' },
                    { name: 'Pending', count: customerStats.pendingCustomerAssessments, fill: '#eab308' },
                    { name: 'Rejected', count: customerStats.rejectedCustomerAssessments, fill: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radial Bar Chart - User Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 aspect-square flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">User Status Overview</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={[
                  { 
                    name: 'Active', 
                    value: userStats.totalUsers > 0 ? (userStats.activeUsers / userStats.totalUsers) * 100 : 0, 
                    fill: '#10b981' 
                  },
                  { 
                    name: 'Inactive', 
                    value: userStats.totalUsers > 0 ? (userStats.inactiveUsers / userStats.totalUsers) * 100 : 0, 
                    fill: '#6b7280' 
                  },
                  { 
                    name: 'Suspended', 
                    value: userStats.totalUsers > 0 ? (userStats.suspendedUsers / userStats.totalUsers) * 100 : 0, 
                    fill: '#ef4444' 
                  }
                ]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  minAngle={15}
                  background
                  clockWise
                  dataKey="value"
                />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.activeUsers}</div>
              <div className="text-xs text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{userStats.inactiveUsers}</div>
              <div className="text-xs text-gray-600">Inactive Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{userStats.suspendedUsers}</div>
              <div className="text-xs text-gray-600">Suspended Users</div>
            </div>
          </div>
        </div>
      </div>
      {/* Credit Rating Assessment Template Summary */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Credit Rating Assessment Template Summary</h2>
        <p className="text-gray-500 text-sm mb-4">Overview of assessment templates and their status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{templateStats.totalTemplates}</h3>
          <p className="text-blue-100 text-sm">Total Templates</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{templateStats.activeAssessments}</h3>
          <p className="text-green-100 text-sm">Active Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Clock size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{templateStats.pendingApprovals}</h3>
          <p className="text-yellow-100 text-sm">Pending Approvals</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <XCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{templateStats.rejectedAssessments}</h3>
          <p className="text-red-100 text-sm">Rejected Assessments</p>
        </div>
      </div>

      {/* Customer Assessment Summary */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Customer Assessment Summary</h2>
        <p className="text-gray-500 text-sm mb-4">Overview of customer assessments and their approval status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Users size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.totalCustomerAssessments}</h3>
          <p className="text-blue-100 text-sm">Total Customer Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.approvedCustomerAssessments}</h3>
          <p className="text-green-100 text-sm">Approved Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Clock size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.pendingCustomerAssessments}</h3>
          <p className="text-yellow-100 text-sm">Pending Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <XCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.rejectedCustomerAssessments}</h3>
          <p className="text-red-100 text-sm">Rejected Assessments</p>
        </div>
      </div>
      {/* User Management Summary */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">User Management Summary</h2>
        <p className="text-gray-500 text-sm mb-4">Overview of system users and roles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Users size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{userStats.totalUsers}</h3>
          <p className="text-purple-100 text-sm">Total Users</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <UserCheck size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{userStats.activeUsers}</h3>
          <p className="text-green-100 text-sm">Active Users</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertCircle size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{userStats.inactiveUsers}</h3>
          <p className="text-gray-100 text-sm">Inactive Users</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <UserX size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{userStats.suspendedUsers}</h3>
          <p className="text-red-100 text-sm">Suspended Users</p>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;