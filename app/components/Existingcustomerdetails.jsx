'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, Award, CheckCircle, Clock, XCircle, TrendingUp, Eye, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, FileText, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const ExistingCustomerDetails = () => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAssessments, setCustomerAssessments] = useState([]);
  const [assessmentSummary, setAssessmentSummary] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedAssessments, setExpandedAssessments] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);

  // Load all existing customers on component mount
  useEffect(() => {
    loadAllCustomers();
  }, []);

  // Filter customers based on search filter
  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredCustomers(allCustomers);
    } else {
      const searchLower = searchFilter.toLowerCase();
      const filtered = allCustomers.filter(customer => 
        customer.customerName?.toLowerCase().includes(searchLower) ||
        customer.customerId?.toLowerCase().includes(searchLower) ||
        customer.nic?.toLowerCase().includes(searchLower)
      );
      setFilteredCustomers(filtered);
    }
    setCurrentPage(1);
  }, [searchFilter, allCustomers]);

  const loadAllCustomers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/get-all-customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.customers) {
        const sortedCustomers = [...data.customers].sort((a, b) => {
          const dateA = new Date(a.lastAssessmentDate || 0);
          const dateB = new Date(b.lastAssessmentDate || 0);
          return dateB - dateA;
        });
        
        setAllCustomers(sortedCustomers);
        setFilteredCustomers(sortedCustomers);
      } else {
        setError(data.message || 'Failed to load customers');
      }
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(`Failed to load customers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (customerId) => {
    setLoadingDetails(true);
    setError('');

    try {
      const response = await fetch(`/api/customer?customerId=${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSelectedCustomer(data.customer);
        setCustomerAssessments(data.assessments);
        setAssessmentSummary(data.summary);
      } else {
        setError(data.message || 'Failed to fetch customer details');
      }
    } catch (err) {
      setError('An error occurred while fetching customer details');
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    setCustomerAssessments([]);
    setAssessmentSummary(null);
    setExpandedAssessments({});
    setError('');
  };

  const toggleAssessmentExpansion = (assessmentId) => {
    setExpandedAssessments(prev => ({
      ...prev,
      [assessmentId]: !prev[assessmentId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating) => {
    const colors = {
      'A+': 'text-green-600 bg-green-50',
      'A': 'text-green-600 bg-green-50',
      'B+': 'text-blue-600 bg-blue-50',
      'B': 'text-blue-600 bg-blue-50',
      'C+': 'text-yellow-600 bg-yellow-50',
      'C': 'text-yellow-600 bg-yellow-50',
      'D': 'text-orange-600 bg-orange-50',
      'E': 'text-red-600 bg-red-50',
    };
    return colors[rating] || 'text-gray-600 bg-gray-50';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: {
        icon: CheckCircle,
        text: 'Approved',
        className: 'bg-green-100 text-green-700'
      },
      pending: {
        icon: Clock,
        text: 'Pending',
        className: 'bg-yellow-100 text-yellow-700'
      },
      rejected: {
        icon: XCircle,
        text: 'Rejected',
        className: 'bg-red-100 text-red-700'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.text}
      </span>
    );
  };

  // Pagination calculations
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredCustomers.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredCustomers.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Customer Details View
  if (selectedCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-6">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to All Customers</span>
            </button>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between ">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCustomer.customerName}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="font-medium">ID: {selectedCustomer.customerId}</span>
                      <span>•</span>
                      <span>NIC: {selectedCustomer.nic}</span>
                    </div>
                    {selectedCustomer.contactNumber && (
                      <div className="mt-1 text-sm text-gray-600">
                        Contact: {selectedCustomer.contactNumber}
                      </div>
                    )}
                  </div>
                </div>
                
                {assessmentSummary && (
                  <div className={`px-4 py-2 rounded-lg ${getRatingColor(assessmentSummary.latestRating)}`}>
                    <div className="text-xs font-medium opacity-75">Latest Rating</div>
                    <div className="text-2xl font-bold">{assessmentSummary.latestRating}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          {assessmentSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{assessmentSummary.totalAssessments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{assessmentSummary.approvedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{assessmentSummary.pendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">{assessmentSummary.rejectedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Assessments List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Assessment History</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                All assessments for this customer ({customerAssessments.length} total)
              </p>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">Loading assessments...</p>
              </div>
            ) : customerAssessments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Found</h3>
                <p className="text-gray-600">This customer has no assessment records yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {customerAssessments.map((assessment, index) => (
                  <div key={assessment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assessment.assessmentTemplateName}
                          </h3>
                          {getStatusBadge(assessment.approvalStatus)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(assessment.assessmentDate)}</span>
                          </div>
                          <span>•</span>
                          <span>Assessed by: <span className="font-medium">{assessment.assessedBy}</span></span>
                        </div>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-lg ${getRatingColor(assessment.rating)}`}>
                        <div className="text-xs font-medium opacity-75">Rating</div>
                        <div className="text-xl font-bold">{assessment.rating}</div>
                      </div>
                    </div>

                    {/* Score Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Total Score</div>
                        <div className="text-lg font-bold text-gray-900">{assessment.totalScore}</div>
                      </div>
                      
                      {assessment.categoryScores && assessment.categoryScores.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
                          <div className="text-xs text-gray-600 mb-2">Category Scores</div>
                          <div className="flex flex-wrap gap-2">
                            {assessment.categoryScores.map((cat, idx) => (
                              <div key={idx} className="bg-white px-3 py-1 rounded-md border border-gray-200">
                                <span className="text-xs font-medium text-gray-700">{cat.categoryName}: </span>
                                <span className="text-xs font-bold text-indigo-600">{cat.score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Approval Information */}
                    {assessment.approvalStatus === 'approved' && assessment.approvedBy && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm mb-4">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Approved by <span className="font-medium">{assessment.approvedBy}</span> on {formatDateTime(assessment.approvedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {assessment.approvalStatus === 'rejected' && assessment.rejectedBy && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">
                        <div className="flex items-center gap-2 text-red-800 mb-1">
                          <XCircle className="w-4 h-4" />
                          <span>
                            Rejected by <span className="font-medium">{assessment.rejectedBy}</span> on {formatDateTime(assessment.rejectedAt)}
                          </span>
                        </div>
                        {assessment.rejectionRemarks && (
                          <div className="text-red-700 mt-2 pl-6">
                            <span className="font-medium">Remarks:</span> {assessment.rejectionRemarks}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Toggle Q&A Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => toggleAssessmentExpansion(assessment.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {expandedAssessments[assessment.id] ? 'Hide' : 'Show'} Questions & Answers ({assessment.answers?.length || 0})
                        </span>
                        {expandedAssessments[assessment.id] ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {/* Q&A Section */}
                      {expandedAssessments[assessment.id] && (
                        <div className="mt-4 space-y-4">
                          {assessment.answers && assessment.answers.length > 0 ? (
                            assessment.answers.map((answer, answerIdx) => (
                              <div key={answerIdx} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                  {/* Question Number Badge */}
                                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-indigo-600">Q{answerIdx + 1}</span>
                                  </div>
                                  
                                  <div className="flex-1">
                                    {/* Category Tag */}
                                    {answer.category && (
                                      <div className="mb-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          {answer.category}
                                        </span>
                                      </div>
                                    )}

                                    {/* Question */}
                                    <div className="mb-4">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Question</p>
                                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                        {answer.questionText || answer.question || 'Question not available'}
                                      </p>
                                      {answer.weight !== undefined && answer.weight !== null && (
                                        <p className="text-xs text-gray-500 mt-1">Weight: {answer.weight}%</p>
                                      )}
                                    </div>
                                    
                                    {/* Selected Answer */}
                                    <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                      <div className="flex items-start gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Selected Answer</p>
                                      </div>
                                      <p className="text-sm text-gray-800 leading-relaxed pl-6">
                                        {answer.answerText || answer.answer || 'Answer not available'}
                                      </p>
                                      {answer.score !== undefined && answer.score !== null && (
                                        <p className="text-xs text-indigo-700 mt-2 pl-6 font-medium">Score: {answer.score}</p>
                                      )}
                                    </div>
                                    
                                    {/* Additional Score Details */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {/* Score */}
                                      {answer.score !== undefined && answer.score !== null && (
                                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3">
                                          <p className="text-xs font-medium text-indigo-600 mb-1">Score</p>
                                          <p className="text-lg font-bold text-indigo-700">{answer.score}</p>
                                        </div>
                                      )}
                                      
                                      {/* Weight */}
                                      {answer.weight !== undefined && answer.weight !== null && (
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                                          <p className="text-xs font-medium text-blue-600 mb-1">Weight (%)</p>
                                          <p className="text-lg font-bold text-blue-700">{answer.weight}</p>
                                        </div>
                                      )}
                                      
                                      {/* Weighted Score */}
                                      {answer.weightedScore !== undefined && answer.weightedScore !== null && (
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                                          <p className="text-xs font-medium text-purple-600 mb-1">Weighted Score</p>
                                          <p className="text-lg font-bold text-purple-700">{answer.weightedScore}</p>
                                        </div>
                                      )}
                                      
                                      {/* Max Score */}
                                      {answer.maxScore !== undefined && answer.maxScore !== null && (
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                                          <p className="text-xs font-medium text-green-600 mb-1">Max Score</p>
                                          <p className="text-lg font-bold text-green-700">{answer.maxScore}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-sm font-medium text-gray-600">No questions and answers available</p>
                              <p className="text-xs text-gray-500 mt-1">This assessment doesn't have any recorded responses</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Customer List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Existing Customers</h1>
              <p className="text-gray-600">View and manage customer information and assessments</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={loadAllCustomers}
                className="text-sm text-red-600 hover:text-red-700 font-medium mt-2"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* All Customers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">All Customers</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredCustomers.length)} of {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by name, ID, or NIC..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm w-64"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchFilter ? 'No matching customers found' : 'No customers found'}
              </h3>
              <p className="text-gray-600">
                {searchFilter 
                  ? 'Try adjusting your search criteria'
                  : 'There are no customers in the database yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NIC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Assessment
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRecords.map((customer, index) => (
                      <tr key={customer.customerId || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {indexOfFirstRecord + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {customer.customerName || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {customer.customerId || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.nic || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(customer.lastAssessmentDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewDetails(customer.customerId)}
                            disabled={loadingDetails}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="w-4 h-4" />
                            Assessment History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((pageNum, index) => (
                          pageNum === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <button
                              key={pageNum}
                              onClick={() => paginate(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        ))}
                      </div>

                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExistingCustomerDetails;