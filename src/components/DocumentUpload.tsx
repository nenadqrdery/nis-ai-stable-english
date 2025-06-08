
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, File, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onClose: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Load saved API key
  React.useEffect(() => {
    const savedKey = localStorage.getItem('openai-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

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
    localStorage.setItem('openai-api-key', value);
  };

  const handleUpload = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your OpenAI API key first');
      return;
    }

    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    
    try {
      for (const file of files) {
        const text = await readFileAsText(file);
        
        // Store document in localStorage (in a real app, this would be in a database)
        const document = {
          id: `doc-${Date.now()}-${Math.random()}`,
          name: file.name,
          content: text,
          type: file.type === 'application/pdf' ? 'pdf' : 'txt',
          uploadedAt: new Date().toISOString(),
          chunks: chunkText(text, 1000) // Split into chunks for better processing
        };

        const existingDocs = localStorage.getItem('knowledge-base-documents');
        const docs = existingDocs ? JSON.parse(existingDocs) : [];
        docs.push(document);
        localStorage.setItem('knowledge-base-documents', JSON.stringify(docs));
      }
      
      toast.success(`Successfully uploaded ${files.length} document(s)`);
      setFiles([]);
      onClose();
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
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
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Required for AI processing. Your key is stored locally.
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
            />
            <p className="text-xs text-gray-500">
              PDF and TXT files only. Multiple files allowed.
            </p>
          </div>

          {files.length > 0 && (
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

          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">About Document Processing:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Documents are processed and stored locally</li>
                <li>Content is chunked for better AI understanding</li>
                <li>All users can query the uploaded knowledge base</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !apiKey.trim()}
            className="w-full"
          >
            {uploading ? (
              <>Uploading...</>
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
