'use client';
import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Plus, Search, Calendar, Filter, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const RatingAssessmentList = ({ onCreateNew, onEdit, refreshTrigger }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, approved, pending, rejected
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  useEffect(() => {
    loadAssessments();
  }, []);
  
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      console.log('Refresh trigger changed, reloading assessments...');
      loadAssessments();
    }
  }, [refreshTrigger]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rating-assessments');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded assessments:', data.assessments);
        setAssessments(data.assessments || []);
        setCurrentPage(1); // Reset to first page when data is reloaded
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
      setErrorMessage('Failed to load assessments');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (assessment) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Assessment',
      message: `Are you sure you want to delete "${assessment.name}"? This action cannot be undone and will permanently remove this assessment template along with all its categories, questions, and answers.`,
      onConfirm: async () => {
        try {
          // Get current user for logging
          const currentUser = typeof window !== 'undefined' && localStorage.getItem('user') 
            ? JSON.parse(localStorage.getItem('user')).username 
            : 'Unknown User';

          const response = await fetch(`/api/rating-assessments?id=${assessment.id}&deletedBy=${encodeURIComponent(currentUser)}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            setSuccessMessage('Assessment deleted successfully');
            setTimeout(() => setSuccessMessage(''), 5000);
            loadAssessments();
          } else {
            const error = await response.json();
            setErrorMessage(error.message || 'Failed to delete assessment');
            setTimeout(() => setErrorMessage(''), 5000);
          }
        } catch (error) {
          console.error('Error deleting assessment:', error);
          setErrorMessage('Failed to delete assessment');
          setTimeout(() => setErrorMessage(''), 5000);
        } finally {
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      },
      type: 'danger'
    });
  };

  const handleView = (assessment) => {
    setSelectedAssessment(assessment);
    setShowViewModal(true);
  };

  const handleEdit = (assessment) => {
    console.log('=== Edit Button Clicked in List ===');
    console.log('Assessment:', assessment);
    console.log('Assessment ID:', assessment.id);
    
    // Pass the assessment ID to the parent component
    if (onEdit && typeof onEdit === 'function') {
      console.log('Calling onEdit callback with ID:', assessment.id);
      onEdit(assessment.id);
    } else {
      console.error('onEdit callback is not defined or not a function!');
      setErrorMessage('Edit function is not available. Please check the component setup.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (assessment) => {
    const approvalStatus = assessment.approvalStatus;
    
    if (approvalStatus === 'rejected') {
      return (
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-700">
          Rejected - Needs Revision
        </span>
      );
    }
    
    if (approvalStatus === 'approved') {
      return (
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
          Approved
        </span>
      );
    }
    
    if (approvalStatus === 'pending') {
      return (
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
          Pending Approval
        </span>
      );
    }

    return null;
  };

  // Filter assessments based on active tab and search term
  const getFilteredAssessments = () => {
    let filtered = assessments;

    // Filter by tab
    if (activeTab === 'approved') {
      filtered = filtered.filter(a => a.approvalStatus === 'approved');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(a => a.approvalStatus === 'pending');
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter(a => a.approvalStatus === 'rejected');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(assessment => {
        const nameMatch = assessment.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = assessment.categories && Array.isArray(assessment.categories) && 
          assessment.categories.some(cat => 
            cat.categoryName && cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        return nameMatch || categoryMatch;
      });
    }

    return filtered;
  };

  const filteredAssessments = getFilteredAssessments();

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssessments = filteredAssessments.slice(startIndex, endIndex);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Get counts for each status
  const approvedCount = assessments.filter(a => a.approvalStatus === 'approved').length;
  const pendingCount = assessments.filter(a => a.approvalStatus === 'pending').length;
  const rejectedCount = assessments.filter(a => a.approvalStatus === 'rejected').length;

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

  return (
    <div className="p-8">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
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

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
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

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Credit Rating Assessment Templates</h2>
        <p className="text-gray-600">Manage your credit rating assessment templates</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Assessments
              <span className="ml-2 bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                {assessments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approved'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved
              <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                {approvedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-yellow-600 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approval
              <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'rejected'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected
              <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                {rejectedCount}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Create Button */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search assessments by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus size={20} />
          Create New Assessment
        </button>
      </div>

      {/* Assessment List */}
      {filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Filter size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No assessments found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? "Try adjusting your search criteria or filters"
              : "Get started by creating your first assessment template"
            }
          </p>
          {!searchTerm && assessments.length === 0 && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Your First Assessment
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentAssessments.map((assessment) => {
              const isApproved = assessment.approvalStatus === 'approved';
              const isPending = assessment.approvalStatus === 'pending';
              const isRejected = assessment.approvalStatus === 'rejected';

              return (
                <div
                  key={assessment.id}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 ${
                    isApproved ? 'border-green-500' : 
                    isPending ? 'border-yellow-500' : 
                    isRejected ? 'border-red-500' : 
                    'border-gray-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          {assessment.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>{formatDate(assessment.createdAt)}</span>
                          </div>
                          {getStatusBadge(assessment)}
                        </div>
                        {isRejected && assessment.approvalComments && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-700">{assessment.approvalComments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(assessment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={20} />
                        </button>
                        {!isApproved && (
                          <>
                            <button
                              onClick={() => handleEdit(assessment)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Assessment"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => handleDelete(assessment)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Assessment"
                            >
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Categories:</h4>
                      <div className="flex flex-wrap gap-2">
                        {assessment.categories && Array.isArray(assessment.categories) && assessment.categories.map((cat, idx) => (
                          <span
                            key={cat.id || idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700"
                          >
                            {cat.categoryName}
                            <span className="ml-2 text-xs bg-blue-200 px-2 py-0.5 rounded-full">
                              {cat.questions ? cat.questions.length : 0}
                            </span>
                          </span>
                        ))}
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
                <span className="font-medium">{Math.min(endIndex, filteredAssessments.length)}</span> of{' '}
                <span className="font-medium">{filteredAssessments.length}</span> assessments
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

      {/* View Modal */}
      {showViewModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedAssessment.name}
                  </h3>
                  <div className="mb-3">
                    {getStatusBadge(selectedAssessment)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {formatDate(selectedAssessment.createdAt)}</span>
                    <span>•</span>
                    <span>{selectedAssessment.categories ? selectedAssessment.categories.length : 0} Categories</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {selectedAssessment.categories && Array.isArray(selectedAssessment.categories) && 
                  selectedAssessment.categories.map((category, catIndex) => (
                  <div key={category.id || catIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-800">
                        {catIndex + 1}. {category.categoryName}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {category.questions ? category.questions.length : 0} Questions
                      </span>
                    </div>

                    <div className="space-y-4">
                      {category.questions && Array.isArray(category.questions) && 
                        category.questions.map((question, qIndex) => (
                        <div key={question.id || qIndex} className="bg-gray-50 rounded-lg p-4">
                          <div className="mb-3">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium text-gray-800 flex-1">
                                Q{qIndex + 1}: {question.text}
                              </h5>
                            </div>
                            <div className="flex gap-4 text-sm mt-2">
                              <div className="bg-blue-50 px-3 py-1 rounded">
                                <span className="text-blue-700 font-medium">New Customer Weight: </span>
                                <span className="text-blue-900">{question.proposedWeight?.new || 0}%</span>
                              </div>
                              <div className="bg-green-50 px-3 py-1 rounded">
                                <span className="text-green-700 font-medium">Existing Customer Weight: </span>
                                <span className="text-green-900">{question.proposedWeight?.existing || 0}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="ml-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700 mb-3">Answers:</p>
                            {question.answers && Array.isArray(question.answers) && 
                              question.answers.map((answer, aIndex) => (
                              <div
                                key={answer.id || aIndex}
                                className="bg-white p-3 rounded border border-gray-200"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Answer {aIndex + 1}: {answer.text}
                                  </span>
                                </div>
                                <div className="flex gap-3 ml-2">
                                  <div className="text-xs">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                      New: {answer.score?.new || 0}
                                    </span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                      Existing: {answer.score?.existing || 0}
                                    </span>
                                  </div>
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

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {selectedAssessment.approvalStatus !== 'approved' && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedAssessment);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Assessment
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type={confirmModal.type}
      />
    </div>
  );
};

export default RatingAssessmentList;