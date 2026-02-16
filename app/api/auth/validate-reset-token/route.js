// app/api/auth/validate-reset-token/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import crypto from 'crypto';

export async function POST(request) {
  try {


    const body = await request.json();
    const { token } = body;



    // Validate input
    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const resetTokensCollection = db.collection('PasswordResetTokens');

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the reset token
    const resetTokenDoc = await resetTokensCollection.findOne({
      token: hashedToken,
      used: false,
    });

    if (!resetTokenDoc) {
      
      // Check if token exists but is used
      const usedToken = await resetTokensCollection.findOne({
        token: hashedToken,
        used: true,
      });
      
      if (usedToken) {
        return NextResponse.json(
          { error: 'This reset link has already been used. Please request a new password reset.' },
          { status: 401 }
        );
      }
      
      // Check if any token exists for debugging
      const anyToken = await resetTokensCollection.findOne({ token: hashedToken });
      
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    // Check if token has expired
    if (new Date() > new Date(resetTokenDoc.expiresAt)) {
      // Delete expired token
      await resetTokensCollection.deleteOne({ _id: resetTokenDoc._id });
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset link.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: 'Token is valid',
        valid: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== Validate Reset Token Error ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'An error occurred while validating the token. Please try again.' },
      { status: 500 }
    );
  }
}