'use client';
import React, { useState } from 'react';
import RatingAssessmentList from './RatingAssessmentList';
import CreateRatingAssessment from './CreateRatingAssessment';

const RatingAssessmentManager = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateNew = () => {
    setEditingAssessmentId(null);
    setCurrentView('create');
  };

  const handleEdit = (assessmentId) => {
    setEditingAssessmentId(assessmentId);
    setCurrentView('edit');
  };

  const handleSaveSuccess = (data) => {
    // Trigger refresh of the list
    setRefreshTrigger(prev => prev + 1);
    
    // Return to list view
    setCurrentView('list');
    setEditingAssessmentId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'list' && (
        <RatingAssessmentList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
        />
      )}

      {currentView === 'create' && (
        <CreateRatingAssessment
          editMode={false}
          assessmentId={null}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      {currentView === 'edit' && editingAssessmentId && (
        <CreateRatingAssessment
          editMode={true}
          assessmentId={editingAssessmentId}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
};

export default RatingAssessmentManager;