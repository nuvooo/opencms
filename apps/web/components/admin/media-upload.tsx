'use client';

import { uploadMedia } from '@/server/media.server';
import { Button } from '@repo/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Upload, X } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { ChangeEvent, useRef, useState } from 'react';

interface MediaUploadProps {
  tenantId: string;
  onUploaded: () => void;
}

const MediaUpload = ({ tenantId, onUploaded }: MediaUploadProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', altText);
      await uploadMedia(tenantId, formData);
      toast.success('File uploaded successfully');
      setOpen(false);
      reset();
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAltText('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {preview ? (
            <div className="relative rounded-lg border overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-contain bg-muted"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-6"
                onClick={reset}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Click to select a file
              </p>
            </div>
          )}
          <Input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {file && (
            <div className="space-y-2">
              <Label htmlFor="alt">Alt Text (optional)</Label>
              <Input
                id="alt"
                value={altText}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAltText(e.target.value)
                }
                placeholder="Descriptive text for accessibility"
              />
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUpload;
