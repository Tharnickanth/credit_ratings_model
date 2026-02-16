// app/api/rating-assessments/manage/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// Helper function to log activity
async function logActivity(username, description, action = 'general') {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db');
    const logsCollection = db.collection('UserActivityLog');

    const logEntry = {
      username,
      description,
      action,
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
      createdAt: new Date()
    };

    await logsCollection.insertOne(logEntry);
    console.log('Activity logged:', description);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// GET - Fetch all approved assessments (both visible and hidden)
export async function GET(request) {
  try {
    console.log('=== Fetching Assessments for Management ===');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Get all approved and rejected assessments (for management)
    const assessments = await assessmentsCollection
      .find({ 
        approvalStatus: { $in: ['approved', 'rejected'] }
      })
      .sort({ updatedAt: -1 })
      .toArray();

    console.log(`Found ${assessments.length} assessments`);

    return NextResponse.json({
      success: true,
      assessments: assessments.map(assessment => ({
        id: assessment._id.toString(),
        name: assessment.name || 'Untitled Assessment',
        status: assessment.status,
        categories: assessment.categories || [],
        createdAt: assessment.createdAt,
        createdBy: assessment.createdBy,
        updatedAt: assessment.updatedAt,
        updatedBy: assessment.updatedBy,
        approvalStatus: assessment.approvalStatus,
        approvedBy: assessment.approvedBy,
        approvedAt: assessment.approvedAt,
        approvalComments: assessment.approvalComments,
        isDeleted: assessment.isDeleted || false
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch assessments'
    }, { status: 500 });
  }
}

// POST - Toggle visibility (hide/visual)
export async function POST(request) {
  try {
    console.log('=== Toggling Assessment Visibility ===');
    
    const { assessmentId, action, username } = await request.json();

    if (!assessmentId || !action) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID and action are required'
      }, { status: 400 });
    }

    if (!['hide', 'visual'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Action must be either "hide" or "visual"'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

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

    // Only update the isDeleted field - do NOT update updatedAt or updatedBy
    const updateData = {
      isDeleted: action === 'hide' ? true : false
    };

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

    console.log(`Assessment ${action === 'hide' ? 'hidden' : 'made visible'} successfully - only isDeleted field updated`);

    // Log the activity
    const logUsername = username || 'Unknown User';
    const actionText = action === 'hide' ? 'hidden' : 'made visible';
    const actionType = action === 'hide' ? 'Template Hidden' : 'Template Made Visible';
    
    await logActivity(
      logUsername,
      `${action === 'hide' ? 'Hidden' : 'Made visible'} rating assessment template: "${assessment.name}"`,
      actionType
    );

    return NextResponse.json({
      success: true,
      message: `Assessment ${actionText} successfully`
    }, { status: 200 });

  } catch (error) {
    console.error('Error toggling visibility:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update assessment visibility'
    }, { status: 500 });
  }
}