import { useEffect, useRef, useState } from "react";
import { Chat, Message } from "@/types/chat";
import { User } from "@/types/auth";
import { supabaseService } from "@/services/supabaseService";
import { generateChatTitle } from "@/services/chatService";
import { toast } from "sonner";

import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import ChatHistory from "@/components/ChatHistory";
import DocumentUpload from "@/components/DocumentUpload";

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

export default function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, [user.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    } catch (err) {
      toast.error("Failed to load chats.");
    }
  };

  const addMessage = (message: Message) => {
    if (!currentChat) return;
    setCurrentChat({
      ...currentChat,
      messages: [...currentChat.messages, message],
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ChatHeader
          user={user}
          onLogout={onLogout}
          onShowUpload={() => {
            setShowUpload(true);
            setShowHistory(false);
          }}
          onShowHistory={() => {
            setShowHistory(true);
            setShowUpload(false);
          }}
          onNewChat={loadChats}
        />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pt-[56px] pb-[72px]">
        {showHistory ? (
          <ChatHistory chats={chats} setCurrentChat={setCurrentChat} />
        ) : showUpload ? (
          <DocumentUpload user={user} onUploadComplete={loadChats} />
        ) : (
          <ChatMessages messages={currentChat?.messages || []} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed bottom input */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background">
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
}