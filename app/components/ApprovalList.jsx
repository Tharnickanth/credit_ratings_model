'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, AlertCircle, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ApprovalList = ({ onApprovalComplete }) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Toast messages state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/approvals');
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.approvals || []);
        setCurrentPage(1); // Reset to first page when data is reloaded
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
      setErrorMessage('Failed to load pending approvals');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(pendingApprovals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApprovals = pendingApprovals.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleViewDetails = (assessment) => {
    setSelectedAssessment(assessment);
    setShowViewModal(true);
  };

  const handleApprovalAction = (assessment, action) => {
    setSelectedAssessment(assessment);
    setActionType(action);
    setShowViewModal(false);
    setShowActionModal(true);
  };

  const handleConfirmActionModal = () => {
    // Validate comments for rejection
    if (actionType === 'reject' && !comments.trim()) {
      setErrorMessage('Please provide a reason for rejection');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    // Close the action modal first
    setShowActionModal(false);

    // Show confirmation modal after a small delay
    setTimeout(() => {
      const isApproval = actionType === 'approve';
      setConfirmModal({
        isOpen: true,
        title: isApproval ? 'Confirm Approval' : 'Confirm Rejection',
        message: isApproval 
          ? `Are you sure you want to APPROVE the assessment "${selectedAssessment?.name}"? Once approved, this template will be active and available for use.`
          : `Are you sure you want to REJECT the assessment "${selectedAssessment?.name}"? The submitter will need to make corrections and resubmit.`,
        onConfirm: confirmApproval,
        type: isApproval ? 'info' : 'warning'
      });
    }, 100);
  };

  const confirmApproval = async () => {
    if (!selectedAssessment || !actionType) return;

    // Close confirmation modal first
    setConfirmModal({ ...confirmModal, isOpen: false });
    setProcessing(true);

    try {
      const user = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')) 
        : null;
      
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          action: actionType,
          approvedBy: user?.username || 'admin',
          comments: comments
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Reset modal states first
        setComments('');
        const tempAssessmentName = selectedAssessment.name;
        const tempActionType = actionType;
        setSelectedAssessment(null);
        setActionType(null);
        
        // Show success message after a brief delay to ensure modals are closed
        setTimeout(() => {
          const actionText = tempActionType === 'approve' ? 'approved' : 'rejected';
          setSuccessMessage(`Assessment "${tempAssessmentName}" has been ${actionText} successfully!`);
          setTimeout(() => setSuccessMessage(''), 5000);
        }, 100);
        
        // Reload data
        loadPendingApprovals();
        
        if (onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        // Show error message
        setErrorMessage(result.message || 'Failed to process approval');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setErrorMessage('Failed to process approval. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Credit Rating Assessment Template Approvals</h2>
        <p className="text-gray-600">Review and approve or reject credit rating assessment templates</p>
      </div>

      {/* Success Message Toast - Fixed Position with high z-index */}
      {successMessage && (
        <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[9999] max-w-[calc(100vw-1rem)] sm:max-w-md animate-slide-in">
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-green-800">Success</h4>
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
            <button 
              onClick={() => setSuccessMessage('')}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[9999] max-w-[calc(100vw-1rem)] sm:max-w-md animate-slide-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Error</h4>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage('')}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {pendingApprovals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pending Approvals</h3>
          <p className="text-gray-600">There are currently no assessment templates waiting for approval.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentApprovals.map((assessment) => {
                    const totalQuestions = assessment.categories.reduce(
                      (sum, cat) => sum + cat.questions.length,
                      0
                    );

                    return (
                      <tr key={assessment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-[200px] lg:max-w-xs truncate" title={assessment.name}>
                            {assessment.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {assessment.updatedBy && assessment.updatedAt ? (
                              <>
                                <div className="mb-2">
                                  <div className="text-gray-700 font-medium">
                                    Updated by: {assessment.updatedBy}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {formatDate(assessment.updatedAt)}
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                  <div className="text-gray-600 text-xs">
                                    Created by: {assessment.createdBy || 'Unknown'}
                                  </div>
                                  <div className="text-gray-400 text-xs">
                                    {formatDate(assessment.createdAt)}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-gray-700 font-medium">
                                  Created by: {assessment.createdBy || 'Unknown'}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {formatDate(assessment.createdAt)}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(assessment)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleApprovalAction(assessment, 'approve')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={16} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprovalAction(assessment, 'reject')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View - Shown only on mobile */}
          <div className="md:hidden space-y-4">
            {currentApprovals.map((assessment) => {
              const totalQuestions = assessment.categories.reduce(
                (sum, cat) => sum + cat.questions.length,
                0
              );

              return (
                <div key={assessment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
                        {assessment.name}
                      </h3>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
                        Pending
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      {assessment.updatedBy && assessment.updatedAt ? (
                        <>
                          <div>
                            <div className="text-gray-700 font-medium">
                              Updated by: {assessment.updatedBy}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {formatDate(assessment.updatedAt)}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-gray-200">
                            <div className="text-gray-600 text-xs">
                              Created by: {assessment.createdBy || 'Unknown'}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {formatDate(assessment.createdAt)}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-gray-700 font-medium">
                            Created by: {assessment.createdBy || 'Unknown'}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDate(assessment.createdAt)}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleViewDetails(assessment)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={18} />
                        View Details
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprovalAction(assessment, 'approve')}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(assessment, 'reject')}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, pendingApprovals.length)}</span> of{' '}
                <span className="font-medium">{pendingApprovals.length}</span> approvals
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white font-medium'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <span key={pageNumber} className="px-2 py-2 text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl my-8 max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedAssessment.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Review assessment template details</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Categories</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedAssessment.categories.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">Total Questions</p>
                  <p className="text-2xl font-bold text-green-900">
                    {selectedAssessment.categories.reduce((sum, cat) => sum + cat.questions.length, 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {selectedAssessment.categories.map((cat, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
                      <h5 className="text-lg font-semibold text-gray-800">{cat.categoryName}</h5>
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {cat.questions.length} {cat.questions.length === 1 ? 'Question' : 'Questions'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {cat.questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="mb-3">
                            <div className="font-medium text-gray-800 mb-3">
                              Q{qIdx + 1}: {q.text}
                            </div>
                            <div className="flex gap-3 text-sm">
                              <span className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                <span className="text-blue-700 font-medium">New Customer Weight:</span>{' '}
                                <span className="text-blue-900 font-semibold">{q.proposedWeight?.new || 0}%</span>
                              </span>
                              <span className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                                <span className="text-green-700 font-medium">Existing Customer Weight:</span>{' '}
                                <span className="text-green-900 font-semibold">{q.proposedWeight?.existing || 0}%</span>
                              </span>
                            </div>
                          </div>
                          
                          {/* Answers Section */}
                          <div className="ml-2 mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">Answers:</p>
                            {q.answers && q.answers.map((answer, aIdx) => (
                              <div key={aIdx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-800">
                                    {aIdx + 1}. {answer.text}
                                  </span>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                    New: {answer.score?.new || 0}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                    Existing: {answer.score?.existing || 0}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprovalAction(selectedAssessment, 'approve')}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle size={18} />
                  Approve
                </button>
                <button
                  onClick={() => handleApprovalAction(selectedAssessment, 'reject')}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle size={18} />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal (Add Comments First) */}
      {showActionModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                {actionType === 'approve' ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <XCircle className="text-red-600" size={24} />
                )}
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                  {actionType === 'approve' ? 'Approve' : 'Reject'} Assessment
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                {selectedAssessment.name}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Categories:</strong> {selectedAssessment.categories.length}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Total Questions:</strong> {selectedAssessment.categories.reduce((sum, cat) => sum + cat.questions.length, 0)}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={actionType === 'reject' ? 'Please provide a reason for rejection' : 'Add any comments (optional)'}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {actionType === 'reject' && !comments.trim() && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Please provide a reason for rejection to help the submitter understand the issues.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setComments('');
                  setSelectedAssessment(null);
                  setActionType(null);
                }}
                disabled={processing}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActionModal}
                disabled={processing || (actionType === 'reject' && !comments.trim())}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : `Continue`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          // Reset everything if user cancels
          setComments('');
          setSelectedAssessment(null);
          setActionType(null);
        }}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={actionType === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
        cancelText="Cancel"
        type={confirmModal.type}
      />
    </div>
  );
};

export default ApprovalList;