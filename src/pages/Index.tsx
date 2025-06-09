import React, { useState, useEffect } from 'react';
import { User } from '../types/auth';
import LoginPage from '../components/LoginPage';
import ChatInterface from '../components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '@/services/supabaseService';

interface IndexProps {
  user?: User | null;
}

const Index: React.FC<IndexProps> = ({ user: initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    const handleSession = async (session: any) => {
      if (session?.user) {
        const userEmail = session.user.email || '';
        const isAdmin = userEmail === 'pixunit.nenad@gmail.com';

        try {
          const profile = await supabaseService.getUserProfile(session.user.id);
          setUser({
            email: userEmail,
            role: isAdmin ? 'admin' : 'user',
            name: profile ? `${profile.first_name} ${profile.last_name}` : userEmail,
            firstName: profile?.first_name,
            lastName: profile?.last_name
          });
        } catch (error) {
          console.error('Profile error:', error);
          setUser({
            email: userEmail,
            role: isAdmin ? 'admin' : 'user',
            name: userEmail
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleSession(session);
      } catch (err) {
        console.error('Session check failed:', err);
        setIsLoading(false);
      }
    };

    // Check session on page load
    checkSession();

    // Listen to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const handleLogin = (userData: User) => setUser(userData);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
