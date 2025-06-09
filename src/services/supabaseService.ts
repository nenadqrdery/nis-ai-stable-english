
import { supabase } from '@/integrations/supabase/client';

export interface DocumentData {
  id: string;
  name: string;
  content: string;
  type: 'pdf' | 'txt';
  file_size?: number;
  chunks: string[];
  uploaded_at: string;
}

export interface ChatData {
  id: string;
  title: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

export interface MessageData {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export const supabaseService = {
  // Admin Settings
  async getApiKey(): Promise<string | null> {
    const { data } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .single();
    
    return data?.setting_value || null;
  },

  async saveApiKey(apiKey: string): Promise<void> {
    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'openai_api_key',
        setting_value: apiKey,
        updated_at: new Date().toISOString()
      });
  },

  // User Profiles
  async getUserProfile(userId: string): Promise<ProfileData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  },

  // Documents
  async getDocuments(): Promise<DocumentData[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(doc => ({
      ...doc,
      type: doc.type as 'pdf' | 'txt',
      chunks: doc.chunks || []
    }));
  },

async saveDocument(document: Omit<DocumentData, 'id' | 'uploaded_at'>): Promise<string> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...document,
      uploaded_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;

  return data.id;
}

  // Chats
  async getChats(userEmail: string): Promise<ChatData[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async saveChat(chat: Omit<ChatData, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('chats')
      .upsert({
        ...chat,
        created_at: now,
        updated_at: now
      });
    
    if (error) throw error;
  },

  async updateChat(chatId: string, updates: Partial<ChatData>): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId);
    
    if (error) throw error;
  },

  // Messages
  async getChatMessages(chatId: string): Promise<MessageData[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant'
    }));
  },

  async saveMessage(message: Omit<MessageData, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        ...message,
        timestamp: new Date().toISOString()
      });
    
    if (error) throw error;
  }
};
