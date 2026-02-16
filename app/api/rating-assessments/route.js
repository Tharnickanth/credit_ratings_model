// app/api/rating-assessments/route.js
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

export async function POST(request) {
  try {
    console.log('=== Creating Rating Assessment ===');
    
    const data = await request.json();
    const { name, categories, createdBy } = data;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Assessment name is required'
      }, { status: 400 });
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'At least one category is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Check for duplicate assessment name
    const existingAssessment = await assessmentsCollection.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: { $ne: true }
    });

    if (existingAssessment) {
      return NextResponse.json({
        success: false,
        message: 'An assessment with this name already exists'
      }, { status: 400 });
    }

    // Prepare assessment data
    const assessmentData = {
      name: name.trim(),
      status: 'pending_approval',
      categories: categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        isNew: false,
        questions: cat.questions.map(q => ({
          questionId: q.questionId || new ObjectId().toString(),
          text: q.text,
          proposedWeight: {
            new: parseFloat(q.proposedWeight?.new || 0),
            existing: parseFloat(q.proposedWeight?.existing || 0)
          },
          status: 'pending_approval',
          answers: q.answers.map(a => ({
            answerId: a.answerId || new ObjectId().toString(),
            text: a.text,
            score: {
              new: parseFloat(a.score?.new || 0),
              existing: parseFloat(a.score?.existing || 0)
            }
          }))
        }))
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: createdBy || null,
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      approvalComments: null,
      isDeleted: false
    };

    const result = await assessmentsCollection.insertOne(assessmentData);
    
    console.log('Assessment created successfully:', result.insertedId);

    // Log the activity
    const username = createdBy || 'Unknown User';
    const categoryCount = categories.length;
    const questionCount = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
    
    await logActivity(
      username,
      `Created new rating assessment template: "${name.trim()}" with ${categoryCount} categories and ${questionCount} questions`,
      'template_created'
    );

    return NextResponse.json({
      success: true,
      message: 'Assessment created successfully and sent for approval',
      data: {
        id: result.insertedId.toString(),
        ...assessmentData
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating assessment:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create assessment'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    console.log('=== Fetching Rating Assessments ===');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    if (id) {
      console.log('Fetching assessment with ID:', id);
      
      // Validate ObjectId format
      if (!ObjectId.isValid(id)) {
        console.error('Invalid ObjectId format:', id);
        return NextResponse.json({
          success: false,
          message: 'Invalid assessment ID format'
        }, { status: 400 });
      }

      // Get single assessment
      const assessment = await assessmentsCollection.findOne({
        _id: new ObjectId(id),
        isDeleted: { $ne: true }
      });

      if (!assessment) {
        console.error('Assessment not found for ID:', id);
        return NextResponse.json({
          success: false,
          message: 'Assessment template not found or has been deleted'
        }, { status: 404 });
      }

      console.log('Assessment found:', assessment.name);

      return NextResponse.json({
        success: true,
        assessment: {
          id: assessment._id.toString(),
          name: assessment.name,
          status: assessment.status,
          categories: assessment.categories || [],
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          createdBy: assessment.createdBy,
          updatedBy: assessment.updatedBy,
          approvalStatus: assessment.approvalStatus,
          approvedBy: assessment.approvedBy,
          approvedAt: assessment.approvedAt,
          approvalComments: assessment.approvalComments
        }
      }, { status: 200 });
    } else {
      // Get all assessments
      const assessments = await assessmentsCollection
        .find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .toArray();

      console.log(`Found ${assessments.length} assessments`);

      return NextResponse.json({
        success: true,
        assessments: assessments.map(assessment => ({
          id: assessment._id.toString(),
          name: assessment.name,
          status: assessment.status,
          categories: assessment.categories || [],
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          createdBy: assessment.createdBy,
          updatedBy: assessment.updatedBy,
          approvalStatus: assessment.approvalStatus,
          approvedBy: assessment.approvedBy,
          approvedAt: assessment.approvedAt,
          approvalComments: assessment.approvalComments
        }))
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch assessments'
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    console.log('=== Updating Rating Assessment ===');
    
    const data = await request.json();
    const { id, name, categories, updatedBy } = data;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID is required'
      }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Assessment name is required'
      }, { status: 400 });
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'At least one category is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Update assessment
    const updateData = {
      name: name.trim(),
      categories: categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        isNew: false,
        questions: cat.questions.map(q => ({
          questionId: q.questionId || new ObjectId().toString(),
          text: q.text,
          proposedWeight: {
            new: parseFloat(q.proposedWeight?.new || 0),
            existing: parseFloat(q.proposedWeight?.existing || 0)
          },
          status: 'pending_approval',
          answers: q.answers.map(a => ({
            answerId: a.answerId || new ObjectId().toString(),
            text: a.text,
            score: {
              new: parseFloat(a.score?.new || 0),
              existing: parseFloat(a.score?.existing || 0)
            }
          }))
        }))
      })),
      updatedAt: new Date(),
      updatedBy: updatedBy || null,
      status: 'pending_approval',
      approvalStatus: 'pending',
      approvalComments: null
    };

    const result = await assessmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Assessment not found'
      }, { status: 404 });
    }

    console.log('Assessment updated successfully');

    // Log the activity
    const username = updatedBy || 'Unknown User';
    const categoryCount = categories.length;
    const questionCount = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
    
    await logActivity(
      username,
      `Updated rating assessment template: "${name.trim()}" (${categoryCount} categories, ${questionCount} questions) and resubmitted for approval`,
      'template_updated'
    );

    return NextResponse.json({
      success: true,
      message: 'Assessment updated successfully and sent for approval',
      data: { id, ...updateData }
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update assessment'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    console.log('=== Deleting Rating Assessment ===');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deletedBy = searchParams.get('deletedBy');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Get assessment name before deletion for logging
    const assessment = await assessmentsCollection.findOne({
      _id: new ObjectId(id)
    });

    // Soft delete
    const result = await assessmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Assessment not found'
      }, { status: 404 });
    }

    console.log('Assessment deleted successfully');

    // Log the activity
    if (assessment) {
      const username = deletedBy || 'Unknown User';
      await logActivity(
        username,
        `Deleted rating assessment template: "${assessment.name}"`,
        'template_deleted'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete assessment'
    }, { status: 500 });
  }
}