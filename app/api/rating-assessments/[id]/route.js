// app/api/rating-assessments/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET single rating assessment by ID
export async function GET(request, { params }) {
  try {
    console.log('=== API GET Request Started - Fetch Single Rating Assessment ===');
    
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    const assessment = await assessmentsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('Assessment found:', assessment.assessmentName);
    return NextResponse.json({ assessment }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Rating Assessment ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Update rating assessment by ID
export async function PUT(request, { params }) {
  try {
    console.log('=== API PUT Request Started - Update Rating Assessment ===');
    
    const { id } = params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const { assessmentName, description, status, questions } = body;

    // Validate required fields
    if (!assessmentName || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Assessment name and at least one question are required' },
        { status: 400 }
      );
    }

    // Validate that total weight equals 100%
    const totalWeight = questions.reduce((sum, q) => sum + parseFloat(q.proposedWeight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Total weight must equal 100% (currently ${totalWeight.toFixed(2)}%)` },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Check if assessment exists
    const existingAssessment = await assessmentsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingAssessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check if another assessment with the same name exists (excluding current one)
    const duplicateAssessment = await assessmentsCollection.findOne({
      assessmentName: assessmentName,
      _id: { $ne: new ObjectId(id) }
    });

    if (duplicateAssessment) {
      return NextResponse.json(
        { error: 'Another assessment with this name already exists' },
        { status: 409 }
      );
    }

    // Prepare questions data
    const preparedQuestions = questions.map((question, qIndex) => ({
      questionNumber: qIndex + 1,
      questionText: question.questionText,
      proposedWeight: parseFloat(question.proposedWeight),
      answers: question.answers.map((answer, aIndex) => ({
        answerNumber: aIndex + 1,
        answerText: answer.answerText,
        score: parseFloat(answer.score)
      }))
    }));

    // Update assessment
    const updateData = {
      assessmentName,
      description: description || '',
      status: status || 'active',
      questions: preparedQuestions,
      totalWeight: 100,
      totalQuestions: preparedQuestions.length,
      updatedAt: new Date()
    };

    const result = await assessmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('Rating assessment updated successfully');
    return NextResponse.json(
      { 
        message: 'Rating assessment updated successfully',
        assessment: { id, ...updateData }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Updating Rating Assessment ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE rating assessment by ID
export async function DELETE(request, { params }) {
  try {
    console.log('=== API DELETE Request Started - Delete Rating Assessment ===');
    
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    const result = await assessmentsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('Rating assessment deleted successfully');
    return NextResponse.json(
      { message: 'Rating assessment deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Deleting Rating Assessment ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}