import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types/auth';
import { Chat, Message } from '../types/chat';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import DocumentUpload from './DocumentUpload';
import ChatHistory from './ChatHistory';
import { generateChatTitle, generateResponse } from '../services/chatService';
import { supabaseService } from '../services/supabaseService';
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
    loadChats();
  }, [user.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const loadChats = async () => {
    try {
      const chatsData = await supabaseService.getChats(user.email);
      const chatsWithMessages = await Promise.all(
        chatsData.map(async (chat) => {
          const messagesData = await supabaseService.getChatMessages(chat.id);
          const messages: Message[] = messagesData.map((msg) => ({
            ...msg,
            created_at: new Date(msg.created_at),
          }));
          return { ...chat, messages };
        })
      );
      setChats(chatsWithMessages);
      if (chatsWithMessages.length > 0) {
        setCurrentChat(chatsWithMessages[0]);
      }
    } catch (error) {
      toast.error('Failed to load chats.');
    }
  };

  const addMessage = (message: Message) => {
    if (!currentChat) return;
    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, message],
    };
    setCurrentChat(updatedChat);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-md">
        <ChatHeader
          user={user}
          onLogout={onLogout}
          setShowUpload={setShowUpload}
          setShowHistory={setShowHistory}
        />
      </div>

      <div className="flex-1 overflow-y-auto pt-[60px] pb-[70px]">
        {showHistory ? (
          <ChatHistory chats={chats} setCurrentChat={setCurrentChat} />
        ) : showUpload ? (
          <DocumentUpload user={user} onUploadComplete={loadChats} />
        ) : (
          <ChatMessages messages={currentChat?.messages || []} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-inner">
        <ChatInput
          user={user}
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          setChats={setChats}
          addMessage={addMessage}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
    </div>
  );
};

export default ChatInterface;