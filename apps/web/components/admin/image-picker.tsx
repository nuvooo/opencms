'use client';

import { getMedia } from '@/server/media.server';
import { Media } from '@/types/media.type';
import { Button } from '@repo/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { ImageIcon, X } from '@repo/shadcn/lucide';
import { useEffect, useState } from 'react';

interface ImagePickerProps {
  tenantId: string;
  value: string;
  onChange: (value: string) => void;
}

const ImagePicker = ({ tenantId, value, onChange }: ImagePickerProps) => {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getMedia(tenantId)
        .then(setMedia)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, tenantId]);

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block rounded-lg border overflow-hidden">
          <img
            src={`/assets/${value}`}
            alt="Selected"
            className="h-32 w-32 object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 size-6"
            onClick={() => onChange('')}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" type="button">
                <ImageIcon className="size-4" />
                Choose Image
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Image</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                    Loading...
                  </p>
                ) : media.filter((m) => isImage(m.mimeType)).length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                    No images uploaded yet.
                  </p>
                ) : (
                  media
                    .filter((m) => isImage(m.mimeType))
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`relative aspect-square rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                          value === item.filePath ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => {
                          onChange(item.filePath);
                          setOpen(false);
                        }}
                      >
                        <img
                          src={`/assets/${item.filePath}`}
                          alt={item.altText || item.filename}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex-1">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or enter image path directly"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
