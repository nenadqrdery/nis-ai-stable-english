
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

    // Initialize auth state with timeout fallback
    const initializeAuth = async () => {
      try {
        console.log('Starting auth initialization...');
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
          try {
            const profile = await supabaseService.getUserProfile(session.user.id);
            
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: profile ? `${profile.first_name} ${profile.last_name}` : session.user.email || '',
              firstName: profile?.first_name,
              lastName: profile?.last_name
            });
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Still set user even if profile fetch fails
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: session.user.email || '',
              firstName: undefined,
              lastName: undefined
            });
          }
        } else {
          console.log('No existing session found');
          setUser(null);
        }
        
        setIsLoading(false);
        console.log('Auth initialization completed');
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
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
        
        // Ensure loading is false after auth state change
        setIsLoading(false);
      }
    );

    // Initialize auth
    initializeAuth();

    // Fallback timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth initialization timeout - forcing loading to false');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

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
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsLoading(false);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoading(false);
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
