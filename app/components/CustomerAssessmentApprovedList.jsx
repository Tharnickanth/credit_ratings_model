'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Eye, Search, Users, UserPlus, Award, ChevronDown, ChevronLeft, ChevronRight, CheckCircle, ChevronUp, X, Download, FileText, FileSpreadsheet } from 'lucide-react';

const CustomerAssessmentApprovedList = ({ onCreateNew, refreshTrigger }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentTemplate, setAssessmentTemplate] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openAbove: false });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadAssessments();
  }, [refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer-assessments?status=approved');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded approved assessments:', data.assessments);
        // Debug: Log first assessment structure
        if (data.assessments && data.assessments.length > 0) {
          console.log('Sample assessment structure:', Object.keys(data.assessments[0]));
          console.log('First assessment:', data.assessments[0]);
        }
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error('Error loading approved assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessmentTemplate = async (templateId) => {
    if (!templateId) {
      setError('Assessment template ID is missing');
      return null;
    }

    try {
      setLoadingTemplate(true);
      setError('');
      console.log('Loading template with ID:', templateId);
      
      const response = await fetch(`/api/rating-assessments?id=${templateId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        const expanded = {};
        data.assessment.categories?.forEach((cat, idx) => {
          expanded[idx] = true;
        });
        setExpandedCategories(expanded);
        return data.assessment;
      } else {
        console.error('Failed to load template:', data);
        setError(data.message || 'Failed to load assessment template');
        return null;
      }
    } catch (error) {
      console.error('Error loading template:', error);
      setError('Failed to load assessment template details');
      return null;
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleView = async (assessment) => {
    console.log('Opening assessment:', assessment);
    console.log('Assessment fields:', {
      assessmentTemplateId: assessment.assessmentTemplateId,
      ratingAssessmentId: assessment.ratingAssessmentId,
      templateId: assessment.templateId,
      allKeys: Object.keys(assessment)
    });
    
    setSelectedAssessment(assessment);
    setShowViewModal(true);
    setAssessmentTemplate(null);
    setError('');
    
    // Try multiple possible field names - assessmentTemplateId is the most likely based on CustomerAssessmentApprovals
    const templateId = assessment.assessmentTemplateId || 
                      assessment.ratingAssessmentId || 
                      assessment.templateId ||
                      assessment.ratingTemplateId;
    
    if (templateId) {
      const template = await loadAssessmentTemplate(templateId);
      if (template) {
        setAssessmentTemplate(template);
      }
    } else {
      console.warn('No template ID found in assessment. Available fields:', Object.keys(assessment));
      setError('Assessment template reference is missing. Cannot load detailed questions.');
    }
  };

  const handleDownload = async (assessment, format) => {
    try {
      setIsDownloading(true);
      setOpenDropdown(null);
      console.log('Starting download for assessment:', assessment.customerName);
      
      // Get the template ID
      const templateId = assessment.assessmentTemplateId || 
                        assessment.ratingAssessmentId || 
                        assessment.templateId ||
                        assessment.ratingTemplateId;
      
      // Load template if not already loaded or if this is a different assessment
      let templateToUse = assessmentTemplate;
      
      if (!templateToUse || selectedAssessment?.id !== assessment.id) {
        console.log('Loading template for export...');
        if (templateId) {
          const response = await fetch(`/api/rating-assessments?id=${templateId}`);
          const data = await response.json();
          
          if (response.ok && data.success) {
            templateToUse = data.assessment;
            console.log('Template loaded successfully for export');
          } else {
            console.error('Failed to load template for export');
            alert('Failed to load assessment template. Cannot generate export.');
            setIsDownloading(false);
            return;
          }
        } else {
          alert('Assessment template reference is missing. Cannot generate export.');
          setIsDownloading(false);
          return;
        }
      }
      
      console.log('Sending export request with template data...');
      
      const response = await fetch('/api/customer-assessments/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentData: assessment,
          templateData: templateToUse,
          format: format, // 'pdf' or 'excel'
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assessment.customerName.replace(/\s+/g, '_')}_assessment.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Download completed successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        alert(`Failed to download assessment: ${errorData.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error downloading assessment:', error);
      alert(`An error occurred while downloading: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleDropdown = (assessmentId, e) => {
    if (openDropdown === assessmentId) {
      setOpenDropdown(null);
      return;
    }
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 120; // 120px ~ dropdown height + gap
    setDropdownPos({
      top: openAbove ? rect.top - 8 : rect.bottom + 8,
      right: window.innerWidth - rect.right,
      openAbove,
    });
    setOpenDropdown(assessmentId);
  };

  const toggleCategory = (categoryIndex) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex]
    }));
  };

  const getAnswerForQuestion = (questionId) => {
    // Try both 'responses' and 'answers' field names
    const answers = selectedAssessment?.responses || selectedAssessment?.answers;
    if (!answers) return null;
    return answers.find(a => a.questionId === questionId);
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

  // Get color based on rating letter from database
  const getRatingColor = (rating) => {
    switch(rating) {
      case 'A+': return 'bg-green-600';
      case 'A': return 'bg-green-500';
      case 'A-': return 'bg-blue-600';
      case 'B': return 'bg-blue-500';
      case 'C+': return 'bg-yellow-600';
      case 'C': return 'bg-yellow-500';
      case 'C-': return 'bg-orange-500';
      case 'D': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoryBreakdown = (categoryName) => {
    if (!selectedAssessment?.categoryBreakdown) return 0;
    const breakdown = selectedAssessment.categoryBreakdown.find(
      cb => cb.categoryName === categoryName
    );
    return breakdown?.score || 0;
  };

  const getCustomerTypeBadge = (customerType) => {
    if (customerType === 'new') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
          <UserPlus size={14} />
          New Customer
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
          <Users size={14} />
          Existing Customer
        </span>
      );
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = 
      assessment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.nic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.assessmentTemplateName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || 
      assessment.customerType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssessments = filteredAssessments.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approved assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Approved Customer Assessments</h2>
        <p className="text-gray-600">View all approved customer credit rating assessments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Total Approved</p>
              <h3 className="text-3xl font-bold">{assessments.length}</h3>
            </div>
            <CheckCircle size={32} className="text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">New Customers</p>
              <h3 className="text-3xl font-bold">
                {assessments.filter(a => a.customerType === 'new').length}
              </h3>
            </div>
            <UserPlus size={32} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Existing Customers</p>
              <h3 className="text-3xl font-bold">
                {assessments.filter(a => a.customerType === 'existing').length}
              </h3>
            </div>
            <Users size={32} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name, ID, NIC, or template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('new')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setFilterType('existing')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'existing'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Existing
            </button>
          </div>
        </div>
      </div>

      {/* Assessments Table */}
      {currentAssessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {searchTerm || filterType !== 'all' 
              ? 'No approved assessments found matching your criteria.' 
              : 'No approved assessments available yet.'}
          </p>
          <p className="text-gray-400 text-sm">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Assessments will appear here once they are approved.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-visible self-start">
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
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentAssessments.map((assessment, index) => {
                    return (
                      <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                        {/* Customer */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assessment.customerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {assessment.customerId}
                            </div>
                            <div className="text-xs text-gray-500">
                              NIC: {assessment.nic}
                            </div>
                          </div>
                        </td>
                        
                        {/* Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getCustomerTypeBadge(assessment.customerType)}
                        </td>
                        
                        {/* Template */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {assessment.assessmentTemplateName || 'Standard Template'}
                          </div>
                        </td>
                        
                        {/* Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {assessment.totalScore?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        
                        {/* Rating */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRatingColor(assessment.rating)}`}>
                            <Award size={14} className="mr-1" />
                            {assessment.rating || 'N/A'}
                          </span>
                        </td>
                        
                        {/* Approved Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(assessment.approvedAt)}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(assessment)}
                              className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            
                            <div>
                              <button
                                onClick={(e) => toggleDropdown(assessment.id, e)}
                                className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg flex items-center gap-1"
                                title="Export"
                                disabled={isDownloading}
                              >
                                <Download size={18} />
                                {openDropdown === assessment.id && dropdownPos.openAbove
                                  ? <ChevronDown size={14} />
                                  : <ChevronUp size={14} />
                                }
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredAssessments.length)}</span> of{' '}
                <span className="font-medium">{filteredAssessments.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>
                
                {/* Compact pagination with ellipsis */}
                {totalPages <= 7 ? (
                  // Show all pages if 7 or fewer
                  [...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === index + 1
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))
                ) : (
                  // Show compact view with ellipsis
                  <>
                    {/* First page */}
                    <button
                      onClick={() => handlePageChange(1)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      1
                    </button>
                    
                    {/* Left ellipsis */}
                    {currentPage > 3 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    
                    {/* Middle pages */}
                    {currentPage > 2 && (
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        {currentPage - 1}
                      </button>
                    )}
                    
                    {currentPage !== 1 && currentPage !== totalPages && (
                      <button
                        onClick={() => handlePageChange(currentPage)}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white"
                      >
                        {currentPage}
                      </button>
                    )}
                    
                    {currentPage < totalPages - 1 && (
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        {currentPage + 1}
                      </button>
                    )}
                    
                    {/* Right ellipsis */}
                    {currentPage < totalPages - 2 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    
                    {/* Last page */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Modal */}
      {showViewModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {selectedAssessment.customerName}
                    </h3>
                    {getCustomerTypeBadge(selectedAssessment.customerType)}
                  </div>
                  
                  {/* Customer Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Customer ID:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedAssessment.customerId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">NIC:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedAssessment.nic}</span>
                    </div>
                  </div>

                  {/* Template */}
                  <div className="mb-4 text-sm">
                    <span className="text-gray-600">Template:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedAssessment.assessmentTemplateName || 'Standard'}</span>
                  </div>

                  {/* Assessment Information */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Assessed by:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedAssessment.assessedBy || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Assessment Date:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDate(selectedAssessment.assessmentDate)}</span>
                    </div>
                  </div>

                  {/* Approval Information */}
                  <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle size={20} className="text-green-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-700">Approved</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span>By: <span className="font-medium text-gray-900">{selectedAssessment.approvedBy || 'N/A'}</span></span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(selectedAssessment.approvedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Export Buttons in Modal Header */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownload(selectedAssessment, 'pdf')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      disabled={isDownloading}
                    >
                      <FileText size={18} />
                      {isDownloading ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button
                      onClick={() => handleDownload(selectedAssessment, 'excel')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      disabled={isDownloading}
                    >
                      <FileSpreadsheet size={18} />
                      {isDownloading ? 'Exporting...' : 'Export Excel'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAssessment(null);
                    setAssessmentTemplate(null);
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Assessment Score Overview */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-900">Assessment Score</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Score</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {selectedAssessment.totalScore?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className={`px-6 py-3 rounded-lg ${getRatingColor(selectedAssessment.rating)}`}>
                        <p className="text-sm text-white mb-1">Credit Rating</p>
                        <p className="text-4xl font-bold text-white flex items-center gap-2">
                          <Award size={32} />
                          {selectedAssessment.rating || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                {selectedAssessment.categoryBreakdown && selectedAssessment.categoryBreakdown.length > 0 && (
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAssessment.categoryBreakdown.map((category, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{category.categoryName}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {category.score?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Assessment Responses */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Detailed Assessment Responses</h4>
                  
                  {loadingTemplate ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                      <p className="text-gray-600">Loading assessment details...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-600 font-medium">{error}</p>
                    </div>
                  ) : assessmentTemplate?.categories && assessmentTemplate.categories.length > 0 ? (
                    <div className="space-y-4">
                      {assessmentTemplate.categories.map((category, catIdx) => {
                        const isExpanded = expandedCategories[catIdx];
                        const categoryScore = getCategoryBreakdown(category.categoryName);
                        
                        return (
                          <div key={catIdx} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
                                {categoryScore > 0 && (
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                                    Score: {categoryScore.toFixed(2)}
                                  </span>
                                )}
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
                  ) : (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                      <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium mb-1">No assessment details available</p>
                      {!selectedAssessment.assessmentTemplateId && !selectedAssessment.ratingAssessmentId && (
                        <p className="text-gray-400 text-sm">Template reference is missing</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-white flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAssessment(null);
                  setAssessmentTemplate(null);
                  setError('');
                }}
                className="px-8 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed-position dropdown portal — renders on top of everything, no clipping */}
      {openDropdown && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
          {/* Dropdown menu */}
          <div
            className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200"
            style={{
              top: dropdownPos.openAbove ? 'auto' : dropdownPos.top,
              bottom: dropdownPos.openAbove ? window.innerHeight - dropdownPos.top : 'auto',
              right: dropdownPos.right,
            }}
          >
            <button
              onClick={() => {
                const assessment = currentAssessments.find(a => a.id === openDropdown);
                if (assessment) handleDownload(assessment, 'pdf');
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors rounded-t-lg"
              disabled={isDownloading}
            >
              <FileText size={18} className="text-red-600" />
              <span className="font-medium">
                {isDownloading ? 'Exporting...' : 'Download PDF'}
              </span>
            </button>
            <button
              onClick={() => {
                const assessment = currentAssessments.find(a => a.id === openDropdown);
                if (assessment) handleDownload(assessment, 'excel');
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors rounded-b-lg border-t border-gray-100"
              disabled={isDownloading}
            >
              <FileSpreadsheet size={18} className="text-green-600" />
              <span className="font-medium">
                {isDownloading ? 'Exporting...' : 'Download Excel'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerAssessmentApprovedList;