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
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center text-gray-900 dark:text-gray-100">
            <MessageSquare className="w-5 h-5 mr-2" />
            Istorija razgovora
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {chats.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                className={`w-full justify-start text-left ${
                  chat.id === currentChatId
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(chat.createdAt)}
                    </p>
                  </div>
                  <Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatHistory;
