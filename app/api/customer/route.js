// app/api/customer/route.js
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

  // Validate based on length
  if (trimmedNic.length === 10) {
    // 10 characters: first 9 must be digits, 10th must be X or V
    const first9Digits = /^[0-9]{9}$/;
    const last1Letter = /^[xXvV]$/;
    
    if (!first9Digits.test(trimmedNic.substring(0, 9))) {
      return { 
        valid: false, 
        message: 'For 10-character NIC: first 9 characters must be numbers' 
      };
    }
    
    if (!last1Letter.test(trimmedNic.charAt(9))) {
      return { 
        valid: false, 
        message: 'For 10-character NIC: last character must be X or V' 
      };
    }
  } else if (trimmedNic.length === 12) {
    // 12 characters: all must be digits
    const allDigits = /^[0-9]{12}$/;
    
    if (!allDigits.test(trimmedNic)) {
      return { 
        valid: false, 
        message: 'For 12-character NIC: all characters must be numbers' 
      };
    }
  }

  return { valid: true, message: 'Valid NIC' };
}

/**
 * GET - Fetch all assessments for a specific customer
 * ?customerId=xxx (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');



    // Validation
    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Customer ID is required' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('customer_assessments');
    const customersCollection = db.collection('customers');

    // Get customer details first
    const customer = await customersCollection.findOne({
      customerId: customerId,
      isDeleted: { $ne: true }
    });

    if (!customer) {
      return NextResponse.json({ 
        success: false, 
        message: 'Customer not found' 
      }, { status: 404 });
    }

    // Fetch all assessments for this customer
    const assessments = await assessmentsCollection
      .find({
        customerId: customerId,
        isDeleted: { $ne: true }
      })
      .sort({ assessmentDate: -1 }) // Most recent first
      .toArray();


    // Enrich assessments with question and answer text from templates
    const templatesCollection = db.collection('rating_assessments');
    const enrichedAssessments = await Promise.all(
      assessments.map(async (assessment) => {
        // Fetch the rating template - handle both ObjectId and string formats
        let templateQuery;
        try {
          // Try to convert to ObjectId if it's a string
          if (typeof assessment.assessmentTemplateId === 'string') {
            templateQuery = { _id: new ObjectId(assessment.assessmentTemplateId) };
          } else {
            templateQuery = { _id: assessment.assessmentTemplateId };
          }
        } catch (e) {
          // If conversion fails, use as string
          templateQuery = { _id: assessment.assessmentTemplateId };
        }

        const template = await templatesCollection.findOne({
          ...templateQuery,
          isDeleted: { $ne: true }
        });


        // Enrich answers with question and answer text
        let enrichedAnswers = [];
        if (assessment.answers && assessment.answers.length > 0 && template) {
          enrichedAnswers = assessment.answers.map(answer => {
            // Find the question in the template
            let questionText = '';
            let answerText = '';
            let category = '';
            let weight = 0;

            // Search through all categories in the template
            if (template.categories) {
              for (const cat of template.categories) {
                // Find the question by questionId
                const question = cat.questions?.find(q => q.questionId === answer.questionId);
                
                if (question) {
                  questionText = question.text || '';
                  category = cat.categoryName || '';
                  
                  // **FIX: Normalize customerType by removing trailing characters and converting to lowercase**
                  const normalizedCustomerType = (answer.customerType || '').toLowerCase().replace(/[\/\s,;]+/g, '').trim();
                  
                  // Get weight based on customer type
                  if (normalizedCustomerType === 'new') {
                    weight = question.proposedWeight?.new || 0;
                  } else if (normalizedCustomerType === 'existing') {
                    weight = question.proposedWeight?.existing || 0;
                  } else {
                    // Fallback: try to use 'new' as default if proposedWeight exists
                    weight = question.proposedWeight?.new || question.proposedWeight?.existing || 0;
                  }

                

                  // Find the answer text by answerId
                  const selectedAnswer = question.answers?.find(a => a.answerId === answer.answerId);
                  if (selectedAnswer) {
                    answerText = selectedAnswer.text || '';
                    
                    // Get score based on customer type if not already in answer
                    if (!answer.score && selectedAnswer.score) {
                      if (normalizedCustomerType === 'new') {
                        answer.score = selectedAnswer.score.new || 0;
                      } else if (normalizedCustomerType === 'existing') {
                        answer.score = selectedAnswer.score.existing || 0;
                      } else {
                        // Fallback
                        answer.score = selectedAnswer.score.new || selectedAnswer.score.existing || 0;
                      }
                    }
                  }
                  break;
                }
              }
            }

            // Calculate weighted score
            const calculatedWeightedScore = (answer.score || 0) * weight / 100;

            return {
              questionId: answer.questionId,
              answerId: answer.answerId,
              questionText,
              answerText,
              score: answer.score || 0,
              weight,
              weightedScore: answer.weightedScore || calculatedWeightedScore,
              category,
              customerType: answer.customerType
            };
          });
        }

        return {
          id: assessment._id.toString(),
          assessmentTemplateId: assessment.assessmentTemplateId,
          assessmentTemplateName: assessment.assessmentTemplateName,
          totalScore: assessment.totalScore,
          rating: assessment.rating,
          categoryScores: assessment.categoryScores || [],
          assessedBy: assessment.assessedBy,
          approvalStatus: assessment.approvalStatus,
          assessmentDate: assessment.assessmentDate,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          approvedAt: assessment.approvedAt || null,
          approvedBy: assessment.approvedBy || null,
          rejectedAt: assessment.rejectedAt || null,
          rejectedBy: assessment.rejectedBy || null,
          rejectionRemarks: assessment.rejectionRemarks || null,
          answers: enrichedAnswers
        };
      })
    );

    // Calculate summary statistics
    const approvedCount = assessments.filter(a => a.approvalStatus === 'approved').length;
    const pendingCount = assessments.filter(a => a.approvalStatus === 'pending').length;
    const rejectedCount = assessments.filter(a => a.approvalStatus === 'rejected').length;

    // Get latest rating
    const latestApprovedAssessment = assessments.find(a => a.approvalStatus === 'approved');
    const latestRating = latestApprovedAssessment?.rating || 'N/A';

    return NextResponse.json({
      success: true,
      customer: {
        id: customer._id.toString(),
        customerName: customer.customerName,
        customerId: customer.customerId,
        nic: customer.nic,
        contactNumber: customer.contactNumber || '',
        email: customer.email || '',
        address: customer.address || '',
        createdAt: customer.createdAt
      },
      assessments: enrichedAssessments,
      summary: {
        totalAssessments: assessments.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        latestRating
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customer assessments:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to fetch customer assessments' 
      },
      { status: 500 }
    );
  }
}
/**
 * POST - Create a new customer
 * Body: { customerName, customerId, nic, contactNumber?, email?, address? }
 */
export async function POST(request) {
  try {
    const data = await request.json();
 

    const { customerName, customerId, nic, contactNumber, email, address } = data;

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

    const client = await clientPromise;
    const db = client.db('crm_db');
    const customersCollection = db.collection('customers');

    // Duplicate check – same customerId or nic already exists
    const existing = await customersCollection.findOne({
      isDeleted: { $ne: true },
      $or: [
        { customerId: customerId.trim() },
        { nic: nic.trim() }
      ]
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Customer with this ID or NIC already exists' },
        { status: 409 }
      );
    }

    // Insert
    const now = new Date();
    const customer = {
      customerName  : customerName.trim(),
      customerId    : customerId.trim(),
      nic           : nic.trim(),
      contactNumber : contactNumber?.trim() || '',
      email         : email?.trim()         || '',
      address       : address?.trim()       || '',
      isDeleted     : false,
      createdAt     : now,
      updatedAt     : now
    };

    const result = await customersCollection.insertOne(customer);

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: { id: result.insertedId.toString(), ...customer }
    });

  } catch (error) {
    console.error('❌ Error creating customer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}