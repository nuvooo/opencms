'use client';

import {
  createApiToken,
  deleteApiToken,
  getApiTokens,
} from '@/server/api-token.server';
import type { ApiToken } from '@/types/api-token.type';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Copy, ExternalLink, Plus, Trash2 } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { useEffect, useState } from 'react';

const Page = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      getApiTokens(stored)
        .then(setTokens)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    if (!tenantId || !tokenName.trim()) return;
    try {
      const result = await createApiToken(tenantId, { name: tokenName });
      setNewToken(result.token || '');
      setTokens((prev) => [
        {
          id: result.id,
          name: result.name,
          lastChars: result.lastChars,
          createdAt: result.createdAt,
        },
        ...prev,
      ]);
      setTokenName('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create token',
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    try {
      await deleteApiToken(tenantId, id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success('Token deleted');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete token',
      );
    }
  };

  const copyToken = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Tokens</h1>
        <p className="text-muted-foreground mt-1">
          Manage API tokens and API documentation for programmatic access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Explore the available API endpoints with interactive documentation.
          </p>
          <Button variant="outline" asChild>
            <a href="/api-docs" target="_blank">
              <ExternalLink className="size-4" />
              Open API Docs (Swagger)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            API tokens allow you to authenticate API requests without a session.
            Use them in the <code>Authorization: Bearer</code> header.
          </p>

          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setNewToken(null);
            }}
          >
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="size-4" />
              Create Token
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {newToken ? 'Token Created' : 'Create API Token'}
                </DialogTitle>
                <DialogDescription>
                  {newToken
                    ? 'Copy this token now. You will not be able to see it again.'
                    : 'Give your token a name so you can identify it later.'}
                </DialogDescription>
              </DialogHeader>

              {newToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all font-mono">
                      {newToken}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToken(newToken)}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setDialogOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Token Name</Label>
                    <Input
                      id="token-name"
                      placeholder="e.g. Development, CI/CD"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!tokenName.trim()}>
                      Create
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API tokens yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{token.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {token.lastChars ? `...${token.lastChars}` : 'Token'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(token.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
