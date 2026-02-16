// app/api/customer-assessments/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

/**
 * PUT - Update customer assessment (for editing rejected assessments)
 */
export async function PUT(request, { params }) {
  try {
    console.log('=== Updating Customer Assessment ===');
    
    // Await params to get the id
    const { id } = await params;
    console.log('Assessment ID:', id);

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      console.error('Invalid ObjectId format:', id);
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    const data = await request.json();
    console.log('Update data received');

    const {
      answers,
      totalScore,
      rating,
      categoryScores,
      updatedBy
    } = data;

    // Validation
    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Assessment answers are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const collection = db.collection('customer_assessments');

    // Check if assessment exists and is rejected
    const existingAssessment = await collection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true }
    });

    if (!existingAssessment) {
      console.error('Assessment not found with ID:', id);
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('Found assessment:', existingAssessment.customerName);

    // Only allow editing of rejected assessments
    if (existingAssessment.approvalStatus !== 'rejected') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Only rejected assessments can be edited. This assessment is ' + existingAssessment.approvalStatus 
        },
        { status: 400 }
      );
    }

    // Prepare update data - only update answers, scores, and reset approval status
    const updateData = {
      answers,
      totalScore: Number(totalScore || 0),
      rating: rating || 'N/A',
      categoryScores: categoryScores || [],
      approvalStatus: 'pending', // Reset to pending when resubmitted
      rejectionRemarks: null, // Clear rejection remarks
      updatedAt: new Date(),
      updatedBy: updatedBy || 'system'
    };

    console.log('Updating assessment with new answers and scores');

    // Update the assessment
    const result = await collection.updateOne(
      { _id: new ObjectId(id), isDeleted: { $ne: true } },
      { $set: updateData }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found or already deleted' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Assessment was not modified. No changes detected.' },
        { status: 400 }
      );
    }

    console.log('Assessment updated and resubmitted successfully');

    return NextResponse.json({
      success: true,
      message: 'Assessment updated and resubmitted for approval successfully',
      data: {
        id,
        ...updateData
      }
    });

  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to update assessment',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete customer assessment
 */
export async function DELETE(request, { params }) {
  try {
    console.log('=== Deleting Customer Assessment ===');
    
    // Await params to get the id
    const { id } = await params;
    console.log('Assessment ID:', id);

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      console.error('Invalid ObjectId format:', id);
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const collection = db.collection('customer_assessments');

    // Check if assessment exists
    const existingAssessment = await collection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true }
    });

    if (!existingAssessment) {
      console.error('Assessment not found with ID:', id);
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('Found assessment:', existingAssessment.customerName);

    // Soft delete the assessment
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );

    console.log('Delete result:', result);

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete assessment' },
        { status: 500 }
      );
    }

    console.log('Assessment deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to delete assessment',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}