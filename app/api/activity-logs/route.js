// app/api/activity-logs/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    const data = await request.json();
    const { username, description, action } = data;

    if (!username || !description) {
      return NextResponse.json({
        success: false,
        message: 'Username and description are required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const logsCollection = db.collection('UserActivityLog');

    const logEntry = {
      username,
      description,
      action: action || 'general',
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

    const result = await logsCollection.insertOne(logEntry);

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully',
      logId: result.insertedId.toString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to log activity'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const action = searchParams.get('action');

    const client = await clientPromise;
    const db = client.db('crm_db');
    const logsCollection = db.collection('UserActivityLog');

    let query = {};
    
    if (username) {
      query.username = username;
    }
    
    if (action) {
      query.action = action;
    }

    const logs = await logsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log._id.toString(),
        username: log.username,
        description: log.description,
        action: log.action,
        date: log.date,
        time: log.time,
        timestamp: log.timestamp
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch activity logs',
      logs: []
    }, { status: 500 });
  }
}