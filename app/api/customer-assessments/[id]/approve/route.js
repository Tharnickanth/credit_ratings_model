// app/api/customer-assessments/[id]/approve/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  try {

    
    // Await params to get the id
    const { id } = await params;

    
    const body = await request.json();
    const { status, remarks, approvedBy, rejectedBy } = body;
  

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Validate remarks for rejection
    if (status === 'rejected' && !remarks?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Remarks are required when rejecting an assessment' },
        { status: 400 }
      );
    }

    // Validate approver/rejecter
    const actionBy = status === 'approved' ? approvedBy : rejectedBy;
    if (!actionBy) {
      return NextResponse.json(
        { success: false, message: `${status === 'approved' ? 'Approver' : 'Rejecter'} information is required` },
        { status: 400 }
      );
    }

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
    const logsCollection = db.collection('UserActivityLog');

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



    // Prepare update data
    const updateData = {
      approvalStatus: status,
      updatedAt: new Date()
    };

    // Add approval/rejection specific fields
    if (status === 'approved') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
      // Clear any previous rejection remarks when approving
      updateData.rejectionRemarks = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    } else if (status === 'rejected') {
      updateData.rejectedBy = rejectedBy;
      updateData.rejectedAt = new Date();
      updateData.rejectionRemarks = remarks.trim();
      // Clear any previous approval data when rejecting
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    

    // Update the assessment
    const result = await collection.updateOne(
      { _id: new ObjectId(id), isDeleted: { $ne: true } },
      { $set: updateData }
    );

   

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found or already deleted' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Assessment was not modified. It may already have this status.' },
        { status: 400 }
      );
    }

    // Log the activity
    const actionText = status === 'approved' ? 'Approved' : 'Rejected';
    const logDescription = `${actionText} customer assessment for "${existingAssessment.customerName}"${remarks ? ` with remarks: "${remarks}"` : ''}`;
    
    const logEntry = {
      username: actionBy,
      description: logDescription,
      action: status === 'approved' ? 'customer_assessment_approved' : 'customer_assessment_rejected',
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
        assessmentId: id,
        customerName: existingAssessment.customerName,
        customerType: existingAssessment.customerType,
        finalScore: existingAssessment.finalScore,
        action: status,
        remarks: remarks || null
      }
    };

    await logsCollection.insertOne(logEntry);



    return NextResponse.json({
      success: true,
      message: `Assessment ${status} successfully`,
      data: {
        id,
        status,
        updatedAt: updateData.updatedAt,
        ...(status === 'approved' 
          ? { approvedBy, approvedAt: updateData.approvedAt }
          : { rejectedBy, rejectedAt: updateData.rejectedAt }
        )
      }
    });

  } catch (error) {
    console.error('Error updating assessment approval status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to update assessment approval status',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}