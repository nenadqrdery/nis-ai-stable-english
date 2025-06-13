
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Mail, Lock, User as UserIcon } from 'lucide-react';
import { User, SignUpData } from '../types/auth';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '../services/supabaseService';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signUpData, setSignUpData] = useState<SignUpData>({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleToggle = () => {
    setIsSignUp(!isSignUp);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        toast.success('Registracija uspešna! Proverite email za potvrdu.');
      }
    } catch (error) {
      toast.error('Greška pri registraciji. Pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) {
        toast.error('Neispravni podaci. Pokušajte ponovo.');
      } else if (data.user) {
        // Get user profile
        const profile = await supabaseService.getUserProfile(data.user.id);
        
        const userData = {
          email: data.user.email || '',
          role: data.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
          name: profile ? `${profile.first_name} ${profile.last_name}` : data.user.email || '',
          firstName: profile?.first_name,
          lastName: profile?.last_name
        } as User;
        
        onLogin(userData);
        
        // Show welcome message with proper positioning and auto-dismiss
        setTimeout(() => {
          toast.success('Dobrodošli!', {
            duration: 3000,
            position: 'top-center',
            className: 'mt-20'
          });
        }, 100);
      }
    } catch (error) {
      toast.error('Greška pri prijavljivanju. Pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error('Unesite email adresu');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Link za resetovanje lozinke je poslat na email');
      }
    } catch (error) {
      toast.error('Greška pri slanju linka za resetovanje');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-6 bg-white">
      <Card className="w-full max-w-md bg-white border-2 border-black shadow-none">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-black">Pitaj Q</CardTitle>
            <CardDescription className="text-gray-600 text-sm mt-1">
              Vaš inteligentni asistent za dokumente
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-6">
          {/* Toggle Slider */}
          <div className="relative">
            <div className="flex items-center justify-between bg-gray-100 rounded-full p-1 relative border border-gray-300">
              {/* Sliding background */}
              <div 
                className={`absolute top-1 h-8 w-1/2 bg-black rounded-full transition-transform duration-300 ease-in-out ${
                  isSignUp ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              
              {/* Toggle buttons */}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`relative z-10 flex-1 py-2 px-4 text-sm font-medium rounded-full transition-colors duration-300 flex items-center justify-center ${
                  !isSignUp ? 'text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                Prijavljivanje
              </button>
              
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`relative z-10 flex-1 py-2 px-4 text-sm font-medium rounded-full transition-colors duration-300 flex items-center justify-center ${
                  isSignUp ? 'text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                Registracija
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="min-h-[320px]">
            {isSignUp ? (
              <div>
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-black mb-1">Registracija</h2>
                  <p className="text-gray-600 text-sm">
                    Kreirajte novi nalog da pristupite chatbotu
                  </p>
                </div>
                
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-black font-medium text-sm">Ime</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Vaše ime"
                          value={signUpData.firstName}
                          onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                          className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="lastName" className="text-black font-medium text-sm">Prezime</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Vaše prezime"
                          value={signUpData.lastName}
                          onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                          className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="signupEmail" className="text-black font-medium text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="Unesite email"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="signupPassword" className="text-black font-medium text-sm">Lozinka</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupPassword"
                        type="password"
                        placeholder="Unesite lozinku"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] mt-4"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registruje se...' : 'Registruj se'}
                  </Button>
                </form>
              </div>
            ) : (
              <div>
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-black mb-1">Prijavljivanje</h2>
                  <p className="text-gray-600 text-sm">
                    Unesite podatke da pristupite chatbotu
                  </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="loginEmail" className="text-black font-medium text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="loginEmail"
                        type="email"
                        placeholder="Unesite email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="loginPassword" className="text-black font-medium text-sm">Lozinka</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="loginPassword"
                        type="password"
                        placeholder="Unesite lozinku"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 h-10 border-black focus:border-black focus:ring-black text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] mt-4"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Prijavljivanje...' : 'Prijavite se'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-black hover:text-gray-800 mt-2"
                    onClick={handleForgotPassword}
                  >
                    Zaboravili ste lozinku?
                  </Button>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
