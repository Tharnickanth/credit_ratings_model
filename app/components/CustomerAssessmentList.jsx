'use client';
import React, { useState, useEffect } from 'react';
import { Eye, Search, User, CreditCard, TrendingUp, ChevronDown, Users, UserPlus, Award, Edit2, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const CustomerAssessmentList = ({ onEdit, onCreateNew, refreshTrigger }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAssessments();
  }, [refreshTrigger]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer-assessments');
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (assessment) => {
    setSelectedAssessment(assessment);
    setShowViewModal(true);
  };

  const handleEdit = (assessment) => {
    console.log('🎯 CustomerAssessmentList: Edit clicked for assessment:', assessment.id);
    if (onEdit) {
      onEdit(assessment);
    } else {
      console.error('❌ onEdit prop is not defined!');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get the latest date from createdAt, updatedAt, approvedAt, rejectedAt
  const getDisplayDate = (assessment) => {
    const dates = [
      assessment.createdAt,
      assessment.updatedAt,
      assessment.approvedAt,
      assessment.rejectedAt
    ].filter(date => date != null); // Filter out null/undefined values

    if (dates.length === 0) return null;

    // Convert to Date objects and find the maximum
    const latestDate = dates.reduce((latest, current) => {
      const currentDate = new Date(current);
      const latestDateObj = new Date(latest);
      return currentDate > latestDateObj ? current : latest;
    });

    return latestDate;
  };

  const calculateRating = (score) => {
    if (score >= 90) return { rating: 'A+', color: 'bg-green-600', textColor: 'text-green-600' };
    if (score >= 80) return { rating: 'A', color: 'bg-green-500', textColor: 'text-green-500' };
    if (score >= 70) return { rating: 'A-', color: 'bg-blue-600', textColor: 'text-blue-600' };
    if (score >= 60) return { rating: 'B', color: 'bg-blue-500', textColor: 'text-blue-500' };
    if (score >= 50) return { rating: 'C+', color: 'bg-yellow-600', textColor: 'text-yellow-600' };
    if (score >= 40) return { rating: 'C', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    if (score >= 30) return { rating: 'C-', color: 'bg-orange-500', textColor: 'text-orange-500' };
    return { rating: 'D', color: 'bg-red-600', textColor: 'text-red-600' };
  };

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock size={14} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getCustomerTypeBadge = (customerType) => {
    if (customerType === 'new') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
          <UserPlus size={14} />
          New
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
          <Users size={14} />
          Existing
        </span>
      );
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = 
      assessment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.nic?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTypeFilter = 
      filterType === 'all' || 
      assessment.customerType === filterType;

    const matchesStatusFilter = 
      filterStatus === 'all' || 
      assessment.approvalStatus === filterStatus;

    return matchesSearch && matchesTypeFilter && matchesStatusFilter;
  }).sort((a, b) => {
    // Sort by latest date in descending order (newest first)
    const dateA = new Date(getDisplayDate(a));
    const dateB = new Date(getDisplayDate(b));
    return dateB - dateA;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssessments = filteredAssessments.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: assessments.length,
    pending: assessments.filter(a => a.approvalStatus === 'pending').length,
    approved: assessments.filter(a => a.approvalStatus === 'approved').length,
    rejected: assessments.filter(a => a.approvalStatus === 'rejected').length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Customer Assessments</h2>
            <p className="text-gray-600 mt-1">View and manage customer rating assessments</p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <UserPlus size={20} />
            New Assessment
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total</p>
                <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <CreditCard size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Pending</p>
                <p className="text-4xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Approved</p>
                <p className="text-4xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Rejected</p>
                <p className="text-4xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, ID, or NIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Customer Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Customer Types</option>
            <option value="new">New Customers</option>
            <option value="existing">Existing Customers</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredAssessments.length)} of {filteredAssessments.length} assessments
      </div>

      {/* Table */}
      {currentAssessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Users size={64} className="mx-auto opacity-50" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Get started by creating your first customer assessment'}
          </p>
          {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={20} />
              Create First Assessment
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentAssessments.map((assessment) => {
                  const ratingInfo = calculateRating(assessment.totalScore);
                  return (
                    <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{assessment.customerName}</p>
                            <p className="text-sm text-gray-500">{assessment.customerId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getCustomerTypeBadge(assessment.customerType)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{assessment.assessmentTemplateName || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-gray-900">{assessment.totalScore?.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${ratingInfo.color} text-white font-bold shadow-sm`}>
                          <Award size={16} />
                          {ratingInfo.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getApprovalStatusBadge(assessment.approvalStatus)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{formatDate(getDisplayDate(assessment))}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleView(assessment)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye size={16} />
                            View
                          </button>
                          {assessment.approvalStatus === 'rejected' && (
                            <button
                              onClick={() => handleEdit(assessment)}
                              className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                            >
                              <Edit2 size={16} />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    currentPage === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                      {page === '...' ? (
                        <span className="px-3 py-2 text-gray-400">...</span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    currentPage === totalPages
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Assessment Details</h3>
                  {selectedAssessment.assessmentTemplateName && (
                    <p className="text-sm text-gray-500 mb-2">
                      Template: <span className="font-medium text-gray-700">{selectedAssessment.assessmentTemplateName}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">{selectedAssessment.customerName}</span>
                    {getCustomerTypeBadge(selectedAssessment.customerType)}
                    {getApprovalStatusBadge(selectedAssessment.approvalStatus)}
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer ID</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.customerId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIC</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.nic}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessment Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedAssessment.assessmentDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessed By</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.assessedBy || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedAssessment.approvalStatus === 'rejected' && selectedAssessment.rejectionRemarks && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-red-800 mb-3">Rejection Information</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {selectedAssessment.rejectedAt && (
                      <div>
                        <p className="text-sm text-red-600">Rejected Date</p>
                        <p className="font-medium text-red-900">{formatDate(selectedAssessment.rejectedAt)}</p>
                      </div>
                    )}
                    {selectedAssessment.rejectedBy && (
                      <div>
                        <p className="text-sm text-red-600">Rejected By</p>
                        <p className="font-medium text-red-900">{selectedAssessment.rejectedBy}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-red-600 mb-1">Rejection Remarks</p>
                    <p className="text-sm text-red-700">{selectedAssessment.rejectionRemarks}</p>
                  </div>
                </div>
              )}

              {selectedAssessment.updatedAt && selectedAssessment.updatedAt !== selectedAssessment.createdAt && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-3">Update Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Latest Updated Date</p>
                      <p className="font-medium text-blue-900">{formatDate(selectedAssessment.updatedAt)}</p>
                    </div>
                    {selectedAssessment.updatedBy && (
                      <div>
                        <p className="text-sm text-blue-600">Updated By</p>
                        <p className="font-medium text-blue-900">{selectedAssessment.updatedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedAssessment.approvalStatus === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-800 mb-3">Approval Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAssessment.approvedAt && (
                      <div>
                        <p className="text-sm text-green-600">Approved Date</p>
                        <p className="font-medium text-green-900">{formatDate(selectedAssessment.approvedAt)}</p>
                      </div>
                    )}
                    {selectedAssessment.approvedBy && (
                      <div>
                        <p className="text-sm text-green-600">Approved By</p>
                        <p className="font-medium text-green-900">{selectedAssessment.approvedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-800 mb-4">Score Summary & Rating</h4>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Score</p>
                    <p className="text-4xl font-bold text-gray-900">{selectedAssessment.totalScore?.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-2">Credit Rating</p>
                    {(() => {
                      const ratingInfo = calculateRating(selectedAssessment.totalScore);
                      return (
                        <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl ${ratingInfo.color} text-white shadow-lg`}>
                          <Award size={28} />
                          <span className="text-4xl font-bold">{ratingInfo.rating}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {selectedAssessment.categoryScores && selectedAssessment.categoryScores.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Category Breakdown:</p>
                    {selectedAssessment.categoryScores.map((category, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded p-3">
                        <span className="text-sm text-gray-700">{category.categoryName}</span>
                        <span className="font-semibold text-gray-900">{category.score?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div>
                {selectedAssessment.approvalStatus === 'rejected' && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(selectedAssessment);
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Edit2 size={18} />
                    Edit & Resubmit
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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

export default CustomerAssessmentList;