import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, FileText, CheckCircle, Activity, Clock, BarChart3, Database, Server, UserCheck, LogIn, Maximize2, X, XCircle } from 'lucide-react';

const LandingPage = ({ onNavigate }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    activeAssessments: 0,
    pendingApprovals: 0,
    rejectedAssessments: 0
  });
  const [customerStats, setCustomerStats] = useState({
    totalCustomerAssessments: 0,
    approvedCustomerAssessments: 0,
    pendingCustomerAssessments: 0,
    rejectedCustomerAssessments: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [allLoginHistory, setAllLoginHistory] = useState([]);
  const [userActivityLog, setUserActivityLog] = useState([]);
  const [allActivityLog, setAllActivityLog] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    database: { status: 'Checking...', message: '', responseTime: 0 },
    api: { status: 'Checking...', message: '', responseTime: 0 },
    userSessions: { status: 'Checking...', activeCount: 0, message: '' }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    initializeLandingPage();
  }, []);

  const initializeLandingPage = async () => {
    try {
      setLoading(true);
      
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }

      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchStats(),
        fetchCustomerStats(),
        fetchRecentActivity(),
        fetchUserActivityLog(),
        fetchSystemHealth()
      ]);
      
    } catch (error) {
      console.error('Error initializing landing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch rating assessments (templates)
      const assessmentsResponse = await fetch('/api/rating-assessments');
      let activeAssessments = 0;
      let pendingApprovals = 0;
      let rejectedAssessments = 0;

      if (assessmentsResponse.ok) {
        const assessmentsData = await assessmentsResponse.json();
        const assessments = assessmentsData.assessments || [];
        
        // Count active assessments (status: "active")
        activeAssessments = assessments.filter(a => 
          a.status === 'active' && !a.isDeleted
        ).length;
        
        // Count pending approvals (approvalStatus: "pending")
        pendingApprovals = assessments.filter(a => 
          a.approvalStatus === 'pending' && !a.isDeleted
        ).length;
        
        // Count rejected assessments (approvalStatus: "rejected")
        rejectedAssessments = assessments.filter(a => 
          a.approvalStatus === 'rejected' && !a.isDeleted
        ).length;
      }

      // Also check customer assessments for pending approvals
      const customerAssessmentsResponse = await fetch('/api/customer-assessments');
      if (customerAssessmentsResponse.ok) {
        const customerAssessmentsData = await customerAssessmentsResponse.json();
        const customerAssessments = customerAssessmentsData.assessments || [];
        
        // Add pending customer assessments to the count
        const pendingCustomerAssessments = customerAssessments.filter(a => 
          a.approvalStatus === 'pending' && !a.isDeleted
        ).length;
        pendingApprovals += pendingCustomerAssessments;
      }

      setStats({
        activeAssessments,
        pendingApprovals,
        rejectedAssessments
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        activeAssessments: 0,
        pendingApprovals: 0,
        rejectedAssessments: 0
      });
    }
  };

  const fetchCustomerStats = async () => {
    try {
      // Fetch customer assessments
      const customerAssessmentsResponse = await fetch('/api/customer-assessments');
      let totalCustomerAssessments = 0;
      let approvedCustomerAssessments = 0;
      let pendingCustomerAssessments = 0;
      let rejectedCustomerAssessments = 0;

      if (customerAssessmentsResponse.ok) {
        const customerAssessmentsData = await customerAssessmentsResponse.json();
        const customerAssessments = customerAssessmentsData.assessments || [];
        
        // Filter out deleted assessments
        const activeCustomerAssessments = customerAssessments.filter(a => !a.isDeleted);
        
        // Count total customer assessments (not deleted)
        totalCustomerAssessments = activeCustomerAssessments.length;
        
        // Count approved customer assessments (approvalStatus: "approved")
        approvedCustomerAssessments = activeCustomerAssessments.filter(a => 
          a.approvalStatus === 'approved'
        ).length;
        
        // Count pending customer assessments (approvalStatus: "pending")
        pendingCustomerAssessments = activeCustomerAssessments.filter(a => 
          a.approvalStatus === 'pending'
        ).length;
        
        // Count rejected customer assessments (approvalStatus: "rejected")
        rejectedCustomerAssessments = activeCustomerAssessments.filter(a => 
          a.approvalStatus === 'rejected'
        ).length;
      }

      setCustomerStats({
        totalCustomerAssessments,
        approvedCustomerAssessments,
        pendingCustomerAssessments,
        rejectedCustomerAssessments
      });

    } catch (error) {
      console.error('Error fetching customer stats:', error);
      setCustomerStats({
        totalCustomerAssessments: 0,
        approvedCustomerAssessments: 0,
        pendingCustomerAssessments: 0,
        rejectedCustomerAssessments: 0
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get current user
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setRecentActivity([]);
        setAllLoginHistory([]);
        return;
      }

      const currentUser = JSON.parse(userStr);
      const username = currentUser.username;

      // Fetch last 1000 login logs for the current user
      const response = await fetch(`/api/login-logs?username=${username}&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || [];
        
        const formattedActivity = logs.map(log => ({
          username: log.username || 'Unknown',
          loginTime: log.loginAt ? new Date(log.loginAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }) : 'N/A',
          loginDate: log.loginAt ? new Date(log.loginAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'N/A',
          status: log.status || 'unknown',
          timestamp: log.loginAt
        }));
        
        // Store all login history (last 1000)
        setAllLoginHistory(formattedActivity);
        
        // Show only last 3 for the card
        setRecentActivity(formattedActivity.slice(0, 3));
      } else {
        setRecentActivity([]);
        setAllLoginHistory([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
      setAllLoginHistory([]);
    }
  };

  const fetchUserActivityLog = async () => {
    try {
      // Get current user
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setUserActivityLog([]);
        setAllActivityLog([]);
        return;
      }

      const currentUser = JSON.parse(userStr);
      const username = currentUser.username;

      // Fetch last 10000 activity logs for the current user
      const response = await fetch(`/api/activity-logs?username=${username}&limit=10000`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.logs) {
          const formattedLogs = data.logs.map(log => ({
            id: log.id || log._id,
            username: log.username || 'Unknown User',
            action: log.action || 'unknown_action',
            description: log.description || 'No description',
            date: log.date || 'N/A',
            time: log.time || 'N/A',
            timestamp: log.timestamp
          }));
          
          // Store all activity logs (last 10000)
          setAllActivityLog(formattedLogs);
          
          // Show only first 5 for the card
          setUserActivityLog(formattedLogs.slice(0, 5));
        } else {
          setUserActivityLog([]);
          setAllActivityLog([]);
        }
      } else {
        console.error('Failed to fetch activity logs');
        setUserActivityLog([]);
        setAllActivityLog([]);
      }
    } catch (error) {
      console.error('Error fetching user activity log:', error);
      setUserActivityLog([]);
      setAllActivityLog([]);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system-health');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.health) {
          setSystemHealth(data.health);
        }
      } else {
        setSystemHealth({
          database: { status: 'Error', message: 'Health check failed', responseTime: 0 },
          api: { status: 'Error', message: 'Health check failed', responseTime: 0 },
          userSessions: { status: 'Error', activeCount: 0, message: 'Unable to check' }
        });
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      setSystemHealth({
        database: { status: 'Error', message: 'Connection failed', responseTime: 0 },
        api: { status: 'Error', message: 'Connection failed', responseTime: 0 },
        userSessions: { status: 'Error', activeCount: 0, message: 'Unable to check' }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'active':
        return 'bg-green-500';
      case 'slow':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'unknown':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getActionColor = (action) => {
    const actionColors = {
      'category_created': 'bg-green-500',
      'category_updated': 'bg-blue-500',
      'category_deleted': 'bg-red-500',
      'assessment_created': 'bg-purple-500',
      'assessment_updated': 'bg-orange-500',
      'assessment_deleted': 'bg-red-500',
      'user_created': 'bg-cyan-500',
      'user_updated': 'bg-indigo-500',
      'user_deleted': 'bg-red-500',
      'login': 'bg-green-500',
      'logout': 'bg-gray-500',
      'general': 'bg-gray-500',
    };
    return actionColors[action] || 'bg-gray-500';
  };

  const getActionIcon = (action) => {
    const icons = {
      'category_created': '📁',
      'category_updated': '📝',
      'category_deleted': '🗑️',
      'assessment_created': '📊',
      'assessment_updated': '✏️',
      'assessment_deleted': '❌',
      'user_created': '👤',
      'user_updated': '🔄',
      'user_deleted': '🚫',
      'login': '🔐',
      'logout': '👋',
      'general': '⚡',
    };
    return icons[action] || '📌';
  };

  const formatActionName = (action) => {
    if (!action) return 'Unknown';
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user ? `${user.firstName}` : 'User'}! 👋
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Here's what's happening with your credit rating system today.
        </p>
      </div>

      {/* Credit Rating Assessment Template Summary */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Credit Rating Assessment Template Summary</h2>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{stats.activeAssessments}</h3>
          <p className="text-green-100 text-sm">Active Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{stats.pendingApprovals}</h3>
          <p className="text-yellow-100 text-sm">Pending Approvals</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <XCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{stats.rejectedAssessments}</h3>
          <p className="text-red-100 text-sm">Rejected Assessments</p>
        </div>
      </div>

      {/* Customer Assessment Summary */}
      <div className="mb-4 sm:mb-6 mt-8 sm:mt-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Assessment Summary</h2>
      </div>

      {/* Customer Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Users size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.totalCustomerAssessments}</h3>
          <p className="text-blue-100 text-sm">Total Customer Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <TrendingUp size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.approvedCustomerAssessments}</h3>
          <p className="text-green-100 text-sm">Approved Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Clock size={24} />
            </div>
            <Activity size={20} className="opacity-80" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{customerStats.pendingCustomerAssessments}</h3>
          <p className="text-yellow-100 text-sm">Pending Assessments</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
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

      {/* Clean Login History & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Clean Login History - Last 3 with Expand Icon */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">My Login History</h2>
            <div className="flex items-center gap-2 sm:gap-3">
              {allLoginHistory.length > 3 && (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  title="View all login history"
                >
                  <Maximize2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Expand</span>
                </button>
              )}
              <Clock className="text-gray-400" size={18} />
            </div>
          </div>
          
          <div className="space-y-0">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="mx-auto mb-2 text-gray-300" size={32} />
                <p className="text-sm">No login history available</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-2 sm:gap-0 ${
                    index !== recentActivity.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor('success')}`}></div>
                    <LogIn size={20} className="sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base font-medium text-gray-900 truncate">{activity.username}</span>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {activity.loginDate} at {activity.loginTime}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-green-600 self-start sm:self-auto">Success</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clean System Status */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">System Status</h2>
            <button
              onClick={fetchSystemHealth}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
              title="Refresh status"
            >
              <Activity size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          
          <div className="space-y-0">
            {/* Database Connection */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 border-b border-gray-100 gap-2 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(systemHealth.database.status)}`}></div>
                <Database size={20} className="sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-medium text-gray-900">Database Connection</span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate">
                    {systemHealth.database.message || 'Checking connection...'}
                  </span>
                </div>
              </div>
              <span className={`text-xs sm:text-sm font-semibold self-start sm:self-auto flex-shrink-0 ${
                systemHealth.database.status === 'Healthy' ? 'text-green-600' : 
                systemHealth.database.status === 'Slow' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {systemHealth.database.status}
              </span>
            </div>

            {/* API Services */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 border-b border-gray-100 gap-2 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(systemHealth.api.status)}`}></div>
                <Server size={20} className="sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-medium text-gray-900">API Services</span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate">
                    {systemHealth.api.message || 'Checking API...'}
                  </span>
                </div>
              </div>
              <span className={`text-xs sm:text-sm font-semibold self-start sm:self-auto flex-shrink-0 ${
                systemHealth.api.status === 'Healthy' ? 'text-green-600' : 
                systemHealth.api.status === 'Slow' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {systemHealth.api.status}
              </span>
            </div>

            {/* User Sessions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-2 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(systemHealth.userSessions.status)}`}></div>
                <UserCheck size={20} className="sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-medium text-gray-900">Active User Sessions</span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate">
                    {systemHealth.userSessions.message || 'Checking sessions...'}
                  </span>
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold text-green-600 self-start sm:self-auto flex-shrink-0">
                {systemHealth.userSessions.activeCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Activity Log - First 5 with Expand Icon */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">My Activity Log</h2>
          <div className="flex items-center gap-2 sm:gap-3">
            {allActivityLog.length > 5 && (
              <button
                onClick={() => setShowActivityModal(true)}
                className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                title="View all activity logs"
              >
                <Maximize2 size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Expand</span>
              </button>
            )}
            <BarChart3 className="text-gray-400" size={18} />
          </div>
        </div>
        
        {userActivityLog.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-sm font-medium">No activity logs available</p>
            <p className="text-xs text-gray-400 mt-1">Your actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-0">
            {userActivityLog.map((log, index) => (
              <div 
                key={log.id || index} 
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-3 sm:gap-0 ${
                  index !== userActivityLog.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${getActionColor(log.action)}`}></div>
                  <div className="text-xl sm:text-2xl flex-shrink-0">{getActionIcon(log.action)}</div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm sm:text-base font-medium text-gray-900">
                        {formatActionName(log.action)}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 break-words" title={log.description}>
                      {log.description}
                    </span>
                    {/* Date and time shown below description on mobile */}
                    <div className="flex sm:hidden items-center gap-2 mt-2 text-xs text-gray-600">
                      <span>{log.date}</span>
                      <span>•</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                </div>
                {/* Date and time shown on right side on larger screens */}
                <div className="hidden sm:flex flex-col items-end ml-4 text-right flex-shrink-0">
                  <span className="text-sm text-gray-600">{log.date}</span>
                  <span className="text-xs text-gray-500">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History Modal - Shows Last 1000 Records */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 sm:p-3 rounded-xl flex-shrink-0">
                  <LogIn className="text-white" size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Complete Login History</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                    Showing last {allLoginHistory.length} login session{allLoginHistory.length !== 1 ? 's' : ''} (max 1000)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Close"
              >
                <X size={20} className="sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-0">
                {allLoginHistory.map((activity, index) => (
                  <div 
                    key={index} 
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-4 gap-2 ${
                      index !== allLoginHistory.length - 1 ? 'border-b border-gray-100' : ''
                    } hover:bg-gray-50 transition-colors rounded-lg px-2 sm:px-3`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor('success')}`}></div>
                      <LogIn size={20} className="sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm sm:text-base font-medium text-gray-900">{activity.username}</span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {activity.loginDate} at {activity.loginTime}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-green-600 ml-9 sm:ml-0">Success</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal - Shows Last 10000 Records */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 sm:p-3 rounded-xl flex-shrink-0">
                  <BarChart3 className="text-white" size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Complete Activity Log</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                    Showing last {allActivityLog.length} activit{allActivityLog.length !== 1 ? 'ies' : 'y'} (max 10000)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Close"
              >
                <X size={20} className="sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-0">
                {allActivityLog.map((log, index) => (
                  <div 
                    key={log.id || index} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 gap-2 sm:gap-0 ${
                      index !== allActivityLog.length - 1 ? 'border-b border-gray-100' : ''
                    } hover:bg-gray-50 transition-colors rounded-lg px-2 sm:px-3`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${getActionColor(log.action)}`}></div>
                      <div className="text-xl sm:text-2xl flex-shrink-0">{getActionIcon(log.action)}</div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                          {formatActionName(log.action)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 break-words" title={log.description}>
                          {log.description}
                        </span>
                        {/* Date and time shown below on mobile */}
                        <div className="flex sm:hidden items-center gap-2 mt-2 text-xs text-gray-600">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span>{log.time}</span>
                        </div>
                      </div>
                    </div>
                    {/* Date and time shown on right side on larger screens */}
                    <div className="hidden sm:flex flex-col items-end ml-4 text-right flex-shrink-0">
                      <span className="text-sm text-gray-600">{log.date}</span>
                      <span className="text-xs text-gray-500">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setShowActivityModal(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;