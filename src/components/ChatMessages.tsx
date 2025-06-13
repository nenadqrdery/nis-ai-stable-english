import React from 'react';
import { Message } from '../types/chat';
import { Bot, User } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Pitaj Q</h3>
          <p className="text-gray-600">
            Ja sam tvoj lični pomoćnik za HSE i bezbednost na radu.
Slobodno postavi bilo koje pitanje u vezi sa pravilima, procedurama ili bezbednosnim situacijama – tu sam da ti pomognem!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'assistant' ? 'justify-start' : 'justify-end'
          }`}
        >
          <Card
            className={`max-w-[80%] p-4 ${
              message.role === 'assistant'
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'bg-blue-100 dark:bg-blue-900'
            }`}
          >
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                {message.role === 'assistant' ? (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {message.content}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <Card className="max-w-[80%] p-4 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
