
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, MessageSquare, Trash2 } from 'lucide-react';
import { Chat } from '../types/chat';

interface ChatHistoryProps {
  chats: Chat[];
  currentChatId?: string;
  onSelectChat: (chat: Chat) => void;
  onClose: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  currentChatId,
  onSelectChat,
  onClose
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Istorija razgovora
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nema prethodnih razgovora</p>
              <p className="text-sm">Start a conversation to see it here</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                  chat.id === currentChatId ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {chat.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                  {chat.id === currentChatId && (
                    <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatHistory;
