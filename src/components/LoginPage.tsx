
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Mail, Lock } from 'lucide-react';
import { User, LoginCredentials } from '../types/auth';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Demo accounts
  const demoAccounts = {
    admin: {
      email: 'pixunit.nenad@gmail.com',
      password: 'Skikson1717!',
      role: 'admin' as const,
      name: 'Admin User'
    },
    user: {
      email: 'milapreradovic@gmail.com',
      password: 'Skikson1717!',
      role: 'user' as const,
      name: 'User'
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check credentials against demo accounts
      const adminAccount = demoAccounts.admin;
      const userAccount = demoAccounts.user;

      if (credentials.email === adminAccount.email && credentials.password === adminAccount.password) {
        onLogin({
          email: adminAccount.email,
          role: adminAccount.role,
          name: adminAccount.name
        });
        toast.success('Welcome back, Admin!');
      } else if (credentials.email === userAccount.email && credentials.password === userAccount.password) {
        onLogin({
          email: userAccount.email,
          role: userAccount.role,
          name: userAccount.name
        });
        toast.success('Welcome back!');
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (accountType: 'admin' | 'user') => {
    const account = demoAccounts[accountType];
    setCredentials({
      email: account.email,
      password: account.password
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Knowledge Bot</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Your intelligent document assistant
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600 text-sm">Enter your credentials to access the chatbot</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-gray-500 text-sm font-medium">Demo Accounts:</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                className="h-10 text-sm border-gray-200 hover:bg-purple-50 hover:border-purple-300"
              >
                Admin Login
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('user')}
                className="h-10 text-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300"
              >
                User Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
