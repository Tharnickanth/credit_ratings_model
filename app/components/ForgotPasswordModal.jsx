'use client';
import React, { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setStatus(null);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Failed to send reset email. Please try again.');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Password reset instructions have been sent to your email.');
      setEmail('');
      
      // Auto close after 3 seconds on success
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err) {
      console.error('Forgot password error:', err);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setStatus(null);
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mb-4">
            <Mail className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
          <p className="text-gray-600 text-sm">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {status && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-start gap-3 ${
            status === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {status === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm">{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Instructions'
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full text-gray-600 hover:text-gray-800 py-2 font-medium transition-colors disabled:opacity-50"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;