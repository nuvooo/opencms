'use client';

import MediaUpload from '@/components/admin/media-upload';
import { deleteMedia, getMedia } from '@/server/media.server';
import { Media } from '@/types/media.type';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/shadcn/alert-dialog';
import { Button } from '@repo/shadcn/button';
import { ImageIcon, Trash2 } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { formatDate } from '@repo/utils/date';
import { useEffect, useState } from 'react';

const Page = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMedia = () => {
    if (!tenantId) return;
    getMedia(tenantId)
      .then(setMedia)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) fetchMedia();
    else setLoading(false);
  }, []);

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    setDeletingId(id);
    try {
      await deleteMedia(tenantId, id);
      toast.success('Media deleted successfully');
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete media',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your uploaded files.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Please select a tenant from the sidebar to view media.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your uploaded files.
          </p>
        </div>
        <MediaUpload tenantId={tenantId} onUploaded={fetchMedia} />
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ImageIcon className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No media yet.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Upload images, videos, or documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg border overflow-hidden bg-muted/20"
            >
              <div className="aspect-square flex items-center justify-center bg-muted/40">
                {isImage(item.mimeType) ? (
                  <img
                    src={`/assets/${item.filePath}`}
                    alt={item.altText || item.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-xs font-medium text-muted-foreground break-all">
                      {item.filename}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={item.filename}
                >
                  {item.filename}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="size-7"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete media?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete{' '}
                        <strong>{item.filename}</strong>. This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;
