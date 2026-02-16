// app/api/approvals/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// GET - Fetch pending approvals
export async function GET(request) {
  try {
 
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Get all assessments pending approval
    const pendingAssessments = await assessmentsCollection
      .find({ 
        approvalStatus: 'pending',
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray();


    return NextResponse.json({
      success: true,
      approvals: pendingAssessments.map(assessment => ({
        id: assessment._id.toString(),
        name: assessment.name || 'Untitled Assessment',
        status: assessment.status,
        categories: assessment.categories || [],
        createdAt: assessment.createdAt,
        createdBy: assessment.createdBy,
        updatedAt: assessment.updatedAt,
        updatedBy: assessment.updatedBy,
        approvalStatus: assessment.approvalStatus
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch approvals'
    }, { status: 500 });
  }
}

// POST - Approve or Reject assessment
export async function POST(request) {
  try {

    const { assessmentId, action, approvedBy, comments } = await request.json();

    if (!assessmentId || !action || !approvedBy) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID, action, and approver are required'
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      }, { status: 400 });
    }

    // If rejecting, require comments
    if (action === 'reject' && (!comments || !comments.trim())) {
      return NextResponse.json({
        success: false,
        message: 'Comments are required when rejecting an assessment'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');
    const logsCollection = db.collection('UserActivityLog');

    // Get the assessment details before updating
    const assessment = await assessmentsCollection.findOne({
      _id: new ObjectId(assessmentId)
    });

    if (!assessment) {
      return NextResponse.json({
        success: false,
        message: 'Assessment not found'
      }, { status: 404 });
    }

    const updateData = {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      status: action === 'approve' ? 'active' : 'rejected',
      approvedBy: approvedBy,
      approvedAt: new Date(),
      approvalComments: comments && comments.trim() ? comments.trim() : null
    };

    // If approved, also update all questions status
    if (action === 'approve') {
      if (assessment.categories) {
        updateData.categories = assessment.categories.map(cat => ({
          ...cat,
          questions: cat.questions.map(q => ({
            ...q,
            status: 'approved'
          }))
        }));
      }
    }

    const result = await assessmentsCollection.updateOne(
      { _id: new ObjectId(assessmentId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Assessment not found'
      }, { status: 404 });
    }

    // Log the activity
    const actionText = action === 'approve' ? 'Approved' : 'Rejected';
    const logDescription = `${actionText} assessment template "${assessment.name}"${comments ? ` with comments: "${comments}"` : ''}`;
    
    const logEntry = {
      username: approvedBy,
      description: logDescription,
      action: action === 'approve' ? 'template_approved' : 'template_rejected',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: {
        assessmentId: assessmentId,
        assessmentName: assessment.name,
        action: action,
        comments: comments || null
      }
    };

    await logsCollection.insertOne(logEntry);


    return NextResponse.json({
      success: true,
      message: `Assessment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    }, { status: 200 });

  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process approval'
    }, { status: 500 });
  }
}