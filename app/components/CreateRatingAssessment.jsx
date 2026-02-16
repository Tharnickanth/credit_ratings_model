'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
const CreateRatingAssessment = ({ 
  editMode = false, 
  assessmentId = null, 
  onSaveSuccess = null, 
  onCancel = null 
}) => {
  // ========== STATE MANAGEMENT ==========
  const [categories, setCategories] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedExistingCategory, setSelectedExistingCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentName, setAssessmentName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRejected, setIsRejected] = useState(false);
  const [existingAssessmentNames, setExistingAssessmentNames] = useState([]);
  const [originalAssessmentName, setOriginalAssessmentName] = useState('');

    // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Weight confirmation modal state
  const [weightConfirmModal, setWeightConfirmModal] = useState({
    isOpen: false,
    newWeightSum: 0,
    existingWeightSum: 0
  });

  // ========== INITIAL DATA LOADING ==========
  useEffect(() => {
    loadExistingCategories();
    loadExistingAssessmentNames();
  }, []);

  useEffect(() => {
    if (editMode && assessmentId) {
      loadAssessment();
    } else {
      // Reset form for create mode
      setCategories([]);
      setAssessmentName('');
      setOriginalAssessmentName('');
      setIsRejected(false);
    }
  }, [editMode, assessmentId]);

  // ========== API FUNCTIONS ==========
  const loadExistingCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setExistingCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories');
      setError('Failed to load categories');
    }
  };

  const loadExistingAssessmentNames = async () => {
    try {
      const response = await fetch('/api/rating-assessments');
      if (response.ok) {
        const data = await response.json();
        const names = data.assessments.map(a => ({
          name: a.name.toLowerCase(),
          id: a.id
        }));
        setExistingAssessmentNames(names);
      }
    } catch (error) {
      console.error('Error loading assessment names');
    }
  };

  const loadAssessment = async () => {
    try {
      setIsLoading(true);
      
      const url = `/api/rating-assessments?id=${assessmentId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load assessment');
      }
      
      const data = await response.json();
      const assessment = data.assessment;
      
      if (!assessment) {
        throw new Error('Assessment data is missing');
      }

      // Set basic info
      setAssessmentName(assessment.name || '');
      setOriginalAssessmentName(assessment.name || '');
      setIsRejected(assessment.approvalStatus === 'rejected');
      
      // Transform categories
      const transformedCategories = (assessment.categories || []).map((cat, catIndex) => {
        return {
          id: Date.now() + catIndex + Math.random(),
          categoryId: cat.categoryId,
          name: cat.categoryName || 'Unnamed Category',
          isNew: false,
          questions: (cat.questions || []).map((q, qIndex) => {
            return {
              id: Date.now() + catIndex + qIndex + Math.random() * 1000,
              questionId: q.questionId,
              text: q.text || '',
              proposedWeight: {
                new: parseFloat(q.proposedWeight?.new || 0),
                existing: parseFloat(q.proposedWeight?.existing || 0)
              },
              status: q.status || 'pending_approval',
              answers: (q.answers || []).map((a, aIndex) => ({
                id: Date.now() + catIndex + qIndex + aIndex + Math.random() * 10000,
                answerId: a.answerId,
                text: a.text || '',
                score: {
                  new: parseFloat(a.score?.new || 0),
                  existing: parseFloat(a.score?.existing || 0)
                }
              }))
            };
          })
        };
      });
      
      setCategories(transformedCategories);
      
    } catch (error) {
      console.error('Error loading assessment');
      setError(error.message || 'Failed to load assessment');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Continue in Part 2...

// ========== CATEGORY MANAGEMENT FUNCTIONS ==========
  const addExistingCategory = () => {
    if (selectedExistingCategory) {
      const category = existingCategories.find(c => c.id === selectedExistingCategory);
      if (category) {
        if (categories.find(c => c.categoryId === category.id)) {
          setError('This category is already added');
          setTimeout(() => setError(''), 3000);
          return;
        }
        setCategories([
          ...categories,
          {
            id: Date.now(),
            categoryId: category.id,
            name: category.name,
            isNew: false,
            questions: []
          }
        ]);
        setSelectedExistingCategory('');
        setShowCategoryModal(false);
      }
    }
  };

  const addNewCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        const currentUser = typeof window !== 'undefined' && localStorage.getItem('user') 
          ? JSON.parse(localStorage.getItem('user')).username 
          : null;

        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            createdBy: currentUser
          })
        });

        const result = await response.json();

        if (response.ok) {
          setCategories([
            ...categories,
            {
              id: Date.now(),
              categoryId: result.category.id,
              name: newCategoryName.trim(),
              isNew: false,
              questions: []
            }
          ]);
          
          loadExistingCategories();
          
          setNewCategoryName('');
          setShowCategoryModal(false);
          setSuccess('Category created successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.message || 'Failed to create category');
          setTimeout(() => setError(''), 3000);
        }
      } catch (error) {
        console.error('Error creating category');
        setError('Failed to create category. Please try again.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const deleteCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${category?.name}"? This will also delete all questions and answers within this category.`,
      onConfirm: () => {
        setCategories(categories.filter(cat => cat.id !== categoryId));
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
      type: 'danger'
    });
  };

 // ========== QUESTION MANAGEMENT FUNCTIONS ==========
  const addQuestion = (categoryId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: [
            ...cat.questions,
            {
              id: Date.now() + Math.random(),
              text: '',
              proposedWeight: { new: 0, existing: 0 },
              status: 'pending_approval',
              answers: [
                { 
                  id: Date.now() + Math.random() + 1, 
                  text: '', 
                  score: { new: 0, existing: 0 } 
                }
              ]
            }
          ]
        };
      }
      return cat;
    }));
  };

  const updateQuestion = (categoryId, questionId, field, value) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              return { ...q, [field]: value };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  const updateQuestionWeight = (categoryId, questionId, customerTypeField, value) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              return { 
                ...q, 
                proposedWeight: {
                  ...q.proposedWeight,
                  [customerTypeField]: parseFloat(value) || 0
                }
              };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  const deleteQuestion = (categoryId, questionId) => {
    const category = categories.find(cat => cat.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Question',
      message: `Are you sure you want to delete this question${question?.text ? `: "${question.text}"` : ''}? This will also delete all associated answers.`,
      onConfirm: () => {
        setCategories(categories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              questions: cat.questions.filter(q => q.id !== questionId)
            };
          }
          return cat;
        }));
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
      type: 'danger'
    });
  };

  // ========== ANSWER MANAGEMENT FUNCTIONS ==========
  const addAnswer = (categoryId, questionId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                answers: [
                  ...q.answers,
                  { 
                    id: Date.now() + Math.random(), 
                    text: '', 
                    score: { new: 0, existing: 0 } 
                  }
                ]
              };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  const updateAnswer = (categoryId, questionId, answerId, field, value) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                answers: q.answers.map(a => {
                  if (a.id === answerId) {
                    return { ...a, [field]: value };
                  }
                  return a;
                })
              };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  const updateAnswerScore = (categoryId, questionId, answerId, customerTypeField, value) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                answers: q.answers.map(a => {
                  if (a.id === answerId) {
                    return { 
                      ...a, 
                      score: {
                        ...a.score,
                        [customerTypeField]: parseFloat(value) || 0
                      }
                    };
                  }
                  return a;
                })
              };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  const deleteAnswer = (categoryId, questionId, answerId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === questionId) {
              if (q.answers.length <= 1) {
                setError('A question must have at least 1 answer');
                setTimeout(() => setError(''), 3000);
                return q;
              }
              return {
                ...q,
                answers: q.answers.filter(a => a.id !== answerId)
              };
            }
            return q;
          })
        };
      }
      return cat;
    }));
  };

  // Continue in Part 2...


  // ========== SAVE ASSESSMENT FUNCTION ==========
  const saveAssessment = async () => {
    setError('');
    setSuccess('');

    // Validation: Assessment name
    if (!assessmentName.trim()) {
      setError('Please provide an assessment name');
      return;
    }

    const currentNameLower = assessmentName.trim().toLowerCase();
    
    // Check for duplicate names
    if (!editMode) {
      if (existingAssessmentNames.some(a => a.name === currentNameLower)) {
        setError('An assessment with this name already exists. Please use a different name.');
        return;
      }
    } else {
      if (currentNameLower !== originalAssessmentName.toLowerCase()) {
        if (existingAssessmentNames.some(a => a.name === currentNameLower && a.id !== assessmentId)) {
          setError('An assessment with this name already exists. Please use a different name.');
          return;
        }
      }
    }

    // Validation: Categories
    if (categories.length === 0) {
      setError('Please add at least one category');
      return;
    }

    // Validation: Questions and answers
    for (const cat of categories) {
      if (cat.questions.length === 0) {
        setError(`Category "${cat.name}" must have at least one question`);
        return;
      }

      for (const q of cat.questions) {
        if (!q.text.trim()) {
          setError(`Please fill in all question texts in category "${cat.name}"`);
          return;
        }

        if (q.proposedWeight.new < 0 || q.proposedWeight.new > 100) {
          setError(`Proposed weight for new customers in "${cat.name}" must be between 0 and 100`);
          return;
        }

        if (q.proposedWeight.existing < 0 || q.proposedWeight.existing > 100) {
          setError(`Proposed weight for existing customers in "${cat.name}" must be between 0 and 100`);
          return;
        }

        for (const a of q.answers) {
          if (!a.text.trim()) {
            setError(`Please fill in all answer texts for question: "${q.text}"`);
            return;
          }
        }
      }
    }

    // Calculate weight sums
    let newWeightSum = 0;
    let existingWeightSum = 0;

    categories.forEach(category => {
      category.questions.forEach(question => {
        newWeightSum += parseFloat(question.proposedWeight.new || 0);
        existingWeightSum += parseFloat(question.proposedWeight.existing || 0);
      });
    });

    // Show weight confirmation modal
    setWeightConfirmModal({
      isOpen: true,
      newWeightSum: Math.round(newWeightSum * 100) / 100,
      existingWeightSum: Math.round(existingWeightSum * 100) / 100
    });
  };

  const proceedWithSave = async () => {
    // Close the weight confirmation modal
    setWeightConfirmModal({ isOpen: false, newWeightSum: 0, existingWeightSum: 0 });

    setIsLoading(true);
    const currentUser = typeof window !== 'undefined' && localStorage.getItem('user') 
      ? JSON.parse(localStorage.getItem('user')).username 
      : null;

    const assessmentData = {
      name: assessmentName.trim(),
      categories: categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.name,
        isNew: false,
        questions: cat.questions.map(q => ({
          questionId: q.questionId,
          text: q.text,
          proposedWeight: q.proposedWeight,
          status: 'pending_approval',
          answers: q.answers.map(a => ({
            answerId: a.answerId,
            text: a.text,
            score: a.score
          }))
        }))
      })),
      createdBy: currentUser
    };

    try {
      const url = '/api/rating-assessments';
      const method = editMode ? 'PUT' : 'POST';
      
      if (editMode) {
        assessmentData.id = assessmentId;
        assessmentData.updatedBy = currentUser;
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData)
      });

      const result = await response.json();

      if (response.ok) {
        if (editMode && isRejected) {
          setSuccess('Assessment updated and resubmitted for approval!');
        } else if (editMode) {
          setSuccess('Assessment updated and sent for approval!');
        } else {
          setSuccess('Assessment created and sent for approval!');
        }
        
        setTimeout(() => {
          if (onSaveSuccess) {
            onSaveSuccess(result.data);
          } else {
            setCategories([]);
            setAssessmentName('');
            loadExistingCategories();
          }
        }, 1500);
      } else {
        setError(result.message || 'Failed to save assessment');
      }
    } catch (error) {
      console.error('Error saving assessment');
      setError('Failed to save assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== CANCEL HANDLER ==========
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      if (onCancel) {
        onCancel();
      } else if (onSaveSuccess) {
        onSaveSuccess(null);
      } else {
        setCategories([]);
        setAssessmentName('');
      }
    }
  };

  // Continue in Part 4...

  // ========== RENDER: LOADING STATE ==========
  if (isLoading && editMode && categories.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment data...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER: MAIN COMPONENT ==========
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {editMode ? (isRejected ? 'Edit & Resubmit Assessment' : 'Edit Credit Rating Assessment Template') : 'Create Credit Rating Assessment Template'}
        </h2>
        <p className="text-gray-600">
          {editMode && isRejected 
            ? 'Make changes and resubmit your assessment for approval.' 
            : 'Design your credit rating questionnaire with weights for both new and existing customers. All questions will be sent for approval.'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-medium text-red-800">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto text-red-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-green-800">Success</h4>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Assessment Name Input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assessment Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={assessmentName}
          onChange={(e) => {
            setAssessmentName(e.target.value);
            if (error.includes('already exists')) {
              setError('');
            }
          }}
          placeholder="Enter assessment name (e.g., SME Credit Assessment 2024)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-2 text-sm text-gray-500">
          Provide a unique, descriptive name for this assessment to help identify it later.
        </p>
      </div>

      {/* Continue in Part 5... */}


      {/* Categories & Questions Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Categories & Questions</h3>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No categories added yet. Click "Add Category" to start.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category, catIndex) => (
              <div key={category.id} className="border border-gray-300 rounded-lg p-4">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800">{category.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addQuestion(category.id)}
                      className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Plus size={16} />
                      Add Question
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                {category.questions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-sm">No questions added yet. Click "Add Question" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {category.questions.map((question, qIndex) => (
                      <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {/* Question Header */}
                        <div className="flex flex-col lg:flex-row items-start gap-4">
                          <span className="text-sm font-medium text-gray-700 mt-2">Q{qIndex + 1}</span>
                          
                          {/* Question Text Input */}
                          <div className="flex-1 w-full">
                            <textarea
                              value={question.text}
                              onChange={(e) => updateQuestion(category.id, question.id, 'text', e.target.value)}
                              placeholder="Enter question text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                              rows={2}
                            />
                          </div>

                          {/* Question Weights - Side by Side */}
                          <div className="w-full lg:w-auto">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Proposed Weight (0-100) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 lg:flex-none">
                                <label className="block text-xs text-gray-600 mb-1">New</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={question.proposedWeight.new}
                                  onChange={(e) => updateQuestionWeight(category.id, question.id, 'new', e.target.value)}
                                  placeholder="0"
                                  className="w-full lg:w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                                />
                              </div>
                              
                              <div className="flex-1 lg:flex-none">
                                <label className="block text-xs text-gray-600 mb-1">Existing</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={question.proposedWeight.existing}
                                  onChange={(e) => updateQuestionWeight(category.id, question.id, 'existing', e.target.value)}
                                  placeholder="0"
                                  className="w-full lg:w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Delete Question Button */}
                          <button
                            onClick={() => deleteQuestion(category.id, question.id)}
                            className="text-red-600 hover:text-red-700 self-start lg:self-center lg:mt-8"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {/* Continue in Part 7 for answers... */}

                        {/* Answers Section */}
                        <div className="ml-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Answers <span className="text-red-500">*</span>
                            </label>
                            <button
                              onClick={() => addAnswer(category.id, question.id)}
                              className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            >
                              <Plus size={14} />
                              Add Answer
                            </button>
                          </div>

                          <div className="space-y-3">
                            {question.answers.map((answer, aIndex) => (
                              <div key={answer.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <span className="text-sm text-gray-600 w-6 mt-2 sm:mt-0">{aIndex + 1}.</span>
                                
                                {/* Answer Text Input */}
                                <input
                                  type="text"
                                  value={answer.text}
                                  onChange={(e) => updateAnswer(category.id, question.id, answer.id, 'text', e.target.value)}
                                  placeholder="Answer text"
                                  className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                />
                                
                                {/* Answer Scores - Side by Side */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <div className="flex-1 sm:flex-none">
                                    <label className="block text-xs text-gray-600 mb-1">New</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={answer.score.new}
                                      onChange={(e) => updateAnswerScore(category.id, question.id, answer.id, 'new', e.target.value)}
                                      placeholder="0"
                                      className="w-full sm:w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                                    />
                                  </div>
                                  
                                  <div className="flex-1 sm:flex-none">
                                    <label className="block text-xs text-gray-600 mb-1">Existing</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={answer.score.existing}
                                      onChange={(e) => updateAnswerScore(category.id, question.id, answer.id, 'existing', e.target.value)}
                                      placeholder="0"
                                      className="w-full sm:w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                                    />
                                  </div>
                                </div>
                                
                                {/* Delete Answer Button */}
                                <button
                                  onClick={() => deleteAnswer(category.id, question.id, answer.id)}
                                  className="text-red-600 hover:text-red-700 self-center sm:self-auto"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Continue in Part 8 for action buttons and modal... */}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <X size={20} />
          Cancel
        </button>
        <button
          onClick={saveAssessment}
          disabled={isLoading}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isLoading ? 'Saving...' : (editMode ? (isRejected ? 'Resubmit for Approval' : 'Update & Send for Approval') : 'Save & Send for Approval')}
        </button>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Category</h3>
            
            {/* Existing Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Use Existing Category
              </label>
              <select
                value={selectedExistingCategory}
                onChange={(e) => setSelectedExistingCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">-- Select a category --</option>
                {existingCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                onClick={addExistingCategory}
                disabled={!selectedExistingCategory}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Existing Category
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* New Category Creation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create New Category
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-gray-900"
                onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
              />
              <button
                onClick={addNewCategory}
                disabled={!newCategoryName.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create New Category
              </button>
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                  setSelectedExistingCategory('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Weight Confirmation Modal */}
      {weightConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Proposed Weights</h3>
            
            <div className="mb-6 space-y-4">
              <p className="text-gray-600 mb-4">
                Please review the total proposed weights before submitting:
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">New: Total Proposed Weight:</span>
                  <span className={`text-lg font-bold ${
                    weightConfirmModal.newWeightSum > 100 
                      ? 'text-red-600' 
                      : weightConfirmModal.newWeightSum === 100 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                  }`}>
                    {weightConfirmModal.newWeightSum}
                  </span>
                </div>
                {weightConfirmModal.newWeightSum > 100 && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ❌ Total cannot exceed 100
                  </p>
                )}
                {weightConfirmModal.newWeightSum < 100 && weightConfirmModal.newWeightSum !== 100 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Recommended total is 100
                  </p>
                )}
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Old: Total Proposed Weight:</span>
                  <span className={`text-lg font-bold ${
                    weightConfirmModal.existingWeightSum > 100 
                      ? 'text-red-600' 
                      : weightConfirmModal.existingWeightSum === 100 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                  }`}>
                    {weightConfirmModal.existingWeightSum}
                  </span>
                </div>
                {weightConfirmModal.existingWeightSum > 100 && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ❌ Total cannot exceed 100
                  </p>
                )}
                {weightConfirmModal.existingWeightSum < 100 && weightConfirmModal.existingWeightSum !== 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Recommended total is 0
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setWeightConfirmModal({ isOpen: false, newWeightSum: 0, existingWeightSum: 0 })}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithSave}
                disabled={weightConfirmModal.newWeightSum > 100 || weightConfirmModal.existingWeightSum > 100}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirm & Submit
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

export default CreateRatingAssessment;

// ========== END OF COMPONENT ==========