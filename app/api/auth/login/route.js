// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

// Generate 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send PIN via email
async function sendPINEmail(email, pin, firstName) {
  try {
    // Configure your email service
    // For Gmail, you need to enable "Less secure app access" or use App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or 'smtp.gmail.com'
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD // Your email password or app password
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login PIN - Credit Rating System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .pin-box { background: white; border: 2px solid #06b6d4; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .pin { font-size: 36px; font-weight: bold; color: #06b6d4; letter-spacing: 8px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Login Verification</h1>
              <p>Credit Rating System</p>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>You have requested to log in to the Credit Rating System. Please use the following PIN to complete your login:</p>
              
              <div class="pin-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Login PIN</p>
                <div class="pin">${pin}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This PIN is valid for 5 minutes only</li>
                  <li>Never share this PIN with anyone</li>
                  <li>If you didn't request this login, please contact your administrator immediately</li>
                </ul>
              </div>
              
              <p style="color: #6b7280;">If you have any questions, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>© 2026 Credit Rating System. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error('Error sending PIN email:', error);
    return false;
  }
}

export async function POST(request) {
  try {

    
    const body = await request.json();
    const { username, password, pin, sessionId } = body;

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    const loginSessionsCollection = db.collection('LoginSessions');

    // STEP 1: Username & Password Verification
    if (!pin && !sessionId) {
      // Validate input
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }



      // Find user by username
      const user = await usersCollection.findOne({ username });

      if (!user) {

        return NextResponse.json(
          { error: 'Invalid username or password' },
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

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {

        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Generate PIN
      const generatedPIN = generatePIN();
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save login session
      await loginSessionsCollection.insertOne({
        sessionId: newSessionId,
        userId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        pin: generatedPIN,
        verified: false,
        expiresAt: expiresAt,
        createdAt: new Date(),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'pending'
      });

      // Send PIN to email
      const emailSent = await sendPINEmail(user.email, generatedPIN, user.firstName);

      if (!emailSent) {
        return NextResponse.json(
          { error: 'Failed to send PIN email. Please try again.' },
          { status: 500 }
        );
      }

    

      return NextResponse.json(
        { 
          message: 'PIN sent to your registered email',
          requiresPIN: true,
          sessionId: newSessionId,
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masked email
        },
        { status: 200 }
      );
    }

    // STEP 2: PIN Verification
    if (pin && sessionId) {


      // Find login session
      const session = await loginSessionsCollection.findOne({ 
        sessionId,
        verified: false 
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Invalid or expired session. Please login again.' },
          { status: 401 }
        );
      }

      // Check if session expired
      if (new Date() > session.expiresAt) {
        await loginSessionsCollection.deleteOne({ sessionId });
        return NextResponse.json(
          { error: 'PIN has expired. Please login again.' },
          { status: 401 }
        );
      }

      // Verify PIN
      if (pin !== session.pin) {

        return NextResponse.json(
          { error: 'Invalid PIN. Please try again.' },
          { status: 401 }
        );
      }

      // Get user details
      const user = await usersCollection.findOne({ _id: session.userId });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Mark session as verified and update status to success
      await loginSessionsCollection.updateOne(
        { sessionId },
        { 
          $set: { 
            verified: true,
            verifiedAt: new Date(),
            status: 'success',
            loginAt: new Date()
          } 
        }
      );

      // Prepare user response (exclude password)
      const userResponse = {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        status: user.status
      };



      return NextResponse.json(
        { 
          message: 'Login successful',
          user: userResponse
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('=== Login Error ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}