import { supabase } from '@/integrations/supabase/client';
const insertChunk = (data: any) => supabase.from('document_chunks').insert(data);
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, AlertCircle, Check, Eye, EyeOff, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseService } from '../services/supabaseService';

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

const { error } = await insertChunk({
  document_id: documentId,
  chunk: chunk,
  embedding: embedding,
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
    const validFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || file.type === 'text/plain'
    );
    
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

    // Save API key if not already saved
    if (!hasApiKey && apiKey.trim()) {
      await saveApiKey();
    }

    setUploading(true);
    const progress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      status: 'reading',
      progress: 0
    }));
    setUploadProgress(progress);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress: Reading file
        progress[i] = { ...progress[i], status: 'reading', progress: 25 };
        setUploadProgress([...progress]);
        
        const text = await readFileAsText(file);
        
        // Update progress: Processing
        progress[i] = { ...progress[i], status: 'processing', progress: 50 };
        setUploadProgress([...progress]);
        
        const chunks = chunkText(text, 1000);
        
        // Update progress: Saving
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
        
        // Update progress: Complete
        progress[i] = { ...progress[i], status: 'complete', progress: 100 };
        setUploadProgress([...progress]);
      }
      
      toast.success(`Successfully uploaded ${files.length} document(s)`);
      setFiles([]);
      setTimeout(() => {
        onClose();
      }, 1500);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Upload Documents</CardTitle>
            <CardDescription>
              Add PDF and TXT files to your knowledge base
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            {hasApiKey && !editingApiKey ? (
              <div className="flex items-center space-x-2">
                <div className="flex-1 flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">API key configured</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingApiKey(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="font-mono text-sm pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {!hasApiKey && (
                  <Button
                    onClick={saveApiKey}
                    size="sm"
                    disabled={!apiKey.trim()}
                    className="w-full"
                  >
                    Save API Key
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Required for AI processing. Your key is stored securely.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Select Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500">
              PDF and TXT files only. Multiple files allowed.
            </p>
          </div>

          {files.length > 0 && !uploading && (
            <div className="space-y-2">
              <Label>Selected Files:</Label>
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <File className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && uploadProgress.length > 0 && (
            <div className="space-y-3">
              <Label>Upload Progress:</Label>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{progress.fileName}</span>
                    {progress.status === 'complete' && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                  <p className="text-xs text-gray-500">{getStatusText(progress.status)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">About Document Processing:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Documents are processed and stored persistently</li>
                <li>Content is chunked for better AI understanding</li>
                <li>All users can query the uploaded knowledge base</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || (!hasApiKey && !apiKey.trim())}
            className="w-full"
          >
            {uploading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
