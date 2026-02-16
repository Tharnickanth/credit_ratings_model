// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Send password reset email
async function sendResetEmail(email, resetToken, firstName) {
  try {

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Create reset link - ensure no trailing slashes
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    


    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Credit Rating System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .content { 
              background: #f9fafb; 
              padding: 30px; 
              border-radius: 0 0 10px 10px; 
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .reset-button { 
              display: inline-block;
              background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); 
              color: white; 
              padding: 15px 40px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .reset-button:hover {
              opacity: 0.9;
            }
            .warning { 
              background: #fef3c7; 
              border-left: 4px solid #f59e0b; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px; 
            }
            .info-box {
              background: #e0f2fe;
              border-left: 4px solid #06b6d4;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer { 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px; 
              margin-top: 20px; 
            }
            .alternative-link {
              word-break: break-all;
              background: #f3f4f6;
              padding: 10px;
              border-radius: 4px;
              font-size: 12px;
              color: #4b5563;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>Credit Rating System</p>
            </div>
            <div class="content">
              <h2>Hello ${firstName || 'User'},</h2>
              <p>We received a request to reset your password for the Credit Rating System account associated with this email address.</p>
              
              <p>To reset your password, please click the button below:</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="reset-button">Reset My Password</a>
              </div>
              
              <div class="info-box">
                <strong>ℹ️ Important Information:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This link will expire in 30 minutes</li>
                  <li>You can only use this link once</li>
                  <li>If the button doesn't work, copy and paste the link below into your browser</li>
                </ul>
              </div>

              <div class="alternative-link">
                <strong>Alternative Link:</strong><br>
                ${resetLink}
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Your password will remain unchanged</li>
                  <li>Never share this reset link with anyone</li>
                  <li>If you're concerned about your account security, contact your administrator immediately</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; margin-top: 20px;">
                If you have any questions or need assistance, please contact your system administrator.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Credit Rating System. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error('❌ Error sending reset email:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

export async function POST(request) {
  try {


    const body = await request.json();
    const { username, email } = body;



    // Validate input
    if (!username || !email) {

      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    const resetTokensCollection = db.collection('PasswordResetTokens');



    // Find user by username
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or email. Please verify your credentials.' },
        { status: 401 }
      );
    }

    // Check if the provided email matches the user's registered email
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid username or email. Please verify your credentials.' },
        { status: 401 }
      );
    }


    // Check if user account is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact administrator.' },
        { status: 403 }
      );
    }


    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes



    // Delete any existing reset tokens for this user
    const deleteResult = await resetTokensCollection.deleteMany({ userId: user._id });


    // Save new reset token

    const insertResult = await resetTokensCollection.insertOne({
      userId: user._id,
      username: user.username,
      email: user.email,
      token: hashedToken, // Store the hashed version
      used: false,
      expiresAt: expiresAt,
      createdAt: new Date(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });



    // Send reset email (with plain token, not hashed)
    const emailSent = await sendResetEmail(user.email, resetToken, user.firstName);

    if (!emailSent) {
      console.error('❌ Failed to send reset email');
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }


    return NextResponse.json(
      {
        message: 'Password reset link has been sent to your registered email. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== Forgot Password Error ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again later.' },
      { status: 500 }
    );
  }
}