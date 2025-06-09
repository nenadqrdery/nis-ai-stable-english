import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, AlertCircle, Check, Eye, EyeOff, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadProps {
  onClose: () => void;
}

interface UploadProgress {
  fileName: string;
  status: 'reading' | 'processing' | 'saving' | 'complete';
  progress: number;
}

const embedAndStoreChunks = async (documentId: string, chunks: string[]) => {
  const apiKey = await supabaseService.getApiKey();

  for (const chunk of chunks) {
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: chunk
      })
    });

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // @ts-expect-error - document_chunks is not typed in generated Supabase schema
    const { error } = await supabase.from("document_chunks").insert({
      document_id: documentId,
      chunk: chunk,
      embedding: embedding
    });

    if (error) {
      console.error("Error inserting chunk:", error);
    }
  }
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const savedKey = await supabaseService.getApiKey();
      if (savedKey) {
        setApiKey(savedKey);
        setHasApiKey(true);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => file.type === 'application/pdf' || file.type === 'text/plain');
    if (validFiles.length !== selectedFiles.length) {
      toast.error('Only PDF and TXT files are allowed');
    }
    setFiles(validFiles);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }
    try {
      await supabaseService.saveApiKey(apiKey);
      setHasApiKey(true);
      setEditingApiKey(false);
      toast.success('API key saved successfully');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    }
  };

  const handleUpload = async () => {
    if (!hasApiKey && !apiKey.trim()) {
      toast.error('Please enter your OpenAI API key first');
      return;
    }
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    if (!hasApiKey && apiKey.trim()) {
      await saveApiKey();
    }

    setUploading(true);
    const progress: UploadProgress[] = files.map(file => ({ fileName: file.name, status: 'reading', progress: 0 }));
    setUploadProgress(progress);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progress[i] = { ...progress[i], status: 'reading', progress: 25 };
        setUploadProgress([...progress]);

        const text = await readFileAsText(file);
        progress[i] = { ...progress[i], status: 'processing', progress: 50 };
        setUploadProgress([...progress]);

        const chunks = chunkText(text, 1000);
        progress[i] = { ...progress[i], status: 'saving', progress: 75 };
        setUploadProgress([...progress]);

        const document = {
          name: file.name,
          content: text,
          type: file.type === 'application/pdf' ? 'pdf' as const : 'txt' as const,
          file_size: file.size,
          chunks: chunks
        };

        const documentId = await supabaseService.saveDocument(document);
        await embedAndStoreChunks(documentId, chunks);

        progress[i] = { ...progress[i], status: 'complete', progress: 100 };
        setUploadProgress([...progress]);
      }

      toast.success(`Successfully uploaded ${files.length} document(s)`);
      setFiles([]);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const chunkText = (text: string, chunkSize: number): string[] => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'reading': return 'Reading file...';
      case 'processing': return 'Processing content...';
      case 'saving': return 'Saving to database...';
      case 'complete': return 'Complete!';
    }
  };

  return (<div>{/* Your modal markup unchanged */}</div>);
};

export default DocumentUpload;
