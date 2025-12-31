"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  LogOut, 
  ShieldAlert, 
  Loader2, 
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  Timer
} from 'lucide-react';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', isLoading = false, fullWidth = false }) => {
  const baseStyle = "flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/30",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-gray-200",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg shadow-red-500/30",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
    link: "bg-transparent text-indigo-600 hover:text-indigo-800 p-0 h-auto font-normal hover:underline justify-start"
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

const InputField = ({ label, type, placeholder, icon: Icon, value, onChange, error, maxLength }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`block w-full pl-10 pr-10 py-3 border ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 sm:text-sm`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};

const Card = ({ title, subtitle, children, icon: Icon, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-100 text-indigo-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-16 h-16 ${colors[color]} rounded-2xl flex items-center justify-center mb-4 shadow-sm transform rotate-3 hover:rotate-6 transition-transform`}>
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-gray-500 mt-2 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  // Views: login, 2fa-verification, forgot-password, reset-password, email-verification, dashboard, access-denied, session-expired
  const [currentView, setCurrentView] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  // Timer State (5 minutes = 300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  
  // Simulation States
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  // --- Effects ---

  // Handle 5-minute timeout countdown
  useEffect(() => {
    let interval = null;
    if (currentView === '2fa-verification' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (currentView === '2fa-verification' && timeLeft === 0) {
      handleSessionTimeout();
    }
    return () => clearInterval(interval);
  }, [currentView, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Helpers ---

  const simulateApiCall = (callback) => {
    setIsLoading(true);
    setErrors({});
    setTimeout(() => {
      setIsLoading(false);
      callback();
    }, 1500);
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Actions ---

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrors({
        email: !email ? "Email is required" : "",
        password: !password ? "Password is required" : ""
      });
      return;
    }

    simulateApiCall(() => {
      // Mock validation
      if (password === 'password') {
        // Successful login credentials -> Move to 2FA
        setTimeLeft(300); // Reset timer to 5 minutes
        setTwoFactorCode(''); // Clear previous code
        setCurrentView('2fa-verification');
        showNotification(`Credentials verified. Code sent to ${email}`);
      } else {
        setErrors({ form: "Invalid email or password. (Hint: use 'password')" });
      }
    });
  };

  const handleVerify2FA = (e) => {
    e.preventDefault();
    if (!twoFactorCode) {
      setErrors({ code: "Please enter the verification code" });
      return;
    }

    simulateApiCall(() => {
      // Strict Check: If code is wrong, go to Access Denied immediately
      if (twoFactorCode === '123456') {
        setCurrentUser({ email, name: email.split('@')[0], role: 'user' });
        setCurrentView('dashboard');
        showNotification(`Welcome back, ${email.split('@')[0]}!`);
      } else {
        // Wrong code -> Access Denied
        setCurrentView('access-denied');
      }
    });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: "Please enter your email address" });
      return;
    }
    simulateApiCall(() => {
      showNotification("Reset link sent to your email.");
      setCurrentView('email-verification');
    });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    if (password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }
    simulateApiCall(() => {
      showNotification("Password successfully reset. Please login.");
      setPassword('');
      setConfirmPassword('');
      setCurrentView('login');
    });
  };

  const handleLogout = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentUser(null);
      setEmail('');
      setPassword('');
      setIsLoading(false);
      setCurrentView('login');
    }, 800);
  };

  const handleAccessDenied = () => {
    setCurrentView('access-denied');
  };

  const handleSessionTimeout = () => {
    setCurrentUser(null);
    setCurrentView('session-expired');
  };

  // --- Renderers ---

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        <p className="font-medium">{notification.msg}</p>
      </div>
    );
  };

  const Home = () => (
    <Card title="Welcome Back" subtitle="Please enter your details to sign in." icon={User}>
      <form onSubmit={handleLogin}>
        <InputField 
          label="Email" 
          type="email" 
          placeholder="Enter your email" 
          icon={Mail} 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <InputField 
          label="Password" 
          type="password" 
          placeholder="Enter your password" 
          icon={Lock} 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        
        <div className="flex items-center justify-between mb-6 mt-2">
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-2" />
            Remember me
          </label>
          <Button variant="link" onClick={() => setCurrentView('forgot-password')}>
            Forgot Password?
          </Button>
        </div>

        {errors.form && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center"><XCircle className="w-4 h-4 mr-2"/>{errors.form}</div>}

        <Button variant="primary" fullWidth type="submit" isLoading={isLoading}>
          Sign In
        </Button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account? <button type="button" className="text-indigo-600 font-medium hover:underline">Sign up</button>
        </p>
      </form>
    </Card>
  );

  const renderTwoFactorVerification = () => (
    <Card title="Verify Identity" subtitle={`Enter the code sent to ${email}`} icon={KeyRound} color="purple">
      <form onSubmit={handleVerify2FA}>
        <div className="mb-6 bg-purple-50 border border-purple-100 rounded-lg p-4 flex flex-col items-center justify-center text-purple-900">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 animate-pulse" />
            <span className="font-semibold">Code expires in:</span>
          </div>
          <span className="text-2xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
        </div>

        <InputField 
          label="Verification Code" 
          type="text" 
          placeholder="Ex: 123456" 
          icon={KeyRound} 
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value)}
          error={errors.code}
          maxLength={6}
        />
        
        <Button variant="primary" fullWidth type="submit" isLoading={isLoading}>
          Verify Code
        </Button>
        
        <div className="mt-6 flex justify-center">
          <Button variant="link" onClick={() => setCurrentView('login')} className="flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderForgotPassword = () => (
    <Card title="Forgot Password" subtitle="No worries, we'll send you reset instructions." icon={Lock} color="indigo">
      <form onSubmit={handleForgotPassword}>
        <InputField 
          label="Email" 
          type="email" 
          placeholder="Enter your email" 
          icon={Mail} 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        
        <Button variant="primary" fullWidth type="submit" isLoading={isLoading}>
          Reset Password
        </Button>
        
        <div className="mt-6 flex justify-center">
          <Button variant="link" onClick={() => setCurrentView('login')} className="flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderResetPassword = () => (
    <Card title="Set New Password" subtitle="Your new password must be different to previously used passwords." icon={RefreshCw} color="indigo">
      <form onSubmit={handleResetPassword}>
        <InputField 
          label="New Password" 
          type="password" 
          placeholder="Enter new password" 
          icon={Lock} 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <InputField 
          label="Confirm Password" 
          type="password" 
          placeholder="Confirm new password" 
          icon={Lock} 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        
        <Button variant="primary" fullWidth type="submit" isLoading={isLoading}>
          Reset Password
        </Button>

        <div className="mt-6 flex justify-center">
          <Button variant="link" onClick={() => setCurrentView('login')} className="flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderEmailVerification = () => (
    <Card title="Check Your Email" subtitle={`We sent a verification link to ${email || 'your email'}`} icon={Mail} color="green">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-6">
          Click the link in the email to verify your address or reset your password. <br/>
          <span className="text-xs text-gray-400">(For this demo, click below to proceed)</span>
        </p>
        
        <Button variant="primary" fullWidth onClick={() => setCurrentView('reset-password')} className="mb-3">
          Simulate Click Link (Go to Reset)
        </Button>
        
        <Button variant="secondary" fullWidth onClick={() => setCurrentView('login')}>
          Skip to Login
        </Button>

        <p className="mt-6 text-sm text-gray-600">
          Didn't receive the email? <button className="text-indigo-600 font-medium hover:underline">Click to resend</button>
        </p>
      </div>
    </Card>
  );

  const renderSessionExpired = () => (
    <Card title="Session Expired" subtitle="Your session has timed out due to inactivity." icon={AlertTriangle} color="yellow">
      <div className="text-center">
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm mb-6 border border-yellow-200">
          Please log in again to continue accessing your account.
        </div>
        <Button variant="primary" fullWidth onClick={() => setCurrentView('login')}>
          Log In Again
        </Button>
      </div>
    </Card>
  );

  const renderAccessDenied = () => (
    <Card title="Access Denied" subtitle="You do not have permission to view this page." icon={ShieldAlert} color="red">
      <div className="text-center">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm mb-6 border border-red-200">
          Error 403: Forbidden. You entered the wrong verification code or do not have access permissions.
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setCurrentView('login')}>
             Back to Login
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderDashboard = () => (
    <div className="w-full max-w-4xl animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border border-gray-100">
        <div className="bg-indigo-600 p-8 text-white flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="opacity-80 mt-2">Welcome back, {currentUser?.name || 'User'}!</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-2"/>
            Logout
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900">User Status</h3>
                <p className="text-blue-600 text-sm mt-1 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Active</p>
             </div>
             <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-purple-900">Role</h3>
                <p className="text-purple-600 text-sm mt-1 capitalize">{currentUser?.role || 'Guest'}</p>
             </div>
             <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h3 className="font-semibold text-green-900">Last Login</h3>
                <p className="text-green-600 text-sm mt-1">Just now</p>
             </div>
          </div>
          
          <div className="mt-8 p-6 border-t border-gray-100 text-center text-gray-500">
            <p>This is a protected area. You are securely logged in.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Main Layout ---

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-3xl" />
      </div>

      {/* Notifications */}
      {renderNotification()}

      {/* Content Area */}
      <div className="w-full flex justify-center z-10">
        {currentView === 'login' && Home()}
        {currentView === '2fa-verification' && renderTwoFactorVerification()}
        {currentView === 'forgot-password' && renderForgotPassword()}
        {currentView === 'reset-password' && renderResetPassword()}
        {currentView === 'email-verification' && renderEmailVerification()}
        {currentView === 'session-expired' && renderSessionExpired()}
        {currentView === 'access-denied' && renderAccessDenied()}
        {currentView === 'dashboard' && renderDashboard()}
      </div>

      {/* Developer Shortcuts (Hidden on mobile usually, visible here for demo) */}
      {currentView !== 'dashboard' && (
        <div className="fixed bottom-4 left-4 z-50 group">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 p-2 rounded-lg shadow-sm text-xs text-gray-400 hover:text-gray-800 transition-colors cursor-default">
            <span className="font-semibold mr-2">Dev Shortcuts:</span>
            <button onClick={() => setCurrentView('session-expired')} className="hover:text-indigo-600 underline mx-1">Timeout</button> | 
            <button onClick={() => setCurrentView('access-denied')} className="hover:text-indigo-600 underline mx-1">403</button> |
            <button onClick={() => setCurrentView('reset-password')} className="hover:text-indigo-600 underline mx-1">Reset Page</button>
          </div>
        </div>
      )}
    </div>
  );
}