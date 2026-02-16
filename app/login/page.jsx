'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: credentials, 2: PIN
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    pin: ''
  });
  const [sessionData, setSessionData] = useState({
    sessionId: '',
    maskedEmail: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Handle client-side mounting and load remembered credentials
  useEffect(() => {
    setIsMounted(true);
    
    // Load remembered credentials from localStorage
    if (typeof window !== 'undefined') {
      const savedUsername = localStorage.getItem('rememberedUsername');
      const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (savedUsername && savedRememberMe) {
        setFormData(prev => ({
          ...prev,
          username: savedUsername
        }));
        setRememberMe(true);
      }
    }
  }, []);

  // Countdown timer for PIN expiry
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setError('PIN has expired. Please login again.');
            setStep(1);
            setFormData({ username: formData.username, password: '', pin: '' });
            return 300;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, countdown, formData.username]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow numbers for PIN and limit to 6 digits
    if (name === 'pin') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      if (data.requiresPIN) {
        // Save username to localStorage if Remember Me is checked
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem('rememberedUsername', formData.username);
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberedUsername');
            localStorage.removeItem('rememberMe');
          }
        }

        setSessionData({
          sessionId: data.sessionId,
          maskedEmail: data.email
        });
        setSuccess('PIN sent to your email successfully!');
        setStep(2);
        setCountdown(300); // Reset countdown
      }

    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePINSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pin || formData.pin.length !== 6) {
      setError('Please enter a valid 6-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: formData.pin,
          sessionId: sessionData.sessionId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid PIN. Please try again.');
        return;
      }

      // Save user data to localStorage
      if (isMounted && typeof window !== 'undefined' && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (err) {
      console.error('PIN verification error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep(1);
    // Keep username if remembered, otherwise clear
    const savedUsername = rememberMe ? formData.username : '';
    setFormData({ username: savedUsername, password: '', pin: '' });
    setSessionData({ sessionId: '', maskedEmail: '' });
    setError('');
    setSuccess('');
    setCountdown(300);
  };

  const handleResendPIN = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend PIN.');
        return;
      }

      if (data.requiresPIN) {
        setSessionData({
          sessionId: data.sessionId,
          maskedEmail: data.email
        });
        setSuccess('New PIN sent to your email!');
        setFormData(prev => ({ ...prev, pin: '' }));
        setCountdown(300); // Reset countdown
      }

    } catch (err) {
      console.error('Resend PIN error:', err);
      setError('Failed to resend PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mb-4">
              {step === 1 ? <Lock className="text-white" size={32} /> : <KeyRound className="text-white" size={32} />}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {step === 1 ? 'Welcome Back' : 'Verify PIN'}
            </h1>
            <p className="text-gray-600">
              {step === 1 ? 'Sign in to Credit Ratings Model' : 'Enter the PIN sent to your email'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Step 1: Credentials Form */}
          {step === 1 && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                    className="w-4 h-4 text-cyan-500 bg-gray-100 border-gray-300 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <KeyRound size={20} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: PIN Verification Form */}
          {step === 2 && (
            <div>
              {/* Email Info */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm text-blue-900 font-medium mb-1">PIN sent to:</p>
                    <p className="text-sm text-blue-700">{sessionData.maskedEmail}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      ⏱️ PIN expires in: <span className="font-bold">{formatTime(countdown)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePINSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-Digit PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      disabled={isLoading}
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-center text-2xl font-bold tracking-widest"
                      placeholder="000000"
                      autoComplete="off"
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Enter the 6-digit PIN sent to your registered email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || formData.pin.length !== 6}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Login'
                  )}
                </button>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendPIN}
                    disabled={isLoading}
                    className="flex-1 bg-white border-2 border-cyan-500 text-cyan-600 py-3 rounded-lg font-semibold hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend PIN
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-white text-sm">
          <p>© 2026 Credit Ratings Model. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;