
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '../components/LoginPage';
import ChatInterface from '../components/ChatInterface';
import { User } from '../types/auth';
import { supabaseService } from '../services/supabaseService';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session first
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await supabaseService.getUserProfile(session.user.id);
          
          setUser({
            email: session.user.email || '',
            role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
            name: profile ? `${profile.first_name} ${profile.last_name}` : session.user.email || '',
            firstName: profile?.first_name,
            lastName: profile?.last_name
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          const profile = await supabaseService.getUserProfile(session.user.id);
          
          setUser({
            email: session.user.email || '',
            role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
            name: profile ? `${profile.first_name} ${profile.last_name}` : session.user.email || '',
            firstName: profile?.first_name,
            lastName: profile?.last_name
          });
        } else {
          setUser(null);
        }
        
        if (!isLoading) {
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out user...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800">
      {user ? (
        <ChatInterface user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default Index;
