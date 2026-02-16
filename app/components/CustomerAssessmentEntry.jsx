'use client';
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle, Save, User, Users, UserPlus, Award, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

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
  const [autoDetectedType, setAutoDetectedType] = useState(null); // Store the auto-detected type
  const [manualOverride, setManualOverride] = useState(false); // Track if user manually changed type

  // Previous Assessments Modal
  const [showPrevAssessments, setShowPrevAssessments] = useState(false);
  const [previousAssessments, setPreviousAssessments] = useState([]);
  const [loadingPrevAssessments, setLoadingPrevAssessments] = useState(false);
  const [expandedAssessmentIdx, setExpandedAssessmentIdx] = useState(null);

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nicError, setNicError] = useState('');

  // NIC Validation Function
  const validateNIC = (value) => {
    // Remove any whitespace
    const trimmedValue = value.trim();
    
    // Check if empty
    if (!trimmedValue) {
      setNicError('');
      return true;
    }
    
    // Check length (must be 10 or 12 characters)
    if (trimmedValue.length !== 10 && trimmedValue.length !== 12) {
      setNicError('NIC must be exactly 10 or 12 characters');
      return false;
    }
    
    // Validate based on length
    if (trimmedValue.length === 10) {
      // 10 characters: first 9 must be digits, 10th must be X or V
      const first9Digits = /^[0-9]{9}$/;
      const last1Letter = /^[xXvV]$/;
      
      if (!first9Digits.test(trimmedValue.substring(0, 9))) {
        setNicError('For 10-character NIC: first 9 characters must be numbers');
        return false;
      }
      
      if (!last1Letter.test(trimmedValue.charAt(9))) {
        setNicError('For 10-character NIC: last character must be X or V');
        return false;
      }
    } else if (trimmedValue.length === 12) {
      // 12 characters: all must be digits
      const allDigits = /^[0-9]{12}$/;
      
      if (!allDigits.test(trimmedValue)) {
        setNicError('For 12-character NIC: all characters must be numbers');
        return false;
      }
    }
    
    setNicError('');
    return true;
  };

  // Handle NIC input change
  const handleNicChange = (value) => {
    setNic(value);
    validateNIC(value);
  };

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

    // Validate NIC format if provided
    if (nic.trim() && !validateNIC(nic)) {
      setError('Please fix the NIC format before checking customer status');
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
        setAutoDetectedType(result.customerType); // Store the auto-detected type
        setManualOverride(false); // Reset manual override flag
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

  // Handler for manual customer type selection
  const handleManualTypeChange = (newType) => {
    setCustomerType(newType);
    setIsExistingCustomer(newType === 'existing');
    setManualOverride(true);
    
    // Log activity
    logActivity(
      `Manually changed customer type to: ${newType} for customer ${customerName.trim() || customerId.trim() || nic.trim()}`,
      'Manual Type Override'
    );
    
    console.log(`✏️ User manually changed customer type to: ${newType}`);
  };

  const fetchPreviousAssessments = async () => {
    if (!customerId.trim()) return;
    setLoadingPrevAssessments(true);
    setShowPrevAssessments(true);
    setExpandedAssessmentIdx(null);
    try {
      const response = await fetch(`/api/customer-assessments?customerId=${encodeURIComponent(customerId.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousAssessments(data.assessments || []);
      } else {
        setPreviousAssessments([]);
        setError('Failed to load previous assessments');
      }
    } catch (err) {
      console.error('Error fetching previous assessments:', err);
      setPreviousAssessments([]);
      setError('Failed to load previous assessments');
    } finally {
      setLoadingPrevAssessments(false);
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
    // Only save to customers collection if:
    // 1. It's a NEW customer (current selection)
    // 2. NOT in edit mode
    // 3. The customer was NOT originally detected as existing (autoDetectedType !== 'existing')
    //    This prevents trying to save a customer that already exists in the database
    //    even if the user manually changed the type to 'new'
    if (customerType === 'new' && !editMode && autoDetectedType !== 'existing') {
      try {
        const response = await fetch('/api/customer', {
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
    } else if (autoDetectedType === 'existing' && customerType === 'new') {
      console.log('ℹ️ Skipping customer save - Customer already exists in database (was auto-detected as existing, but manually changed to new)');
    } else if (customerType === 'existing') {
      console.log('ℹ️ Skipping customer save - Existing customer selected');
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
        approvalStatus: 'pending',
        ...(editMode && { updatedBy: user?.username || 'system' })
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
                onChange={(e) => handleNicChange(e.target.value)}
                placeholder="Enter NIC number"
                disabled={isExistingCustomer}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 
                  ${isExistingCustomer ? 'bg-gray-100 cursor-not-allowed' : ''} 
                  ${nicError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {nicError && (
                <p className="mt-1 text-sm text-red-600">{nicError}</p>
              )}
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
                disabled={checkingCustomer || (!customerId.trim() && !nic.trim()) || nicError}
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
                    </div>
                  </>
                ) : (
                  <>
                    <Users className="text-green-600" size={24} />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800">Existing Customer</h4>
                      <p className="text-sm text-green-600">Customer found</p>
                    </div>
                    <button
                      onClick={fetchPreviousAssessments}
                      className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2 rounded-lg transition-colors ml-auto flex-shrink-0"
                    >
                      <FileText size={16} />
                      View Previous Assessments
                    </button>
                  </>
                )}
              </div>

              {/* Manual Customer Type Selection */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Customer Type Selection</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {manualOverride ? (
                      <span className="text-orange-600">⚠️ Manually overridden from auto-detected: {autoDetectedType === 'new' ? 'New' : 'Existing'}</span>
                    ) : (
                      <span>Auto-detected. You can manually change if needed.</span>
                    )}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManualTypeChange('new')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                      customerType === 'new'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <UserPlus size={18} />
                    <span className="font-medium">New Customer</span>
                  </button>
                  
                  <button
                    onClick={() => handleManualTypeChange('existing')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                      customerType === 'existing'
                        ? 'bg-green-600 border-green-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <Users size={18} />
                    <span className="font-medium">Existing Customer</span>
                  </button>
                </div>
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
                onClick={() => setShowConfirmModal(true)}
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

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          saveAssessment();
        }}
        title={editMode ? 'Update & Resubmit Assessment' : 'Submit Assessment for Approval'}
        message="The record will be saved as pending approval. Are you sure you want to proceed?"
        confirmText={editMode ? 'Update & Resubmit' : 'Submit for Approval'}
        cancelText="Cancel"
        type="info"
      />

      {/* Previous Assessments Modal */}
      {showPrevAssessments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setShowPrevAssessments(false)}
          />

          {/* Modal Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Previous Assessments</h3>
                <p className="text-sm text-gray-500 mt-0.5">{customerName} &middot; ID: {customerId} &middot; NIC: {nic}</p>
              </div>
              <button
                onClick={() => setShowPrevAssessments(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body – scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">

              {/* Loading spinner */}
              {loadingPrevAssessments && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-sm">Loading…</p>
                </div>
              )}

              {/* Empty state */}
              {!loadingPrevAssessments && previousAssessments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <FileText size={36} className="mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No previous assessments found</p>
                  <p className="text-xs text-gray-400 mt-1">This customer has not been assessed before</p>
                </div>
              )}

              {/* Assessment cards */}
              {!loadingPrevAssessments && previousAssessments.map((assessment, idx) => {
                const isExpanded = expandedAssessmentIdx === idx;

                // Decide which date to show: updatedAt if available & different from createdAt, else createdAt
                const displayDate = assessment.updatedAt && assessment.updatedAt !== assessment.createdAt
                  ? assessment.updatedAt
                  : assessment.createdAt;
                const dateLabel = assessment.updatedAt && assessment.updatedAt !== assessment.createdAt
                  ? 'Updated'
                  : 'Created';

                // Rating badge colour
                const ratingBg = (() => {
                  const r = (assessment.rating || '').toUpperCase();
                  if (r === 'A+') return 'bg-green-600';
                  if (r === 'A')  return 'bg-green-500';
                  if (r === 'A-') return 'bg-blue-600';
                  if (r === 'B')  return 'bg-blue-500';
                  if (r === 'C+') return 'bg-yellow-600';
                  if (r === 'C')  return 'bg-yellow-500';
                  if (r === 'C-') return 'bg-orange-500';
                  return 'bg-red-600'; // D
                })();

                return (
                  <div key={assessment.id || idx} className="border border-gray-200 rounded-xl overflow-hidden">

                    {/* Card header – always visible, click to expand */}
                    <button
                      onClick={() => setExpandedAssessmentIdx(isExpanded ? null : idx)}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3"
                    >
                      {/* Rating badge */}
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${ratingBg} text-white font-bold text-base flex-shrink-0`}>
                        {assessment.rating || '–'}
                      </span>

                      {/* Middle info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{assessment.assessmentTemplateName || 'Unknown Template'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Score: <span className="font-medium text-gray-700">{Number(assessment.totalScore).toFixed(2)}</span>
                          &nbsp;·&nbsp;
                          {dateLabel}: <span className="font-medium text-gray-700">{new Date(displayDate).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {/* Chevron */}
                      {isExpanded ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-3">

                        {/* Summary row */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Total Score</p>
                            <p className="font-bold text-gray-800">{Number(assessment.totalScore).toFixed(2)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Rating</p>
                            <p className={`font-bold ${ratingBg.replace('bg-', 'text-')}`}>{assessment.rating || '–'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Assessed By</p>
                            <p className="font-bold text-gray-800 text-sm">{assessment.assessedBy || '–'}</p>
                          </div>
                        </div>

                        {/* Template & date row */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span><span className="font-medium text-gray-600">Template:</span> {assessment.assessmentTemplateName || '–'}</span>
                          <span><span className="font-medium text-gray-600">{dateLabel}:</span> {new Date(displayDate).toLocaleString()}</span>
                        </div>

                        {/* Category scores */}
                        {Array.isArray(assessment.categoryScores) && assessment.categoryScores.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Category Scores</p>
                            <div className="space-y-1.5">
                              {assessment.categoryScores.map((cat, ci) => (
                                <div key={ci} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                                  <span className="text-sm text-gray-700">{cat.categoryName}</span>
                                  <span className="text-sm font-semibold text-gray-800">{Number(cat.score).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approval status pill */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-gray-500">Status:</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            assessment.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                            assessment.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {(assessment.approvalStatus || 'pending').charAt(0).toUpperCase() + (assessment.approvalStatus || 'pending').slice(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowPrevAssessments(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-5 py-2 rounded-lg transition-colors"
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

export default CustomerAssessmentEntry;