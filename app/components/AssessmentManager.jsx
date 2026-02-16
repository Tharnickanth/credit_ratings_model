'use client';
import React, { useState } from 'react';
import RatingAssessmentList from './RatingAssessmentList';
import CreateRatingAssessment from './CreateRatingAssessment';

const AssessmentManager = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'
  const [editAssessmentId, setEditAssessmentId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateNew = () => {
    console.log('=== Switching to Create View ===');
    setCurrentView('create');
    setEditAssessmentId(null);
  };

  const handleEdit = (assessmentId) => {
    console.log('=== Switching to Edit View ===');
    console.log('Assessment ID:', assessmentId);
    setEditAssessmentId(assessmentId);
    setCurrentView('edit');
  };

  const handleSaveSuccess = (data) => {
    console.log('=== Save Success ===');
    console.log('Returning to list view');
    setCurrentView('list');
    setEditAssessmentId(null);
    // Trigger refresh of the list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    console.log('=== Cancel ===');
    console.log('Returning to list view');
    setCurrentView('list');
    setEditAssessmentId(null);
  };

  return (
    <div>
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
          onCancel={handleCancel}
        />
      )}

      {currentView === 'edit' && editAssessmentId && (
        <CreateRatingAssessment 
          key={editAssessmentId} // Important: Force re-render with new key
          editMode={true}
          assessmentId={editAssessmentId}
          onSaveSuccess={handleSaveSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default AssessmentManager;