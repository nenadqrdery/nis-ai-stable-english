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

export const supabaseService = {
  // Get stored OpenAI key
  async getApiKey(): Promise<string | null> {
    const { data } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .single();

    return data?.setting_value || null;
  },

  // Save OpenAI key
  async saveApiKey(apiKey: string): Promise<void> {
    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'openai_api_key',
        setting_value: apiKey,
        updated_at: new Date().toISOString(),
      });
  },

  // Get uploaded documents
  async getDocuments(): Promise<DocumentData[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(doc => ({
      ...doc,
      type: doc.type as 'pdf' | 'txt',
      chunks: doc.chunks || [],
    }));
  },

  // Save new document, return document ID
  async saveDocument(document: Omit<DocumentData, 'id' | 'uploaded_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        uploaded_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  // Insert a chunk + embedding into document_chunks
  insertChunk: async ({ document_id, chunk, embedding }: {
    document_id: string;
    chunk: string;
    embedding: number[];
  }) => {
    const { error } = await supabase
      .from("document_chunks")
      .insert({ document_id, chunk, embedding });

    return { error };
  },
};
