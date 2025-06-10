
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '../components/LoginPage';
import RegisterPage from '../components/RegisterPage';
import ChatApp from '../components/ChatApp';

const Index = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <ChatApp />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center p-4">
      {currentView === 'login' ? (
        <LoginPage 
          onSwitchToRegister={() => setCurrentView('register')}
        />
      ) : (
        <RegisterPage 
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
    </div>
  );
};

export default Index;
