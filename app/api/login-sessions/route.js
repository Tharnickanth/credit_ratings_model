// app/api/login-sessions/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const status = searchParams.get('status');

    const client = await clientPromise;
    const db = client.db('crm_db');
    const loginSessionsCollection = db.collection('LoginSessions');

    // Build query based on parameters
    const query = {};
    
    // If username is provided, filter by username (for user-specific view)
    if (username) {
      query.username = username;
    }
    
    // If status is provided, filter by status
    if (status) {
      query.status = status;
    }

    // Fetch login sessions with the query
    const sessions = await loginSessionsCollection
      .find(query)
      .sort({ loginAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    // Format the sessions to include all relevant fields
    const formattedSessions = sessions.map(session => ({
      _id: session._id.toString(),
      sessionId: session.sessionId,
      userId: session.userId?.toString(),
      username: session.username,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      pin: session.pin,
      verified: session.verified || false,
      status: session.status || 'pending',
      ip: session.ip,
      userAgent: session.userAgent,
      loginAt: session.loginAt || session.verifiedAt || session.createdAt,
      createdAt: session.createdAt,
      verifiedAt: session.verifiedAt,
      expiresAt: session.expiresAt
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length
    });

  } catch (error) {
    console.error('Error fetching login sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch login sessions',
        message: error.message,
        sessions: []
      },
      { status: 500 }
    );
  }
}