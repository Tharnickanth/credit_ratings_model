'use client';
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle, Save, User, Users, UserPlus, Award } from 'lucide-react';

const CustomerAssessmentEntry = ({ editMode, assessmentData, onSaveSuccess, onCancel }) => {
  // Helper function to log activities
  const logActivity = async (description, action = 'assessment') => {
    try {
      const user = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')) 
        : null;

      if (!user || !user.username) {
        console.warn('No user found for activity logging');
        return;
      }

      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          description,
          action
        })
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging failure shouldn't break the app
    }
  };

  // Step 1: Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [nic, setNic] = useState('');
  const [customerType, setCustomerType] = useState(null);
  const [customerChecked, setCustomerChecked] = useState(false);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);

  // Step 2: Template Selection
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Step 3: Assessment Answers
  const [answers, setAnswers] = useState({});
  const [categoryScores, setCategoryScores] = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  // UI States
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (editMode && assessmentData && templates.length > 0) {
      console.log('🔄 Loading assessment data for edit:', assessmentData);
      loadAssessmentData(assessmentData);
    }
  }, [editMode, assessmentData, templates]);

  const loadAssessmentData = async (data) => {
    setCustomerName(data.customerName || '');
    setCustomerId(data.customerId || '');
    setNic(data.nic || '');
    setCustomerType(data.customerType || null);
    setCustomerChecked(true);
    setIsExistingCustomer(data.customerType === 'existing');

    if (data.assessmentTemplateId) {
      const template = templates.find(t => t.id === data.assessmentTemplateId);
      if (template) {
        console.log('✅ Template found and selected:', template.name);
        setSelectedTemplate(template);
        
        const loadedAnswers = {};
        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach(answer => {
            loadedAnswers[answer.questionId] = {
              answerId: answer.answerId,
              answerText: answer.answerText,
              score: answer.score,
              weight: answer.weight
            };
          });
        }
        setAnswers(loadedAnswers);
        setCurrentStep(3);
      } else {
        console.error('❌ Template not found with ID:', data.assessmentTemplateId);
      }
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch('/api/rating-assessments');
      if (response.ok) {
        const data = await response.json();
        const approvedTemplates = data.assessments.filter(
          assessment => assessment.approvalStatus === 'approved'
        );
        setTemplates(approvedTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to load assessment templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const checkCustomerStatus = async () => {
    // Require at least one field
    if (!customerId.trim() && !nic.trim()) {
      setError('Please provide Customer ID or NIC to check customer status');
      return;
    }

    setError('');
    setCheckingCustomer(true);

    try {
      const response = await fetch('/api/check-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId.trim(),
          nic: nic.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setCustomerType(result.customerType);
        setCustomerChecked(true);

        if (result.customerType === 'existing' && result.customerData) {
          // Auto-fill fields from customers collection
          setCustomerName(result.customerData.customerName);
          setCustomerId(result.customerData.customerId);
          setNic(result.customerData.nic);
          setIsExistingCustomer(true);
          
          // Log activity
          await logActivity(
            `Checked customer status: ${result.customerData.customerName} (ID: ${result.customerData.customerId}) - Existing customer`,
            'Customer Check'
          );
          
          console.log('✅ Existing customer found and auto-filled');
        } else {
          // New customer
          setIsExistingCustomer(false);
          
          // Log activity
          await logActivity(
            `Checked customer status: ${customerId.trim() || nic.trim()} - New customer`,
            'Customer Check'
          );
          
          console.log('ℹ️ New customer - fields remain editable');
        }
      } else {
        setError(result.message || 'Failed to check customer status');
      }
    } catch (error) {
      console.error('Error checking customer:', error);
      setError('Failed to check customer status. Please try again.');
    } finally {
      setCheckingCustomer(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    setSelectedTemplate(template);
    const initialAnswers = {};
    template.categories.forEach(category => {
      category.questions.forEach(question => {
        initialAnswers[question.questionId] = null;
      });
    });
    setAnswers(initialAnswers);
    setCurrentStep(3);
    
    // Log activity
    await logActivity(
      `Selected assessment template: ${template.name} for customer ${customerName.trim()} (ID: ${customerId.trim()})`,
      'Template Selection'
    );
  };

  const handleAnswerSelect = (questionId, answer, weight) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        answerId: answer.answerId,
        answerText: answer.text,
        score: customerType === 'new' ? answer.score.new : answer.score.existing,
        weight: weight
      }
    }));
  };

  const calculateScores = () => {
    if (!selectedTemplate || !customerType) return;

    const catScores = [];
    let total = 0;

    selectedTemplate.categories.forEach(category => {
      let categoryTotal = 0;
      
      category.questions.forEach(question => {
        const answer = answers[question.questionId];
        if (answer) {
          const score = answer.score;
          const weight = customerType === 'new' 
            ? question.proposedWeight.new 
            : question.proposedWeight.existing;
          
          const weightedScore = (score * weight) / 100;
          categoryTotal += weightedScore;
        }
      });

      catScores.push({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        score: categoryTotal
      });

      total += categoryTotal;
    });

    setCategoryScores(catScores);
    setTotalScore(total);
  };

  useEffect(() => {
    calculateScores();
  }, [answers, customerType]);

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

  const saveCustomerToCollection = async () => {
    // Only save to customers collection if it's a NEW customer AND not in edit mode
    // In edit mode, if the customer exists, we should not try to create them again
    if (customerType === 'new' && !editMode) {
      try {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            customerName: customerName.trim(),
            customerId: customerId.trim(),
            nic: nic.trim()
          })
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Failed to save customer:', result.message);
          // Don't throw error - continue with assessment even if customer save fails
        } else {
          console.log('✅ Customer saved to customers collection');
          
          // Log activity
          await logActivity(
            `Created new customer: ${customerName.trim()} (ID: ${customerId.trim()})`,
            'Customer Creation'
          );
        }
      } catch (error) {
        console.error('Error saving customer:', error);
        // Don't throw error - continue with assessment
      }
    } else if (editMode) {
      console.log('ℹ️ Skipping customer save in edit mode');
    }
  };

  const saveAssessment = async () => {
    setError('');
    setSuccess('');

    if (!customerName.trim() || !customerId.trim() || !nic.trim()) {
      setError('Please complete customer details');
      return;
    }

    if (!selectedTemplate) {
      setError('Please select an assessment template');
      return;
    }

    const allAnswered = Object.keys(answers).every(key => answers[key] !== null);
    if (!allAnswered) {
      setError('Please answer all questions');
      return;
    }

    setSaving(true);

    try {
      // Step 1: Save customer to customers collection if new
      await saveCustomerToCollection();

      // Step 2: Save assessment
      const user = typeof window !== 'undefined' && localStorage.getItem('user') 
        ? JSON.parse(localStorage.getItem('user')) 
        : null;

      const ratingInfo = calculateRating(totalScore);

      const assessmentPayload = {
        customerName: customerName.trim(),
        customerId: customerId.trim(),
        nic: nic.trim(),
        customerType: customerType,
        assessmentTemplateId: selectedTemplate.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          ...answer
        })),
        totalScore: totalScore,
        rating: ratingInfo.rating,
        categoryScores: categoryScores,
        assessedBy: user?.username || null,
        approvalStatus: 'pending'
      };

      let response;
      if (editMode && assessmentData?.id) {
        response = await fetch(`/api/customer-assessments/${assessmentData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assessmentPayload)
        });
      } else {
        response = await fetch('/api/customer-assessments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assessmentPayload)
        });
      }

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Assessment ${editMode ? 'updated' : 'submitted'} successfully! Total Score: ${totalScore.toFixed(2)} | Rating: ${ratingInfo.rating}`);
        
        // Log activity
        const actionType = editMode ? 'Assessment Update' : 'Assessment Entry';
        const actionDescription = editMode 
          ? `Updated assessment for ${customerName.trim()} (ID: ${customerId.trim()}) - Score: ${totalScore.toFixed(2)}, Rating: ${ratingInfo.rating}`
          : `Created new assessment for ${customerName.trim()} (ID: ${customerId.trim()}) - Score: ${totalScore.toFixed(2)}, Rating: ${ratingInfo.rating}`;
        
        await logActivity(actionDescription, actionType);
        
        setTimeout(() => {
          if (onSaveSuccess) {
            onSaveSuccess();
          }
        }, 2000);
      } else {
        setError(result.message || `Failed to ${editMode ? 'update' : 'save'} assessment`);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError(`Failed to ${editMode ? 'update' : 'save'} assessment`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = async () => {
    // Log activity before resetting
    if (customerName || customerId) {
      await logActivity(
        `Reset assessment form${customerName ? ` for ${customerName.trim()}` : ''}`,
        'Form Reset'
      );
    }
    
    setCustomerName('');
    setCustomerId('');
    setNic('');
    setCustomerType(null);
    setCustomerChecked(false);
    setIsExistingCustomer(false);
    setSelectedTemplate(null);
    setAnswers({});
    setCategoryScores([]);
    setTotalScore(0);
    setCurrentStep(1);
    setError('');
    setSuccess('');
    
    if (editMode && onCancel) {
      onCancel();
    }
  };

  const handleNewEntry = () => {
    resetForm();
  };

  const handleCancel = async () => {
    // Log cancellation
    if (editMode && assessmentData) {
      await logActivity(
        `Cancelled editing assessment for ${assessmentData.customerName || 'customer'}`,
        'Assessment Edit Cancelled'
      );
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  const ratingInfo = calculateRating(totalScore);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {editMode ? 'Edit Customer Credit Assessment' : 'Customer Credit Assessment'}
          </h2>
          <p className="text-gray-600">
            {editMode ? 'Update assessment details and resubmit for approval' : 'Assess customer creditworthiness based on approved templates'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="font-medium">Customer Details</span>
          </div>
          <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="font-medium">Select Template</span>
          </div>
          <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="font-medium">Assessment</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-medium text-red-800">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600">
            <XCircle size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-medium text-green-800">Success</h4>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Step 1: Customer Details */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Step 1: Customer Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter customer ID"
                disabled={isExistingCustomer}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 
                  ${isExistingCustomer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                placeholder="Enter NIC number"
                disabled={isExistingCustomer}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 
                  ${isExistingCustomer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                disabled={isExistingCustomer}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 
                  ${isExistingCustomer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {!customerChecked ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Enter Customer ID or NIC to check if customer exists in the system
              </p>
              <button
                onClick={checkCustomerStatus}
                disabled={checkingCustomer || (!customerId.trim() && !nic.trim())}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={20} />
                {checkingCustomer ? 'Checking...' : 'Check Customer Status'}
              </button>
            </div>
          ) : (
            <div>
              <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                customerType === 'new' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
              }`}>
                {customerType === 'new' ? (
                  <>
                    <UserPlus className="text-blue-600" size={24} />
                    <div>
                      <h4 className="font-medium text-blue-800">New Customer</h4>
                      <p className="text-sm text-blue-600">Customer will be added to database with this assessment</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Users className="text-green-600" size={24} />
                    <div>
                      <h4 className="font-medium text-green-800">Existing Customer</h4>
                      <p className="text-sm text-green-600">Customer found in database</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!customerName.trim() || !customerId.trim() || !nic.trim()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Template Selection
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
                {editMode && (
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Template Selection */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 2: Select Assessment Template</h3>
            <p className="text-sm text-gray-600">
              Customer: <span className="font-medium">{customerName}</span> | 
              Type: <span className="font-medium capitalize">{customerType}</span>
            </p>
          </div>

          {loadingTemplates ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertCircle className="mx-auto text-yellow-600 mb-2" size={32} />
              <p className="text-yellow-800">No approved assessment templates available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow p-6 border-2 border-transparent hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{template.description || 'No description'}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Categories:</span>
                      <span className="font-medium">{template.categories?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium">
                        {template.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template);
                    }}
                    className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select Template
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Customer Details
              </button>
              {editMode && (
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Assessment Questions - Same as before, keeping it unchanged */}
      {currentStep === 3 && selectedTemplate && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 3: Complete Assessment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Template: <span className="font-medium">{selectedTemplate.name}</span> | 
              Customer Type: <span className="font-medium capitalize">{customerType}</span>
            </p>
          </div>

          {selectedTemplate.categories.map((category, catIdx) => (
            <div key={catIdx} className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{category.categoryName}</h4>
              
              <div className="space-y-6">
                {category.questions.map((question, qIdx) => {
                  const weight = customerType === 'new' 
                    ? question.proposedWeight.new 
                    : question.proposedWeight.existing;

                  return (
                    <div key={qIdx} className="border-l-4 border-blue-500 pl-4">
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-800">
                            Q{qIdx + 1}: {question.text}
                          </h5>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Weight: {weight}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {question.answers.map((answer, aIdx) => {
                          const score = customerType === 'new' ? answer.score.new : answer.score.existing;
                          const isSelected = answers[question.questionId]?.answerId === answer.answerId;

                          return (
                            <button
                              key={aIdx}
                              onClick={() => handleAnswerSelect(question.questionId, answer, weight)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-gray-800">{answer.text}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    Score: {score}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle className="text-blue-600" size={20} />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Score Summary with Rating */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Score Summary</h4>
            
            <div className="space-y-3 mb-4">
              {categoryScores.map((catScore, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{catScore.categoryName}</span>
                  <span className="font-semibold text-gray-900">{catScore.score.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-gray-200 pt-4 mb-6">
              <div className="flex items-center justify-between text-xl">
                <span className="font-bold text-gray-800">Total Score</span>
                <span className="font-bold text-blue-600">{totalScore.toFixed(2)}</span>
              </div>
            </div>

            {totalScore > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Credit Rating</p>
                    <p className="text-xs text-gray-500">Based on assessment score</p>
                  </div>
                  <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl ${ratingInfo.color} text-white shadow-lg`}>
                    <Award size={28} />
                    <span className="text-4xl font-bold">{ratingInfo.rating}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-300">
                  <p className="text-xs font-medium text-gray-700 mb-3">Rating Scale:</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-green-600 text-white rounded font-bold">A+</span>
                      <span className="text-gray-600">90-100</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-green-500 text-white rounded font-bold">A</span>
                      <span className="text-gray-600">80-89</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold">A-</span>
                      <span className="text-gray-600">70-79</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-blue-500 text-white rounded font-bold">B</span>
                      <span className="text-gray-600">60-69</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-yellow-600 text-white rounded font-bold">C+</span>
                      <span className="text-gray-600">50-59</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-yellow-500 text-white rounded font-bold">C</span>
                      <span className="text-gray-600">40-49</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-orange-500 text-white rounded font-bold">C-</span>
                      <span className="text-gray-600">30-39</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-red-600 text-white rounded font-bold">D</span>
                      <span className="text-gray-600">&lt;30</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between">
              <div className="flex gap-3">
                {!editMode && (
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Back to Templates
                  </button>
                )}
                {editMode && (
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                onClick={saveAssessment}
                disabled={saving || Object.values(answers).some(a => a === null)}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {saving ? (editMode ? 'Updating...' : 'Saving...') : (editMode ? 'Update & Resubmit' : 'Submit for Approval')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAssessmentEntry;