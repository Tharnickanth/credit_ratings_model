// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request) {
  try {


    const body = await request.json();
    const { token, newPassword } = body;



    // Validate input
    if (!token || !newPassword) {
 
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
  
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Connect to MongoDB

    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    const resetTokensCollection = db.collection('PasswordResetTokens');
    const passwordHistoryCollection = db.collection('PasswordHistory');


    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the reset token
    const resetTokenDoc = await resetTokensCollection.findOne({
      token: hashedToken,
      used: false,
    });

    if (!resetTokenDoc) {
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



    // Find the user
    const user = await usersCollection.findOne({ _id: resetTokenDoc.userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }



    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {

      return NextResponse.json(
        { error: 'New password cannot be the same as your current password' },
        { status: 400 }
      );
    }

   

    // Optional: Check against password history (last 3 passwords)
   
    const passwordHistory = await passwordHistoryCollection
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();



    for (const oldPassword of passwordHistory) {
      const isOldPassword = await bcrypt.compare(newPassword, oldPassword.password);
      if (isOldPassword) {
      
        return NextResponse.json(
          { error: 'You cannot reuse one of your last 3 passwords' },
          { status: 400 }
        );
      }
    }



    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  

    // Update user's password
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordLastChanged: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Save old password to history
    await passwordHistoryCollection.insertOne({
      userId: user._id,
      password: user.password, // Save the old password hash
      createdAt: new Date(),
    });

    // Mark token as used
    await resetTokensCollection.updateOne(
      { _id: resetTokenDoc._id },
      {
        $set: {
          used: true,
          usedAt: new Date(),
        },
      }
    );

    // Optional: Delete all other reset tokens for this user
    const deleteResult = await resetTokensCollection.deleteMany({
      userId: user._id,
      _id: { $ne: resetTokenDoc._id },
    });

    return NextResponse.json(
      {
        message: 'Password has been reset successfully. You can now login with your new password.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== Reset Password Error ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password. Please try again.' },
      { status: 500 }
    );
  }
}