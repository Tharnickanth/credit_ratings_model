'use client';
import React, { useState, useEffect } from 'react';
import { Eye, Clock, ThumbsUp, ThumbsDown, Users, UserPlus, Award, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const CustomerAssessmentApprovals = ({ onEdit, onApprovalComplete }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentTemplate, setAssessmentTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Confirmation modal states
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRemarksAlert, setShowRemarksAlert] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [pendingApprovalId, setPendingApprovalId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPendingAssessments();
  }, []);

  const loadPendingAssessments = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Loading pending assessments...');
      
      const response = await fetch('/api/customer-assessments?status=pending');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded assessments:', data);
        setAssessments(data.assessments || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load assessments:', errorData);
        setError(errorData.message || 'Failed to load assessments');
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
      setError('Failed to load assessments: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessmentTemplate = async (templateId) => {
    if (!templateId) {
      setError('Assessment template ID is missing');
      return;
    }

    try {
      setLoadingTemplate(true);
      setError('');
      console.log('Loading template with ID:', templateId);
      
      const response = await fetch(`/api/rating-assessments?id=${templateId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAssessmentTemplate(data.assessment);
        const expanded = {};
        data.assessment.categories?.forEach((cat, idx) => {
          expanded[idx] = true;
        });
        setExpandedCategories(expanded);
      } else {
        console.error('Failed to load template:', data);
        setError(data.message || 'Failed to load assessment template. The template may have been deleted.');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      setError('Failed to load assessment template details');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const toggleCategory = (categoryIndex) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex]
    }));
  };

  const calculateRating = (score) => {
    if (score >= 90) return { rating: 'A+', color: 'bg-green-600' };
    if (score >= 80) return { rating: 'A', color: 'bg-green-500' };
    if (score >= 70) return { rating: 'A-', color: 'bg-blue-600' };
    if (score >= 60) return { rating: 'B', color: 'bg-blue-500' };
    if (score >= 50) return { rating: 'C+', color: 'bg-yellow-600' };
    if (score >= 40) return { rating: 'C', color: 'bg-yellow-500' };
    if (score >= 30) return { rating: 'C-', color: 'bg-orange-500' };
    return { rating: 'D', color: 'bg-red-600' };
  };

  const handleApprove = async (assessmentId) => {
    setPendingApprovalId(assessmentId);
    setShowConfirmApprove(true);
  };

  const executeApprove = async () => {
    setShowConfirmApprove(false);
    const assessmentId = pendingApprovalId;

    setProcessing(true);
    setError('');
    
    try {
      console.log('Approving assessment ID:', assessmentId);
      
      // Get user from localStorage
      const user = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')) 
        : null;
      
      const response = await fetch(`/api/customer-assessments/${assessmentId}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'approved',
          approvedBy: user?.username || 'admin'
        })
      });

      console.log('Approve response status:', response.status);
      const result = await response.json();
      console.log('Approve result:', result);

      if (response.ok && result.success) {
        setModalMessage('Assessment approved successfully!');
        setShowSuccessModal(true);
        setShowModal(false);
        setSelectedAssessment(null);
        setAssessmentTemplate(null);
        await loadPendingAssessments();
        
        // Call the callback if provided
        if (onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        const errorMsg = result.message || 'Failed to approve assessment';
        setError(errorMsg);
        setModalMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error approving assessment:', error);
      const errorMsg = 'Failed to approve assessment: ' + error.message;
      setError(errorMsg);
      setModalMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setProcessing(false);
      setPendingApprovalId(null);
    }
  };

  const handleReject = (assessment) => {
    setSelectedAssessment(assessment);
    setShowModal(false);
    setShowRejectModal(true);
    setRejectionRemarks('');
    setError('');
  };

  const confirmReject = () => {
    if (!rejectionRemarks.trim()) {
      setShowRemarksAlert(true);
      return;
    }
    setShowConfirmReject(true);
  };

  const executeReject = async () => {
    setShowConfirmReject(false);
    setProcessing(true);
    setError('');
    
    try {
      console.log('Rejecting assessment ID:', selectedAssessment.id);
      
      // Get user from localStorage
      const user = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')) 
        : null;
      
      const response = await fetch(`/api/customer-assessments/${selectedAssessment.id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'rejected',
          remarks: rejectionRemarks.trim(),
          rejectedBy: user?.username || 'admin'
        })
      });

      console.log('Reject response status:', response.status);
      const result = await response.json();
      console.log('Reject result:', result);

      if (response.ok && result.success) {
        setModalMessage('Assessment rejected successfully!');
        setShowSuccessModal(true);
        setShowRejectModal(false);
        setSelectedAssessment(null);
        setAssessmentTemplate(null);
        setRejectionRemarks('');
        await loadPendingAssessments();
        
        // Call the callback if provided
        if (onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        const errorMsg = result.message || 'Failed to reject assessment';
        setError(errorMsg);
        setModalMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error rejecting assessment:', error);
      const errorMsg = 'Failed to reject assessment: ' + error.message;
      setError(errorMsg);
      setModalMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleView = async (assessment) => {
    setSelectedAssessment(assessment);
    setShowModal(true);
    setError('');
    setAssessmentTemplate(null);
    
    if (assessment.assessmentTemplateId) {
      await loadAssessmentTemplate(assessment.assessmentTemplateId);
    } else {
      setError('Assessment template information is missing');
    }
  };

  const getAnswerForQuestion = (questionId) => {
    // Check if answers are stored in 'responses' or 'answers' field
    const answers = selectedAssessment?.responses || selectedAssessment?.answers || [];
    return answers.find(r => r.questionId === questionId);
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

  // Pagination calculations
  const totalPages = Math.ceil(assessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssessments = assessments.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
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
          <p className="mt-4 text-gray-600">Loading pending assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Approvals</h2>
        <p className="text-gray-600">Review and approve or reject customer credit assessments</p>
      </div>

      {error && !showModal && !showRejectModal && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Pending Approval</p>
              <p className="text-4xl font-bold">{assessments.length}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Clock size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">New Customers</p>
              <p className="text-4xl font-bold">
                {assessments.filter(a => a.customerType === 'new').length}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <UserPlus size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Existing Customers</p>
              <p className="text-4xl font-bold">
                {assessments.filter(a => a.customerType === 'existing').length}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Users size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Results count and pagination info */}
      {assessments.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-4 px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(endIndex, assessments.length)}</span> of{' '}
            <span className="font-semibold text-gray-900">{assessments.length}</span> pending assessments
          </p>
          <p className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </p>
        </div>
      )}

      {/* Pending Assessments Table */}
      {assessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <ThumbsUp size={48} className="text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">There are no pending assessments to review at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">{assessment.customerName}</div>
                          <div className="text-sm text-gray-500">{assessment.customerId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assessment.customerType === 'new' ? (
                          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                            <UserPlus size={14} />
                            New
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                            <Users size={14} />
                            Existing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-gray-900">{assessment.totalScore?.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg ${ratingInfo.color} text-white font-bold`}>
                          <Award size={14} />
                          {ratingInfo.rating}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            const createdDate = new Date(assessment.createdAt);
                            const updatedDate = new Date(assessment.updatedAt);
                            const displayDate = createdDate.getTime() === updatedDate.getTime() 
                              ? createdDate 
                              : (updatedDate > createdDate ? updatedDate : createdDate);
                            
                            return formatDate(displayDate);
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleView(assessment)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                        >
                          <Eye size={16} />
                          Review
                        </button>
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

      {/* View/Review Modal */}
      {showModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Review Assessment</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-medium">{selectedAssessment.customerName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{selectedAssessment.customerId}</span>
                    {selectedAssessment.customerType === 'new' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                        <UserPlus size={14} />
                        New Customer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                        <Users size={14} />
                        Existing Customer
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setAssessmentTemplate(null);
                    setSelectedAssessment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer ID</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.customerId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIC</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.nic || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessed By</p>
                    <p className="font-medium text-gray-900">{selectedAssessment.assessedBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessment Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedAssessment.createdAt)}</p>
                  </div>
                  {selectedAssessment.rejectedAt && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Rejected By</p>
                        <p className="font-medium text-red-600">{selectedAssessment.rejectedBy || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rejected Date</p>
                        <p className="font-medium text-red-600">{formatDate(selectedAssessment.rejectedAt)}</p>
                      </div>
                    </>
                  )}
                  {(() => {
                    const createdDate = new Date(selectedAssessment.createdAt);
                    const updatedDate = new Date(selectedAssessment.updatedAt);
                    if (createdDate.getTime() !== updatedDate.getTime()) {
                      return (
                        <>
                          <div>
                            <p className="text-sm text-gray-600">Updated By</p>
                            <p className="font-medium text-gray-900">{selectedAssessment.updatedBy || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Last Update Date</p>
                            <p className="font-medium text-gray-900">{formatDate(selectedAssessment.updatedAt)}</p>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                  
                </div>
              </div>

              {/* Score Summary */}
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

              {/* Detailed Responses */}
              {loadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading assessment details...</span>
                </div>
              ) : assessmentTemplate ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Detailed Assessment Responses</h4>
                  {assessmentTemplate.categories?.map((category, catIdx) => {
                    const isExpanded = expandedCategories[catIdx];
                    return (
                      <div key={catIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(catIdx)}
                          className="w-full bg-blue-50 p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-800">
                              {catIdx + 1}. {category.categoryName}
                            </span>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                              {category.questions?.length || 0} Questions
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>

                        {isExpanded && (
                          <div className="p-4 space-y-4 bg-white">
                            {category.questions?.map((question, qIdx) => {
                              const selectedAnswer = getAnswerForQuestion(question.questionId);
                              const weight = selectedAssessment.customerType === 'new' 
                                ? question.proposedWeight?.new 
                                : question.proposedWeight?.existing;

                              return (
                                <div key={qIdx} className="border-l-4 border-blue-500 pl-4 bg-gray-50 rounded-r-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <h5 className="font-medium text-gray-800 flex-1">
                                      Q{qIdx + 1}: {question.text}
                                    </h5>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full ml-2">
                                      Weight: {weight}%
                                    </span>
                                  </div>

                                  <div className="space-y-2 mt-3">
                                    {question.answers?.map((answer, aIdx) => {
                                      const isSelected = selectedAnswer?.answerId === answer.answerId;
                                      const score = selectedAssessment.customerType === 'new' 
                                        ? answer.score?.new 
                                        : answer.score?.existing;

                                      return (
                                        <div
                                          key={aIdx}
                                          className={`p-3 rounded-lg border-2 ${
                                            isSelected
                                              ? 'border-green-500 bg-green-50'
                                              : 'border-gray-200 bg-white'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              {isSelected && (
                                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                                </div>
                                              )}
                                              <span className={`text-sm ${isSelected ? 'font-semibold text-green-800' : 'text-gray-700'}`}>
                                                {answer.text}
                                              </span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                              isSelected ? 'bg-green-200 text-green-800 font-semibold' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                              Score: {score}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {selectedAnswer && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Weighted Score for this question:</span>
                                        <span className="font-bold text-blue-600">
                                          {((selectedAnswer.score * weight) / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setAssessmentTemplate(null);
                  setSelectedAssessment(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={processing}
              >
                Close
              </button>
              <button
                onClick={() => handleReject(selectedAssessment)}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <ThumbsDown size={18} />
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedAssessment.id)}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <ThumbsUp size={18} />
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Reject Assessment</h3>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <p className="text-gray-600 mb-4">
                Please provide remarks for rejecting the assessment for <strong>{selectedAssessment.customerName}</strong>:
              </p>
              <textarea
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setShowModal(true);
                  setRejectionRemarks('');
                  setError('');
                }}
                disabled={processing}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={processing || !rejectionRemarks.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showConfirmApprove}
        onClose={() => setShowConfirmApprove(false)}
        onConfirm={executeApprove}
        title="Approve Assessment"
        message="Are you sure you want to approve this assessment?"
        confirmText="Approve"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationModal
        isOpen={showConfirmReject}
        onClose={() => setShowConfirmReject(false)}
        onConfirm={executeReject}
        title="Reject Assessment"
        message="Are you sure you want to reject this assessment?"
        confirmText="Reject"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title="Success"
        message={modalMessage}
        confirmText="OK"
        cancelText="Close"
        type="info"
      />

      <ConfirmationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Error"
        message={modalMessage}
        confirmText="OK"
        cancelText="Close"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showRemarksAlert}
        onClose={() => setShowRemarksAlert(false)}
        onConfirm={() => setShowRemarksAlert(false)}
        title="Missing Remarks"
        message="Please provide rejection remarks"
        confirmText="OK"
        cancelText="Close"
        type="warning"
      />
    </div>
  );
};

export default CustomerAssessmentApprovals;