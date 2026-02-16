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

/**
 * PATCH - Update assessment visibility (isDeleted field)
 */
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { id, isDeleted, username } = data;

    console.log('=== Updating Assessment Visibility ===');
    console.log('Assessment ID:', id);
    console.log('New isDeleted value:', isDeleted);

    // Validation
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assessment ID is required' 
      }, { status: 400 });
    }

    if (typeof isDeleted !== 'boolean') {
      return NextResponse.json({ 
        success: false, 
        message: 'isDeleted must be a boolean value' 
      }, { status: 400 });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid assessment ID format' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const collection = db.collection('customer_assessments');

    // Check if assessment exists
    const existingAssessment = await collection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingAssessment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assessment not found' 
      }, { status: 404 });
    }

    // Prevent redundant operations
    if (existingAssessment.isDeleted === isDeleted) {
      return NextResponse.json({ 
        success: false, 
        message: `Assessment is already ${isDeleted ? 'hidden' : 'visible'}` 
      }, { status: 400 });
    }

    // Update the isDeleted field
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isDeleted: isDeleted,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No changes made to the assessment' 
      }, { status: 400 });
    }

    console.log('Assessment visibility updated successfully');
    console.log('Assessment data for logging:', JSON.stringify(existingAssessment, null, 2));

    // Log the activity
    const logUsername = username || 'Unknown User';
    const customerName = existingAssessment.customerName || existingAssessment.customerId || 'Unknown Customer';
    const customerId = existingAssessment.customerId || '';
    
    // Try different possible field names for template
    const templateName = existingAssessment.templateName 
      || existingAssessment.template_name
      || existingAssessment.assessmentTemplateName
      || existingAssessment.ratingTemplateName
      || (existingAssessment.template && existingAssessment.template.name)
      || (existingAssessment.assessmentTemplate && existingAssessment.assessmentTemplate.name)
      || null;
    
    const actionText = isDeleted ? 'hidden' : 'made visible';
    const actionType = isDeleted ? 'Customer Assessment Hidden' : 'Customer Assessment Made Visible';
    
    // Create description based on available data
    let description;
    if (templateName) {
      description = `${isDeleted ? 'Hidden' : 'Made visible'} customer assessment: "${customerName}" (${customerId}) using template "${templateName}"`;
    } else {
      description = `${isDeleted ? 'Hidden' : 'Made visible'} customer assessment for customer: "${customerName}" (${customerId})`;
    }
    
    await logActivity(
      logUsername,
      description,
      actionType
    );

    return NextResponse.json({
      success: true,
      message: `Assessment ${isDeleted ? 'hidden' : 'made visible'} successfully`,
      data: {
        id: id,
        isDeleted: isDeleted
      }
    });

  } catch (error) {
    console.error('Error updating assessment visibility:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to update assessment visibility' 
      },
      { status: 500 }
    );
  }
}