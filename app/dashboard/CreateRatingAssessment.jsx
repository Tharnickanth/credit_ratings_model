import React, { useState } from 'react';
import { FileCheck, Plus, Trash2, Save, X, Loader2, GripVertical } from 'lucide-react';

const CreateRatingAssessment = () => {
  const [formData, setFormData] = useState({
    assessmentName: '',
    description: '',
    status: 'active',
    questions: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add a new question
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      questionText: '',
      proposedWeight: '',
      answers: [
        { id: Date.now() + 1, answerText: '', score: '' },
        { id: Date.now() + 2, answerText: '', score: '' }
      ]
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  // Remove a question
  const removeQuestion = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  // Update question text or weight
  const updateQuestion = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
    // Clear errors
    if (errors[`question_${questionId}_${field}`]) {
      setErrors(prev => ({ ...prev, [`question_${questionId}_${field}`]: '' }));
    }
  };

  // Add answer to a question
  const addAnswer = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              answers: [...q.answers, { id: Date.now(), answerText: '', score: '' }]
            }
          : q
      )
    }));
  };

  // Remove answer from a question
  const removeAnswer = (questionId, answerId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.filter(a => a.id !== answerId)
            }
          : q
      )
    }));
  };

  // Update answer text or score
  const updateAnswer = (questionId, answerId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map(a =>
                a.id === answerId ? { ...a, [field]: value } : a
              )
            }
          : q
      )
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.assessmentName.trim()) {
      newErrors.assessmentName = 'Assessment name is required';
    }

    if (formData.questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }

    let totalWeight = 0;

    formData.questions.forEach((question, qIndex) => {
      if (!question.questionText.trim()) {
        newErrors[`question_${question.id}_questionText`] = 'Question text is required';
      }

      if (!question.proposedWeight || question.proposedWeight === '') {
        newErrors[`question_${question.id}_proposedWeight`] = 'Weight is required';
      } else {
        const weight = parseFloat(question.proposedWeight);
        if (isNaN(weight) || weight <= 0 || weight > 100) {
          newErrors[`question_${question.id}_proposedWeight`] = 'Weight must be between 0 and 100';
        } else {
          totalWeight += weight;
        }
      }

      if (question.answers.length < 2) {
        newErrors[`question_${question.id}_answers`] = 'At least 2 answers are required';
      }

      question.answers.forEach((answer, aIndex) => {
        if (!answer.answerText.trim()) {
          newErrors[`answer_${answer.id}_answerText`] = 'Answer text is required';
        }

        if (!answer.score && answer.score !== 0) {
          newErrors[`answer_${answer.id}_score`] = 'Score is required';
        } else if (isNaN(answer.score)) {
          newErrors[`answer_${answer.id}_score`] = 'Score must be a number';
        }
      });
    });

    // Check if total weight is 100%
    if (formData.questions.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
      newErrors.totalWeight = `Total weight must equal 100% (currently ${totalWeight.toFixed(2)}%)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/rating-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to create rating assessment' });
        return;
      }

      setSuccessMessage('Rating assessment created successfully!');
      handleReset();

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error creating rating assessment:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      assessmentName: '',
      description: '',
      status: 'active',
      questions: []
    });
    setErrors({});
  };

  // Calculate total weight
  const calculateTotalWeight = () => {
    return formData.questions.reduce((sum, q) => {
      const weight = parseFloat(q.proposedWeight) || 0;
      return sum + weight;
    }, 0);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create Rating Assessment</h1>
        <p className="text-gray-600 mt-1">Create a new questionnaire-based credit rating assessment</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{errors.general}</span>
        </div>
      )}

      {/* Total Weight Warning */}
      {errors.totalWeight && (
        <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{errors.totalWeight}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileCheck size={20} className="text-cyan-500" />
            Assessment Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assessment Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.assessmentName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, assessmentName: e.target.value }));
                  if (errors.assessmentName) setErrors(prev => ({ ...prev, assessmentName: '' }));
                }}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.assessmentName ? 'border-red-500' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Enter assessment name"
              />
              {errors.assessmentName && <p className="text-red-500 text-sm mt-1">{errors.assessmentName}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                disabled={isLoading}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
                rows={3}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="Enter assessment description"
              />
            </div>
          </div>
        </div>

        {/* Weight Summary */}
        {formData.questions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Weight:</span>
              <span className={`text-lg font-bold ${
                Math.abs(calculateTotalWeight() - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
              }`}>
                {calculateTotalWeight().toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Questions Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
              Add Question
            </button>
          </div>

          {errors.questions && (
            <p className="text-red-500 text-sm mb-4">{errors.questions}</p>
          )}

          {formData.questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileCheck size={48} className="mx-auto mb-4 opacity-30" />
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.questions.map((question, qIndex) => (
                <div key={question.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-2">
                      <GripVertical size={20} className="text-gray-400" />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {/* Question Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-md font-semibold text-gray-700">Question {qIndex + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Question Text and Weight */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Text <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={question.questionText}
                            onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                              errors[`question_${question.id}_questionText`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter question text"
                          />
                          {errors[`question_${question.id}_questionText`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`question_${question.id}_questionText`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Weight (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={question.proposedWeight}
                            onChange={(e) => updateQuestion(question.id, 'proposedWeight', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                              errors[`question_${question.id}_proposedWeight`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
                          />
                          {errors[`question_${question.id}_proposedWeight`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`question_${question.id}_proposedWeight`]}</p>
                          )}
                        </div>
                      </div>

                      {/* Answers */}
                      <div className="ml-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">
                            Answer Options <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => addAnswer(question.id)}
                            disabled={isLoading}
                            className="text-cyan-500 hover:text-cyan-700 text-sm flex items-center gap-1"
                          >
                            <Plus size={16} />
                            Add Answer
                          </button>
                        </div>

                        {errors[`question_${question.id}_answers`] && (
                          <p className="text-red-500 text-sm">{errors[`question_${question.id}_answers`]}</p>
                        )}

                        {question.answers.map((answer, aIndex) => (
                          <div key={answer.id} className="flex items-start gap-3">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div className="md:col-span-4">
                                <input
                                  type="text"
                                  value={answer.answerText}
                                  onChange={(e) => updateAnswer(question.id, answer.id, 'answerText', e.target.value)}
                                  disabled={isLoading}
                                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm ${
                                    errors[`answer_${answer.id}_answerText`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  placeholder={`Answer ${aIndex + 1}`}
                                />
                                {errors[`answer_${answer.id}_answerText`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`answer_${answer.id}_answerText`]}</p>
                                )}
                              </div>

                              <div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={answer.score}
                                  onChange={(e) => updateAnswer(question.id, answer.id, 'score', e.target.value)}
                                  disabled={isLoading}
                                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm ${
                                    errors[`answer_${answer.id}_score`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  placeholder="Score"
                                />
                                {errors[`answer_${answer.id}_score`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`answer_${answer.id}_score`]}</p>
                                )}
                              </div>
                            </div>

                            {question.answers.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeAnswer(question.id, answer.id)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 transition-colors mt-2"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 bg-white rounded-lg shadow p-6">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <X size={18} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Assessment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRatingAssessment;