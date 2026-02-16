'use client';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, UserPlus, Award, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const CustomerAssessmentManager = ({ refreshTrigger }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAssessments();
  }, [refreshTrigger]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer-assessments/manage');
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

  // Toggle visibility (hide/visible)
  const handleToggleVisibility = (assessment) => {
    const newVisibility = !assessment.isDeleted;
    const action = newVisibility ? 'hide' : 'make visible';
    
    // Store the action to be executed after confirmation
    setConfirmAction({
      assessment,
      newVisibility,
      action
    });
    setShowConfirmModal(true);
  };

  const executeToggleVisibility = async () => {
    if (!confirmAction) return;
    
    const { assessment, newVisibility, action } = confirmAction;
    const actionPast = newVisibility ? 'hidden' : 'made visible';
    
    setShowConfirmModal(false);
    
    try {
      // Get current user from localStorage for activity logging
      const currentUser = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')).username 
        : 'Unknown User';

      const response = await fetch('/api/customer-assessments/visibility', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: assessment.id,
          isDeleted: newVisibility,
          username: currentUser  // Added for activity logging
        }),
      });

      if (response.ok) {
        // Reload assessments to reflect the change
        await loadAssessments();
      } else {
        console.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    } finally {
      setConfirmAction(null);
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

  const getVisibilityBadge = (isDeleted) => {
    if (isDeleted) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <EyeOff size={14} />
          Hidden
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Eye size={14} />
          Visible
        </span>
      );
    }
  };

  const filteredAssessments = assessments.sort((a, b) => {
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
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Customer Assessments Manager</h2>
            <p className="text-gray-600 mt-1">Manage visibility of customer rating assessments</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading assessments...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Results Count */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredAssessments.length)} of {filteredAssessments.length} assessments
            </p>
          </div>

          {/* Table */}
          {currentAssessments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No assessments found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visibility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentAssessments.map((assessment) => {
                    const ratingInfo = calculateRating(assessment.totalScore);
                    return (
                      <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {assessment.customerName?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {assessment.customerName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {assessment.customerId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getCustomerTypeBadge(assessment.customerType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {assessment.totalScore?.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${ratingInfo.color} text-white`}>
                            <Award size={16} />
                            <span className="font-semibold">{ratingInfo.rating}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getApprovalStatusBadge(assessment.approvalStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getVisibilityBadge(assessment.isDeleted)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(getDisplayDate(assessment))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(assessment)}
                              className="flex items-center justify-center gap-2 w-28 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                              View
                            </button>
                            <button
                              onClick={() => handleToggleVisibility(assessment)}
                              className={`flex items-center justify-center gap-2 w-28 px-4 py-2 rounded-lg font-medium transition-all ${
                                assessment.isDeleted 
                                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                                  : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                              }`}
                              title={assessment.isDeleted ? 'Make Visible' : 'Hide'}
                            >
                              {assessment.isDeleted ? (
                                <>
                                  <Eye size={18} />
                                  Visible
                                </>
                              ) : (
                                <>
                                  <EyeOff size={18} />
                                  Hide
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredAssessments.length > itemsPerPage && (
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
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">{selectedAssessment.customerName}</span>
                    {getCustomerTypeBadge(selectedAssessment.customerType)}
                    {getApprovalStatusBadge(selectedAssessment.approvalStatus)}
                    {getVisibilityBadge(selectedAssessment.isDeleted)}
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
                  {(() => {
                    const latestDate = getDisplayDate(selectedAssessment);
                    const createdDate = selectedAssessment.createdAt;
                    const shouldShowUpdated = latestDate && createdDate && latestDate !== createdDate;
                    
                    return shouldShowUpdated ? (
                      <div>
                        <p className="text-sm text-gray-600">Last Updated</p>
                        <p className="font-medium text-gray-900">{formatDate(latestDate)}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

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

              {selectedAssessment.approvalStatus === 'rejected' && selectedAssessment.rejectionRemarks && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-red-800 mb-2">Rejection Remarks</h4>
                  <p className="text-sm text-red-700">{selectedAssessment.rejectionRemarks}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        onConfirm={executeToggleVisibility}
        title={confirmAction?.newVisibility ? 'Hide Assessment' : 'Make Assessment Visible'}
        message={
          confirmAction 
            ? `Are you sure you want to ${confirmAction.action} the assessment for "${confirmAction.assessment.customerName}"?`
            : ''
        }
        confirmText={confirmAction?.newVisibility ? 'Hide' : 'Make Visible'}
        cancelText="Cancel"
        type={confirmAction?.newVisibility ? 'danger' : 'info'}
      />
    </div>
  );
};

export default CustomerAssessmentManager;