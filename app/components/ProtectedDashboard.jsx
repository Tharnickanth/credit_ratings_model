'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Dashboard from './Dashboard';

const ProtectedDashboard = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('user');
      
      if (!user) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return null;
};

export default ProtectedDashboard;