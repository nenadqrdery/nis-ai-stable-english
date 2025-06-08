
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
          const messages: Message[] = messagesData.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
            chatId: msg.chat_id
          }));
          
          return {
            id: chat.id,
            title: chat.title,
            messages,
            createdAt: new Date(chat.created_at),
            updatedAt: new Date(chat.updated_at)
          };
        })
      );
      
      setChats(chatsWithMessages);
      
      if (chatsWithMessages.length === 0) {
        startNewChat();
      } else {
        setCurrentChat(chatsWithMessages[0]);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      startNewChat();
    }
  };

  const startNewChat = async () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      await supabaseService.saveChat({
        id: newChat.id,
        title: newChat.title,
        user_email: user.email
      });
      
      setCurrentChat(newChat);
      setChats(prev => [newChat, ...prev]);
      setShowHistory(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
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
      // Save user message to database
      await supabaseService.saveMessage({
        chat_id: currentChat.id,
        content: userMessage.content,
        role: userMessage.role
      });

      // Update chat title if it's the first message
      if (currentChat.messages.length === 0) {
        await supabaseService.updateChat(currentChat.id, { title: updatedChat.title });
      }

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

      // Save assistant message to database
      await supabaseService.saveMessage({
        chat_id: currentChat.id,
        content: assistantMessage.content,
        role: assistantMessage.role
      });

    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
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
