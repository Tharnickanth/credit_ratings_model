import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// NIC Validation Function
function validateNIC(nic) {
  if (!nic || typeof nic !== 'string') {
    return { valid: false, message: 'NIC is required' };
  }

  const trimmedNic = nic.trim();

  if (!trimmedNic) {
    return { valid: false, message: 'NIC is required' };
  }

  // Check length (must be 10 or 12 characters)
  if (trimmedNic.length !== 10 && trimmedNic.length !== 12) {
    return { 
      valid: false, 
      message: 'NIC must be exactly 10 or 12 characters' 
    };
  }

  // Check for special characters or spaces (only alphanumeric allowed)
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(trimmedNic)) {
    return { 
      valid: false, 
      message: 'NIC must contain only letters and numbers (no spaces or special characters)' 
    };
  }

  return { valid: true, message: 'Valid NIC' };
}

/**
 * POST - Create new customer assessment
 */
export async function POST(request) {
  try {
    const data = await request.json();
    console.log('=== Creating Customer Assessment ===');

    const {
      customerName,
      customerId,
      nic,
      customerType,
      assessmentTemplateId,
      answers,
      totalScore,
      rating,
      categoryScores,
      assessedBy
    } = data;

    // Validation
    if (!customerName?.trim()) {
      return NextResponse.json({ success: false, message: 'Customer name is required' }, { status: 400 });
    }

    if (!customerId?.trim()) {
      return NextResponse.json({ success: false, message: 'Customer ID is required' }, { status: 400 });
    }

    if (!nic?.trim()) {
      return NextResponse.json({ success: false, message: 'NIC is required' }, { status: 400 });
    }

    // Validate NIC format
    const nicValidation = validateNIC(nic);
    if (!nicValidation.valid) {
      return NextResponse.json({ 
        success: false, 
        message: nicValidation.message 
      }, { status: 400 });
    }

    if (!['new', 'existing'].includes(customerType)) {
      return NextResponse.json({ success: false, message: 'Valid customer type is required' }, { status: 400 });
    }

    if (!assessmentTemplateId) {
      return NextResponse.json({ success: false, message: 'Assessment template is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(assessmentTemplateId)) {
      console.error('Invalid template ID format:', assessmentTemplateId);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid template ID format' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    
    // Verify template exists and is approved
    const templatesCollection = db.collection('rating_assessments');
    const templateExists = await templatesCollection.findOne({
      _id: new ObjectId(assessmentTemplateId),
      isDeleted: { $ne: true },
      approvalStatus: 'approved'
    });

    if (!templateExists) {
      console.error('Template not found or not approved:', assessmentTemplateId);
      return NextResponse.json({ 
        success: false, 
        message: 'Assessment template not found or not approved. Please select a valid approved template.' 
      }, { status: 400 });
    }

    console.log('Template verified:', templateExists.name);

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ success: false, message: 'Assessment answers are required' }, { status: 400 });
    }

    const collection = db.collection('customer_assessments');

    const assessment = {
      customerName: customerName.trim(),
      customerId: customerId.trim(),
      nic: nic.trim(),
      customerType,
      assessmentTemplateId,
      assessmentTemplateName: templateExists.name, // Store template name for reference
      answers,
      totalScore: Number(totalScore || 0),
      rating: rating || 'N/A',
      categoryScores: categoryScores || [],
      assessedBy: assessedBy || null,
      approvalStatus: 'pending',
      assessmentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    console.log('Saving assessment for customer:', customerName);

    const result = await collection.insertOne(assessment);

    console.log('Assessment saved successfully with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Customer assessment created successfully',
      data: { id: result.insertedId.toString(), ...assessment }
    });

  } catch (error) {
    console.error('Error creating assessment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create assessment' },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch assessments
 * ?id=assessmentId
 * ?customerId=customerId
 * ?status=pending|approved|rejected
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    console.log('=== Fetching Customer Assessments ===');
    console.log('Query params:', { id, customerId, status });

    const client = await clientPromise;
    const db = client.db('crm_db');
    const collection = db.collection('customer_assessments');

    // Get by ID
    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, message: 'Invalid assessment ID format' }, { status: 400 });
      }

      const assessment = await collection.findOne({
        _id: new ObjectId(id),
        isDeleted: { $ne: true }
      });

      if (!assessment) {
        return NextResponse.json({ success: false, message: 'Assessment not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        assessment: { id: assessment._id.toString(), ...assessment }
      });
    }

    // Build filter
    let filter = { isDeleted: { $ne: true } };
    
    if (customerId) {
      filter.customerId = customerId;
    }
    
    if (status) {
      filter.approvalStatus = status;
    }

    // Get all matching assessments
    const assessments = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${assessments.length} customer assessments`);

    return NextResponse.json({
      success: true,
      assessments: assessments.map(a => ({ id: a._id.toString(), ...a }))
    });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}