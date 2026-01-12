// app/api/rating-assessments/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request) {
  try {
    console.log('=== API POST Request Started - Create Rating Assessment ===');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    const { assessmentName, description, status, questions } = body;

    // Validate required fields
    if (!assessmentName || !questions || questions.length === 0) {
      console.log('Validation failed: Missing required fields');
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

    // Validate each question
    for (const question of questions) {
      if (!question.questionText || !question.proposedWeight) {
        return NextResponse.json(
          { error: 'Each question must have text and weight' },
          { status: 400 }
        );
      }

      if (!question.answers || question.answers.length < 2) {
        return NextResponse.json(
          { error: 'Each question must have at least 2 answers' },
          { status: 400 }
        );
      }

      // Validate each answer
      for (const answer of question.answers) {
        if (!answer.answerText || (answer.score === null || answer.score === undefined)) {
          return NextResponse.json(
            { error: 'Each answer must have text and score' },
            { status: 400 }
          );
        }
      }
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');
    console.log('Connected to MongoDB successfully');

    // Check if assessment with same name already exists
    console.log('Checking for existing assessment...');
    const existingAssessment = await assessmentsCollection.findOne({
      assessmentName: assessmentName
    });

    if (existingAssessment) {
      console.log('Assessment with this name already exists');
      return NextResponse.json(
        { error: 'Assessment with this name already exists' },
        { status: 409 }
      );
    }

    // Prepare questions data - clean up temporary IDs
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

    // Create assessment object
    const newAssessment = {
      assessmentName,
      description: description || '',
      status: status || 'active',
      questions: preparedQuestions,
      totalWeight: 100,
      totalQuestions: preparedQuestions.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert assessment into database
    console.log('Inserting rating assessment into database...');
    const result = await assessmentsCollection.insertOne(newAssessment);
    console.log('Rating assessment inserted successfully. ID:', result.insertedId);

    // Return success response
    const assessmentResponse = {
      id: result.insertedId,
      assessmentName,
      description: description || '',
      status,
      totalQuestions: preparedQuestions.length,
      totalWeight: 100,
      createdAt: newAssessment.createdAt
    };

    console.log('=== Rating Assessment Created Successfully ===');
    return NextResponse.json(
      { 
        message: 'Rating assessment created successfully', 
        assessment: assessmentResponse 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('=== Error Creating Rating Assessment ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all rating assessments
export async function GET(request) {
  try {
    console.log('=== API GET Request Started - Fetch Rating Assessments ===');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    // Fetch all rating assessments
    const assessments = await assessmentsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${assessments.length} rating assessments`);
    return NextResponse.json({ assessments }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Rating Assessments ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}