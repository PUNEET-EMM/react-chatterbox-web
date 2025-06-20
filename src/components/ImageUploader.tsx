
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onUpload: (imageUrl: string) => void;
  onClose: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    
    setIsUploading(true);
    
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, selectedFile);

      if (error) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(data.path);

      onUpload(publicUrl);
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading the image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Send Image</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Click to select an image</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedFile(null);
                  }}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedFile(null);
                  }}
                  className="flex-1"
                >
                  Choose Different
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  {isUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageUploader;
