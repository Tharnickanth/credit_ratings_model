'use client';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X, AlertCircle, CheckCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const AssessmentManager = () => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
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
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rating-assessments/manage');
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
      setErrorMessage('Failed to load assessments');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (assessment) => {
    setSelectedAssessment(assessment);
    setShowViewModal(true);
  };

  const handleToggleVisibility = (assessment) => {
    const action = assessment.isDeleted ? 'visual' : 'hide';
    const actionText = assessment.isDeleted ? 'make visible' : 'hide';
    
    setConfirmModal({
      isOpen: true,
      title: `Confirm ${action === 'visual' ? 'Visibility' : 'Hide'}`,
      message: `Are you sure you want to ${actionText} the assessment "${assessment.name}"?`,
      onConfirm: () => confirmToggleVisibility(assessment, action),
      type: action === 'hide' ? 'warning' : 'info'
    });
  };

  const confirmToggleVisibility = async (assessment, action) => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    setProcessing(true);

    try {
      // Get current user from localStorage for activity logging
      const currentUser = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')).username 
        : 'Unknown User';

      const response = await fetch('/api/rating-assessments/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: assessment.id,
          action: action,
          username: currentUser  // Added for activity logging
          // Don't send updatedBy - only update isDeleted field
        })
      });

      const result = await response.json();

      if (response.ok) {
        const actionText = action === 'visual' ? 'made visible' : 'hidden';
        setSuccessMessage(`Assessment "${assessment.name}" has been ${actionText} successfully!`);
        setTimeout(() => setSuccessMessage(''), 5000);
        
        // Reload data
        loadAssessments();
      } else {
        setErrorMessage(result.message || 'Failed to update assessment');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating assessment:', error);
      setErrorMessage('Failed to update assessment. Please try again.');
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

  const getStatusBadge = (assessment) => {
    // Always display approvalStatus regardless of visibility (isDeleted) state
    if (assessment.approvalStatus === 'approved') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Approved
        </span>
      );
    }
    
    if (assessment.approvalStatus === 'rejected') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Rejected
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Credit Rating Assessment Templates</h2>
        <p className="text-gray-600">Manage visibility of approved assessment templates</p>
      </div>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[9999] max-w-[calc(100vw-1rem)] sm:max-w-md animate-slide-in">
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-green-800">Success</h4>
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-600 hover:text-green-700">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[9999] max-w-[calc(100vw-1rem)] sm:max-w-md animate-slide-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Error</h4>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage('')} className="ml-auto text-red-600 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 md:p-12 text-center">
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No assessment templates found</p>
          <p className="text-gray-400 text-sm mt-2">Create and approve templates to manage them here</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View - Hidden on mobile */}
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
                      Visibility
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
                  {assessments.map((assessment) => {
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
                          <div className="text-xs text-gray-500">
                            {assessment.categories.length} {assessment.categories.length === 1 ? 'Category' : 'Categories'} • {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(assessment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assessment.isDeleted ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <EyeOff size={16} />
                              <span className="text-sm">Hidden</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-green-600">
                              <Eye size={16} />
                              <span className="text-sm">Visible</span>
                            </div>
                          )}
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
                            {assessment.isDeleted ? (
                              <button
                                onClick={() => handleToggleVisibility(assessment)}
                                disabled={processing}
                                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 min-w-[100px]"
                                title="Make Visible"
                              >
                                <Eye size={16} />
                                <span>Visible</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleVisibility(assessment)}
                                disabled={processing}
                                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 min-w-[100px]"
                                title="Hide Assessment"
                              >
                                <EyeOff size={16} />
                                <span>Hide</span>
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
          </div>

          {/* Mobile Card View - Shown only on mobile */}
          <div className="md:hidden space-y-4">
            {assessments.map((assessment) => {
              const totalQuestions = assessment.categories.reduce(
                (sum, cat) => sum + cat.questions.length,
                0
              );

              return (
                <div key={assessment.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{assessment.name}</h3>
                    <div className="flex gap-2 flex-wrap">
                      {getStatusBadge(assessment)}
                      {assessment.isDeleted ? (
                        <span className="px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          <EyeOff size={14} />
                          Hidden
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          <Eye size={14} />
                          Visible
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>
                      <div className="font-medium mb-1">Submitted:</div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-600">Created by:</div>
                        <div className="font-medium text-gray-900 text-sm">
                          {assessment.createdBy || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(assessment.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Categories:</span>
                      <span>{assessment.categories.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Questions:</span>
                      <span>{totalQuestions}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleViewDetails(assessment)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                      <span>View</span>
                    </button>
                    {assessment.isDeleted ? (
                      <button
                        onClick={() => handleToggleVisibility(assessment)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Eye size={18} />
                        <span>Visible</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleVisibility(assessment)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <EyeOff size={18} />
                        <span>Hide</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 break-words">{selectedAssessment.name}</h3>
                  <div className="flex gap-3 text-sm text-gray-600 flex-wrap">
                    <span>Updated: {formatDate(selectedAssessment.updatedAt)}</span>
                    {selectedAssessment.updatedBy && (
                      <span>• By: {selectedAssessment.updatedBy}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div>{getStatusBadge(selectedAssessment)}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Visibility</div>
                  {selectedAssessment.isDeleted ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <EyeOff size={18} />
                      <span className="font-medium">Hidden</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-700">
                      <Eye size={18} />
                      <span className="font-medium">Visible</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-800">Categories & Questions</h4>
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
                            <div className="flex gap-3 text-sm flex-wrap">
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
                                <div className="flex gap-2 ml-4 flex-wrap">
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

            <div className="p-6 border-t border-gray-200 flex justify-end">
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
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Yes, Confirm"
        cancelText="Cancel"
        type={confirmModal.type}
      />
    </div>
  );
};

export default AssessmentManager;