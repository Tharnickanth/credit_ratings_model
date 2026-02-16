'use client';
import React, { useState, useEffect } from 'react';
import { Eye, Search, Calendar, Filter, CheckCircle, X, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';

const ApprovedTemplatesList = () => {
  const [approvedTemplates, setApprovedTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    loadApprovedTemplates();
  }, []);

  const loadApprovedTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rating-assessments');
      if (response.ok) {
        const data = await response.json();
        // Filter only approved templates
        const approved = data.assessments.filter(a => a.approvalStatus === 'approved');
        setApprovedTemplates(approved);
      }
    } catch (error) {
      console.error('Error loading approved templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
    setOpenDropdown(null);
  };

  const handleDownload = async (template, format) => {
    try {
      setIsDownloading(true);
      setOpenDropdown(null);
      console.log('Starting download for template:', template.name);
      
      const response = await fetch('/api/rating-assessments/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateData: template, // Pass entire template data
          format: format, // 'pdf' or 'excel'
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '_')}_template.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Download completed successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        alert(`Failed to download template: ${errorData.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert(`An error occurred while downloading: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleDropdown = (templateId) => {
    setOpenDropdown(openDropdown === templateId ? null : templateId);
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

  const filteredTemplates = approvedTemplates.filter(template => {
    const nameMatch = template.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = template.categories && Array.isArray(template.categories) && 
      template.categories.some(cat => 
        cat.categoryName && cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return nameMatch || categoryMatch;
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approved templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Approved Assessment Templates</h2>
        <p className="text-gray-600">View all approved credit rating assessment templates ready for use</p>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm mb-1">Total Approved Templates</p>
            <h3 className="text-4xl font-bold">{approvedTemplates.length}</h3>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            <CheckCircle size={32} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search approved templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {searchTerm ? 'No approved templates found matching your search.' : 'No approved templates available yet.'}
          </p>
          <p className="text-gray-400 text-sm">
            {searchTerm ? 'Try adjusting your search terms.' : 'Templates will appear here once they are approved.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => {
            const totalQuestions = template.categories && Array.isArray(template.categories)
              ? template.categories.reduce((sum, cat) => sum + (cat.questions ? cat.questions.length : 0), 0)
              : 0;

            return (
              <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow border-2 border-green-200">
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-3/4">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {template.name}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700 inline-flex items-center gap-1 w-fit border border-green-300">
                        <CheckCircle size={12} />
                        Approved
                      </span>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-3 mb-3">
                        <Calendar size={16} />
                        <span>Approved: {formatDate(template.approvedAt)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Filter size={16} />
                          {template.categories ? template.categories.length : 0} Categories
                        </span>
                        <span>•</span>
                        <span>{totalQuestions} Questions</span>
                      </div>
                      {template.approvedBy && (
                        <p className="text-sm text-gray-600 mt-2">
                          Approved by: <span className="font-medium text-green-700">{template.approvedBy}</span>
                        </p>
                      )}
                      {template.approvalComments && (
                        <p className="text-sm text-gray-600 mt-1">
                          Comments: <span className="font-medium text-blue-700">{template.approvalComments}</span>
                        </p>
                      )}
                    </div>

                    {/* Single Dropdown Button */}
                    <div className="relative w-1/4 flex justify-end">
                      <button
                        onClick={() => toggleDropdown(template.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                      >
                        <span className="font-medium">View / Export</span>
                        <ChevronDown size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === template.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleView(template)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Eye size={18} className="text-green-600" />
                              <span className="text-gray-700 font-medium">View</span>
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button
                              onClick={() => handleDownload(template, 'pdf')}
                              disabled={isDownloading}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FileText size={18} className="text-red-600" />
                              <span className="text-gray-700 font-medium">
                                {isDownloading ? 'Downloading...' : 'Download PDF'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDownload(template, 'excel')}
                              disabled={isDownloading}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FileSpreadsheet size={18} className="text-green-600" />
                              <span className="text-gray-700 font-medium">
                                {isDownloading ? 'Downloading...' : 'Download Excel'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Categories:</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.categories && Array.isArray(template.categories) && template.categories.map((cat, idx) => (
                        <span
                          key={cat.id || idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200"
                        >
                          {cat.categoryName}
                          <span className="ml-2 text-xs bg-green-200 px-2 py-0.5 rounded-full font-medium">
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
      )}

      {/* View Modal */}
      {showViewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700 inline-flex items-center gap-1 w-fit border border-green-300 mb-3">
                    <CheckCircle size={14} />
                    Approved Template
                  </span>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {formatDate(selectedTemplate.createdAt)}</span>
                    <span>•</span>
                    <span>Approved: {formatDate(selectedTemplate.approvedAt)}</span>
                    <span>•</span>
                    <span>{selectedTemplate.categories ? selectedTemplate.categories.length : 0} Categories</span>
                    <span>•</span>
                    <span>
                      {selectedTemplate.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0} Questions
                    </span>
                  </div>
                  {selectedTemplate.approvedBy && (
                    <p className="text-sm text-gray-600 mt-1">
                      Approved by: <span className="font-medium text-green-700">{selectedTemplate.approvedBy}</span>
                    </p>
                  )}
                  {selectedTemplate.approvalComments && (
                    <p className="text-sm text-gray-600 mt-1">
                      Comments: <span className="font-medium text-blue-700">{selectedTemplate.approvalComments}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              {/* Download buttons in modal */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleDownload(selectedTemplate, 'pdf')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={isDownloading}
                >
                  <FileText size={18} />
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => handleDownload(selectedTemplate, 'excel')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={isDownloading}
                >
                  <FileSpreadsheet size={18} />
                  {isDownloading ? 'Downloading...' : 'Download Excel'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {selectedTemplate.categories && Array.isArray(selectedTemplate.categories) && 
                  selectedTemplate.categories.map((category, catIndex) => (
                  <div key={category.id || catIndex} className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-green-300">
                      <h4 className="text-lg font-semibold text-gray-800">
                        {catIndex + 1}. {category.categoryName}
                      </h4>
                      <span className="text-sm bg-green-600 text-white px-3 py-1 rounded-full font-medium">
                        {category.questions ? category.questions.length : 0} Questions
                      </span>
                    </div>

                    <div className="space-y-4">
                      {category.questions && Array.isArray(category.questions) && 
                        category.questions.map((question, qIndex) => (
                        <div key={question.id || qIndex} className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="mb-3">
                            <div className="font-medium text-gray-800 mb-3">
                              Q{qIndex + 1}: {question.text}
                            </div>
                            <div className="flex gap-3 text-sm">
                              <span className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                <span className="text-blue-700 font-medium">New Customer Weight:</span>{' '}
                                <span className="text-blue-900 font-semibold">{question.proposedWeight?.new || 0}%</span>
                              </span>
                              <span className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                                <span className="text-green-700 font-medium">Existing Customer Weight:</span>{' '}
                                <span className="text-green-900 font-semibold">{question.proposedWeight?.existing || 0}%</span>
                              </span>
                            </div>
                          </div>

                          <div className="ml-2 mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">Answers:</p>
                            {question.answers && Array.isArray(question.answers) && 
                              question.answers.map((answer, aIndex) => (
                              <div key={answer.id || aIndex} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-800">
                                    {aIndex + 1}. {answer.text}
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

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-center">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setOpenDropdown(null)}
        ></div>
      )}
    </div>
  );
};

export default ApprovedTemplatesList;