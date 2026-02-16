// app/forgot-password/page.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, User, AlertCircle, CheckCircle, Loader2, ArrowLeft, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Password reset link has been sent to your email.',
        });
        setFormData({ username: '', email: '' });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send reset link. Please try again.',
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
            <p className="text-cyan-100">Verify your identity to reset password</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {/* Message Display */}
            {message.text && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <p
                    className={`text-sm ${
                      message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Enter your username"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Enter your registered email"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail size={20} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Reset Instructions:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Enter your username and registered email</li>
                    <li>We'll verify and send a reset link to your email</li>
                    <li>The link will expire in 30 minutes</li>
                    <li>Use the link to set a new password</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-cyan-600 hover:text-cyan-700 font-medium text-sm inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          <p>© 2026 Credit Rating System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}