
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, LogOut, MessageSquare, Upload, History, Plus } from 'lucide-react';
import { User } from '../types/auth';

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
    <header className="bg-white/95 backdrop-blur-sm border-b border-white/20 shadow-lg">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Knowledge Bot</h1>
            <p className="text-xs text-gray-600">
              Welcome, {user.name} ({user.role})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistory}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <History className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">History</span>
          </Button>

          {user.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowUpload}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Upload className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
