'use client';

import {
  BootstrapSetupInputSchema,
  DbConnectionStepSchema,
} from '@/server/setup.schema';
import { bootstrapSetup, validateSetupDb } from '@/server/setup.server';
import { Button } from '@repo/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { Checkbox } from '@repo/shadcn/checkbox';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { cn } from '@repo/shadcn/lib/utils';
import {
  CheckCircle2,
  Database,
  Rocket,
  ShieldCheck,
} from '@repo/shadcn/lucide';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SafeParseReturnType } from 'zod';

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = ['Welcome', 'Database', 'Admin', 'Review'] as const;

const DB_ENGINES: {
  value: 'postgres' | 'mysql' | 'sqlite';
  label: string;
  defaultPort?: string;
}[] = [
  { value: 'postgres', label: 'PostgreSQL', defaultPort: '5432' },
  { value: 'mysql', label: 'MySQL', defaultPort: '3306' },
  { value: 'sqlite', label: 'SQLite' },
];

type FieldErrors = Record<string, string | undefined>;

/**
 * Maps a Zod safeParse failure onto wizard field ids so each message can be
 * shown inline beneath its input instead of only in the console.
 */
const collectErrors = (
  result: SafeParseReturnType<unknown, unknown>,
  fieldToId: Record<string, string>,
): FieldErrors => {
  if (result.success) return {};
  const out: FieldErrors = {};
  for (const [field, messages] of Object.entries(
    result.error.flatten().fieldErrors,
  )) {
    const id = fieldToId[field];
    if (id && messages && messages.length > 0) out[id] = messages[0];
  }
  return out;
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;

const SetupWizard = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [dbValidated, setDbValidated] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    app: {
      allowCorsUrl: 'http://localhost:3000',
      authSecret: '',
      authUrl: 'http://localhost:3000',
    },
    database: {
      type: 'postgres' as 'postgres' | 'mysql' | 'sqlite',
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: '',
      name: '',
      database: './data/cms.sqlite',
      ssl: false,
    },
    admin: {
      email: '',
      password: '',
    },
  });

  const validateDbAction = useAction(validateSetupDb, {
    onSuccess: () => {
      setDbValidated(true);
    },
  });

  const bootstrapAction = useAction(bootstrapSetup, {
    onSuccess: () => {
      setStep(4);
    },
  });

  const backendError =
    validateDbAction.result.serverError ?? bootstrapAction.result.serverError;

  const clearError = (id: string) =>
    setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev));

  const handleValidateDb = (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors = collectErrors(
      DbConnectionStepSchema.safeParse(form.database),
      {
        database: 'db-file',
        host: 'db-host',
        port: 'db-port',
        username: 'db-username',
        name: 'db-name',
      },
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    validateDbAction.execute(form.database);
  };

  const handleAdminNext = (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors = collectErrors(
      BootstrapSetupInputSchema.shape.admin.safeParse(form.admin),
      { email: 'admin-email', password: 'admin-password' },
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setStep(3);
  };

  const handleInstall = (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors = collectErrors(
      BootstrapSetupInputSchema.shape.app.safeParse(form.app),
      { authSecret: 'auth-secret' },
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    bootstrapAction.execute(form);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">One-time setup</h1>
        <p className="text-muted-foreground">
          This installer can only be run once.
        </p>
      </div>

      {step < 4 && (
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                  index === step
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index < step
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground',
                )}
              >
                {index < step ? <CheckCircle2 className="size-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px w-8',
                    index < step ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {backendError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {backendError}
        </div>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-5" /> Welcome
            </CardTitle>
            <CardDescription>
              We will configure the database and create your first admin
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setStep(1)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" /> Database settings
            </CardTitle>
            <CardDescription>
              Choose a database engine and connect the CMS to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleValidateDb} noValidate>
              <div className="space-y-2">
                <Label>Engine</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DB_ENGINES.map((engine) => (
                    <Button
                      key={engine.value}
                      type="button"
                      variant={
                        form.database.type === engine.value
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => {
                        setDbValidated(false);
                        setErrors({});
                        setForm((prev) => ({
                          ...prev,
                          database: {
                            ...prev.database,
                            type: engine.value,
                            port: engine.defaultPort ?? prev.database.port,
                          },
                        }));
                      }}
                    >
                      {engine.label}
                    </Button>
                  ))}
                </div>
              </div>

              {form.database.type === 'sqlite' ? (
                <div className="space-y-2">
                  <Label htmlFor="db-file">Database file path</Label>
                  <Input
                    id="db-file"
                    aria-invalid={Boolean(errors['db-file'])}
                    value={form.database.database}
                    onChange={(event) => {
                      setDbValidated(false);
                      clearError('db-file');
                      setForm((prev) => ({
                        ...prev,
                        database: {
                          ...prev.database,
                          database: event.target.value,
                        },
                      }));
                    }}
                  />
                  <FieldError message={errors['db-file']} />
                  <p className="text-xs text-muted-foreground">
                    SQLite stores everything in a single file. No server
                    required.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="db-host">Host</Label>
                      <Input
                        id="db-host"
                        aria-invalid={Boolean(errors['db-host'])}
                        value={form.database.host}
                        onChange={(event) => {
                          setDbValidated(false);
                          clearError('db-host');
                          setForm((prev) => ({
                            ...prev,
                            database: {
                              ...prev.database,
                              host: event.target.value,
                            },
                          }));
                        }}
                      />
                      <FieldError message={errors['db-host']} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-port">Port</Label>
                      <Input
                        id="db-port"
                        aria-invalid={Boolean(errors['db-port'])}
                        value={form.database.port}
                        onChange={(event) => {
                          setDbValidated(false);
                          clearError('db-port');
                          setForm((prev) => ({
                            ...prev,
                            database: {
                              ...prev.database,
                              port: event.target.value,
                            },
                          }));
                        }}
                      />
                      <FieldError message={errors['db-port']} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="db-username">Username</Label>
                    <Input
                      id="db-username"
                      aria-invalid={Boolean(errors['db-username'])}
                      value={form.database.username}
                      onChange={(event) => {
                        setDbValidated(false);
                        clearError('db-username');
                        setForm((prev) => ({
                          ...prev,
                          database: {
                            ...prev.database,
                            username: event.target.value,
                          },
                        }));
                      }}
                    />
                    <FieldError message={errors['db-username']} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="db-password">Password</Label>
                    <Input
                      id="db-password"
                      type="password"
                      value={form.database.password}
                      onChange={(event) => {
                        setDbValidated(false);
                        setForm((prev) => ({
                          ...prev,
                          database: {
                            ...prev.database,
                            password: event.target.value,
                          },
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="db-name">Database name</Label>
                    <Input
                      id="db-name"
                      aria-invalid={Boolean(errors['db-name'])}
                      value={form.database.name}
                      onChange={(event) => {
                        setDbValidated(false);
                        clearError('db-name');
                        setForm((prev) => ({
                          ...prev,
                          database: {
                            ...prev.database,
                            name: event.target.value,
                          },
                        }));
                      }}
                    />
                    <FieldError message={errors['db-name']} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="db-ssl"
                      checked={form.database.ssl}
                      onCheckedChange={(checked: boolean) => {
                        setDbValidated(false);
                        setForm((prev) => ({
                          ...prev,
                          database: { ...prev.database, ssl: checked },
                        }));
                      }}
                    />
                    <Label htmlFor="db-ssl">Use SSL</Label>
                  </div>
                </>
              )}

              {dbValidated && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
                  <CheckCircle2 className="size-4" /> Connection verified
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={validateDbAction.isExecuting}
                >
                  {validateDbAction.isExecuting
                    ? 'Validating...'
                    : 'Validate connection'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!dbValidated}
                >
                  Next
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" /> First admin account
            </CardTitle>
            <CardDescription>
              This account has full administrative access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleAdminNext} noValidate>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors['admin-email'])}
                  value={form.admin.email}
                  onChange={(event) => {
                    clearError('admin-email');
                    setForm((prev) => ({
                      ...prev,
                      admin: { ...prev.admin, email: event.target.value },
                    }));
                  }}
                />
                <FieldError message={errors['admin-email']} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors['admin-password'])}
                  value={form.admin.password}
                  onChange={(event) => {
                    clearError('admin-password');
                    setForm((prev) => ({
                      ...prev,
                      admin: { ...prev.admin, password: event.target.value },
                    }));
                  }}
                />
                <FieldError message={errors['admin-password']} />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with an uppercase letter, a number and a
                  special character.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setErrors({});
                    setStep(1);
                  }}
                >
                  Back
                </Button>
                <Button type="submit">Next</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5" /> Review setup
            </CardTitle>
            <CardDescription>
              Confirm the details and finish the installation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleInstall} noValidate>
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">
                    {form.database.type === 'sqlite'
                      ? `sqlite: ${form.database.database || '-'}`
                      : `${form.database.type} · ${form.database.host}:${form.database.port}/${form.database.name || '-'}`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Admin</span>
                  <span className="font-medium">{form.admin.email || '-'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-secret">Auth secret</Label>
                <Input
                  id="auth-secret"
                  type="password"
                  autoComplete="off"
                  aria-invalid={Boolean(errors['auth-secret'])}
                  value={form.app.authSecret}
                  onChange={(event) => {
                    clearError('auth-secret');
                    setForm((prev) => ({
                      ...prev,
                      app: { ...prev.app, authSecret: event.target.value },
                    }));
                  }}
                />
                <FieldError message={errors['auth-secret']} />
                <p className="text-xs text-muted-foreground">
                  Used to sign authentication sessions. Keep it secret. At least
                  10 characters.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setErrors({});
                    setStep(2);
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={bootstrapAction.isExecuting}>
                  {bootstrapAction.isExecuting ? 'Installing...' : 'Install'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
              <CheckCircle2 className="size-5" /> Installation completed
            </CardTitle>
            <CardDescription>
              You can now sign in with your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => router.push('/auth/sign-in')}>
              Go to sign-in
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SetupWizard;
