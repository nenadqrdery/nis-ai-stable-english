
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types/auth';
import { Chat, Message } from '../types/chat';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import DocumentUpload from './DocumentUpload';
import ChatHistory from './ChatHistory';
import { generateChatTitle, generateResponse } from '../services/chatService';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onLogout }) => {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chats from localStorage
    const savedChats = localStorage.getItem(`chats-${user.email}`);
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChats(parsedChats);
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    }
    
    // Create initial chat if none exists
    if (!savedChats || JSON.parse(savedChats).length === 0) {
      startNewChat();
    }
  }, [user.email]);

  useEffect(() => {
    // Save chats to localStorage whenever chats change
    if (chats.length > 0) {
      localStorage.setItem(`chats-${user.email}`, JSON.stringify(chats));
    }
  }, [chats, user.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const startNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setCurrentChat(newChat);
    setChats(prev => [newChat, ...prev]);
    setShowHistory(false);
  };

  const selectChat = (chat: Chat) => {
    setCurrentChat(chat);
    setShowHistory(false);
  };

  const sendMessage = async (content: string) => {
    if (!currentChat || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      content,
      role: 'user',
      timestamp: new Date(),
      chatId: currentChat.id
    };

    // Update current chat with user message
    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      updatedAt: new Date()
    };

    // Update title if this is the first message
    if (currentChat.messages.length === 0) {
      updatedChat.title = generateChatTitle(content);
    }

    setCurrentChat(updatedChat);
    setChats(prev => prev.map(c => c.id === currentChat.id ? updatedChat : c));
    setIsLoading(true);

    try {
      const response = await generateResponse(content, user);
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        chatId: currentChat.id
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
        updatedAt: new Date()
      };

      setCurrentChat(finalChat);
      setChats(prev => prev.map(c => c.id === currentChat.id ? finalChat : c));
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ChatHeader
        user={user}
        onLogout={onLogout}
        onNewChat={startNewChat}
        onShowHistory={() => setShowHistory(true)}
        onShowUpload={() => setShowUpload(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <ChatMessages 
            messages={currentChat?.messages || []} 
            isLoading={isLoading}
          />
          <div ref={messagesEndRef} />
          <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
        </div>
      </div>

      {showUpload && user.role === 'admin' && (
        <DocumentUpload onClose={() => setShowUpload(false)} />
      )}

      {showHistory && (
        <ChatHistory
          chats={chats}
          currentChatId={currentChat?.id}
          onSelectChat={selectChat}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
