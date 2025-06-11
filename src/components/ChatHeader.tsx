
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, LogOut, Upload, History, Plus } from 'lucide-react';
import { User } from '../types/auth';
import MobileNav from './MobileNav';

interface ChatHeaderProps {
  user: User;
  onLogout: () => void;
  onNewChat: () => void;
  onShowHistory: () => void;
  onShowUpload: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  onLogout,
  onNewChat,
  onShowHistory,
  onShowUpload
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">PitajQ</h1>
            <p className="text-xs text-gray-600">
              Pozdrav, {user.firstName || user.name}! ({user.role === 'admin' ? 'Administrator' : 'Korisnik'})
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novi razgovor
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistory}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <History className="w-4 h-4 mr-1" />
            Istorija
          </Button>

          {user.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowUpload}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Upload className="w-4 h-4 mr-1" />
              Otpremanje
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Odjava
          </Button>
        </div>

        {/* Mobile Navigation */}
        <MobileNav
          user={user}
          onLogout={onLogout}
          onNewChat={onNewChat}
          onShowHistory={onShowHistory}
          onShowUpload={onShowUpload}
        />
      </div>
    </header>
  );
};

export default ChatHeader;
