'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft, Shield } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: '',
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setMessage({
          type: 'error',
          text: 'Invalid or missing reset token.',
        });
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setIsValidToken(true);
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Invalid or expired reset token.',
          });
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setMessage({
          type: 'error',
          text: 'Failed to validate reset token. Please try again.',
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.newPassword;
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengths = [
      { score: 1, label: 'Very Weak', color: 'bg-red-500' },
      { score: 2, label: 'Weak', color: 'bg-orange-500' },
      { score: 3, label: 'Fair', color: 'bg-yellow-500' },
      { score: 4, label: 'Good', color: 'bg-blue-500' },
      { score: 5, label: 'Strong', color: 'bg-green-500' },
    ];

    const strength = strengths.find((s) => s.score === score) || strengths[0];
    setPasswordStrength(strength);
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (formData.newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Password reset successful! Redirecting to login...',
        });
        setFormData({ newPassword: '', confirmPassword: '' });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to reset password. Please try again.',
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full mx-4">
          <Loader2 className="animate-spin h-16 w-16 text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Validating reset token...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">{message.text}</p>
              <Link
                href="/forgot-password"
                className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all"
              >
                Request New Reset Link
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-white text-sm">
            <p>© 2026 Credit Rating System. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
            <p className="text-cyan-100">Enter your new password</p>
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
              {/* New Password */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password Strength:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Password must contain:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span
                      className={`mr-2 ${
                        formData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {formData.newPassword.length >= 8 ? '✓' : '○'}
                    </span>
                    At least 8 characters
                  </li>
                  <li className="flex items-center">
                    <span
                      className={`mr-2 ${
                        /[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}
                    </span>
                    One uppercase letter
                  </li>
                  <li className="flex items-center">
                    <span
                      className={`mr-2 ${
                        /[a-z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {/[a-z]/.test(formData.newPassword) ? '✓' : '○'}
                    </span>
                    One lowercase letter
                  </li>
                  <li className="flex items-center">
                    <span
                      className={`mr-2 ${
                        /\d/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {/\d/.test(formData.newPassword) ? '✓' : '○'}
                    </span>
                    One number
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || formData.newPassword !== formData.confirmPassword}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    Reset Password
                  </>
                )}
              </button>
            </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full mx-4">
          <Loader2 className="animate-spin h-16 w-16 text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}