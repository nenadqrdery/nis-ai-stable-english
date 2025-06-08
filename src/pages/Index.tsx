
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
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        if (session?.user) {
          try {
            const profile = await supabaseService.getUserProfile(session.user.id);
            
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: profile ? `${profile.first_name} ${profile.last_name}` : session.user.email || '',
              firstName: profile?.first_name,
              lastName: profile?.last_name
            });
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: session.user.email || '',
              firstName: undefined,
              lastName: undefined
            });
          }
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('Found existing session for user:', session.user.email);
          // Don't set loading to false here - let the auth state change handler do it
        } else {
          console.log('No existing session found');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Fallback timeout only as safety net
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth initialization timeout - forcing loading to false');
        setIsLoading(false);
      }
    }, 10000); // Increased to 10 seconds as true safety net

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
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
