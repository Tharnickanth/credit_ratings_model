'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Calendar, User, Download } from 'lucide-react';

const ActivityLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const recordsPerPage = 10;

  useEffect(() => {
    // Get current user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setCurrentUser(userData);
    }
    
    loadActivityLogs();
  }, []);

  useEffect(() => {
    filterLogs();
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, searchTerm, filterUser, fromDate, toDate]);

  const loadActivityLogs = async () => {
    try {
      setIsLoading(true);
      // Remove the limit parameter to fetch ALL records
      const response = await fetch('/api/activity-logs');
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to parse date string (handles various formats)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Try different date formats
    // Format 1: DD/MM/YYYY
    const parts1 = dateStr.split('/');
    if (parts1.length === 3) {
      return new Date(parts1[2], parts1[1] - 1, parts1[0]);
    }
    
    // Format 2: YYYY-MM-DD
    const parts2 = dateStr.split('-');
    if (parts2.length === 3) {
      return new Date(parts2[0], parts2[1] - 1, parts2[2]);
    }
    
    // Format 3: MM/DD/YYYY
    return new Date(dateStr);
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by user
    if (filterUser !== 'all') {
      filtered = filtered.filter(log => log.username === filterUser);
    }

    // Filter by date range
    if (fromDate || toDate) {
      filtered = filtered.filter(log => {
        const logDate = parseDate(log.date);
        if (!logDate) return false;

        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        // Set time to start of day for comparison
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        logDate.setHours(0, 0, 0, 0);

        if (from && to) {
          return logDate >= from && logDate <= to;
        } else if (from) {
          return logDate >= from;
        } else if (to) {
          return logDate <= to;
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.username?.toLowerCase().includes(searchLower) ||
          log.description?.toLowerCase().includes(searchLower) ||
          log.date?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredLogs(filtered);
  };

  const downloadAsExcel = () => {
    setIsDownloading(true);
    
    try {
      // Create CSV content
      const headers = ['User', 'Description', 'Date', 'Time'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          `"${log.username || ''}"`,
          `"${(log.description || '').replace(/"/g, '""')}"`,
          `"${log.date || ''}"`,
          `"${log.time || ''}"`
        ].join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, and pages around current page
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Activity Logs</h2>
          <p className="text-gray-600">Track all system activities and user actions</p>
        </div>
        
        {/* Download Button */}
        <button
          onClick={downloadAsExcel}
          disabled={isDownloading || filteredLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Download size={20} />
          {isDownloading ? 'Downloading...' : 'Download Excel'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
            >
              <option value="all">All Users</option>
              {[...new Set(logs.map(log => log.username))].sort().map(username => (
                <option key={username} value={username}>{username}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>
        
        {/* Total records indicator */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Total Records: {filteredLogs.length.toLocaleString()}
            {(fromDate || toDate) && (
              <span className="ml-2 text-blue-600">
                {fromDate && toDate 
                  ? `(${fromDate} to ${toDate})`
                  : fromDate 
                  ? `(from ${fromDate})`
                  : `(up to ${toDate})`
                }
              </span>
            )}
          </div>
          {(filterUser !== 'all' || fromDate || toDate || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterUser('all');
                setFromDate('');
                setToDate('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Activity Log Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Activity className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500 mb-2">No activity logs found</p>
          <p className="text-sm text-gray-400">
            {searchTerm || filterUser !== 'all' || fromDate || toDate
              ? 'Try adjusting your filters' 
              : 'Activity will appear here as users perform actions'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLogs.map((log, index) => (
                  <tr key={log.id || `${startIndex + index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-900">{log.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{log.description}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-400" size={16} />
                        <span className="text-sm text-gray-600">{log.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{log.time}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length.toLocaleString()} activity logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {getPageNumbers().map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogViewer;