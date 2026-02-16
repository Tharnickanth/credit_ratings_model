import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, RefreshCw, Calendar, User, Globe, Monitor, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const LoginHistory = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch logs from API
  useEffect(() => {
    fetchLogs();
  }, []);

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, statusFilter, dateRange]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch from LoginSessions collection
      const response = await fetch('/api/login-sessions');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch login sessions');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch login sessions');
      }
      
      // Use the sessions array directly from the API response
      setLogs(data.sessions || []);
      
    } catch (err) {
      console.error('Error fetching login sessions:', err);
      setError(err.message);
      setLogs([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter - search by username, email, firstName, lastName, or IP
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        (log.username && log.username.toLowerCase().includes(searchLower)) ||
        (log.email && log.email.toLowerCase().includes(searchLower)) ||
        (log.firstName && log.firstName.toLowerCase().includes(searchLower)) ||
        (log.lastName && log.lastName.toLowerCase().includes(searchLower)) ||
        (log.ip && log.ip.includes(searchTerm))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(log => 
        log.loginAt && new Date(log.loginAt) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(log => 
        log.loginAt && new Date(log.loginAt) <= new Date(dateRange.end + 'T23:59:59')
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.loginAt ? new Date(a.loginAt) : new Date(0);
      const dateB = b.loginAt ? new Date(b.loginAt) : new Date(0);
      return dateB - dateA;
    });

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const handleExport = () => {
    const csv = [
      ['Session ID', 'Username', 'Email', 'Name', 'Login Time', 'Status', 'Verified', 'IP', 'User Agent'],
      ...filteredLogs.map(log => [
        log.sessionId || 'N/A',
        log.username || 'N/A',
        log.email || 'N/A',
        `${log.firstName || ''} ${log.lastName || ''}`.trim() || 'N/A',
        log.loginAt ? formatDateTime(log.loginAt) : 'N/A',
        log.status || 'N/A',
        log.verified ? 'Yes' : 'No',
        log.ip || 'N/A',
        log.userAgent || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login_sessions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <AlertCircle className="text-gray-500" size={18} />;
    
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'failed':
        return <XCircle className="text-red-500" size={18} />;
      case 'pending':
        return <AlertCircle className="text-yellow-500" size={18} />;
      default:
        return <AlertCircle className="text-gray-500" size={18} />;
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700 border-gray-300';
    
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Login History</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? 'animate-spin' : ''} size={18} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
              disabled={filteredLogs.length === 0}
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
        <p className="text-gray-600">Track and monitor all login session activities</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="text-gray-500" size={20} />
          <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by username, email, name, or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            placeholder="Start Date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            placeholder="End Date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredLogs.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length} entries
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="p-6 bg-red-50 border-b border-red-200">
            <p className="text-red-700">Error: {error}</p>
            <p className="text-sm text-red-600 mt-1">Please check your API endpoint configuration</p>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="animate-spin text-cyan-500 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading login sessions...</p>
          </div>
        ) : currentLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="text-gray-300 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {logs.length === 0 ? 'No Data Available in Database' : 'No Login Sessions Found'}
            </h3>
            <p className="text-sm text-gray-500">
              {logs.length === 0 
                ? 'The LoginSessions collection is currently empty. Login sessions will appear here once users log in.'
                : 'Try adjusting your filters to see more results'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="text-gray-400" size={16} />
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              {log.username || 'N/A'}
                            </div>
                            {(log.firstName || log.lastName) && (
                              <div className="text-xs text-gray-500">
                                {`${log.firstName || ''} ${log.lastName || ''}`.trim()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{log.email || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-gray-400" size={16} />
                          <span className="text-sm text-gray-600">{formatDateTime(log.loginAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(log.status)}`}>
                            {log.status ? log.status.toUpperCase() : 'UNKNOWN'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.verified ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle size={16} />
                            Yes
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <XCircle size={16} />
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 font-mono">{log.ip || 'N/A'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === pageNum
                            ? 'bg-cyan-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginHistory;