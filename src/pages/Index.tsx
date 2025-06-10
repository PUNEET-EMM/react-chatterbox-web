
import React, { useState, useEffect } from 'react';
import LoginPage from '../components/LoginPage';
import RegisterPage from '../components/RegisterPage';
import ChatApp from '../components/ChatApp';

const Index = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'chat'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simulate authentication check - replace with Supabase auth when connected
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setCurrentView('chat');
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('chat');
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('login');
    localStorage.removeItem('isAuthenticated');
  };

  if (isAuthenticated && currentView === 'chat') {
    return <ChatApp onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center p-4">
      {currentView === 'login' ? (
        <LoginPage 
          onLogin={handleLogin}
          onSwitchToRegister={() => setCurrentView('register')}
        />
      ) : (
        <RegisterPage 
          onRegister={handleLogin}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
    </div>
  );
};

export default Index;
