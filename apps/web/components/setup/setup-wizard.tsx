'use client';

import { bootstrapSetup, validateSetupDb } from '@/server/setup.server';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Step = 0 | 1 | 2 | 3 | 4;

const SetupWizard = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [dbValidated, setDbValidated] = useState(false);
  const [form, setForm] = useState({
    app: {
      allowCorsUrl: 'http://localhost:3000',
      authSecret: '',
      authUrl: 'http://localhost:3000',
    },
    database: {
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: '',
      name: '',
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

  const canSubmitBootstrap = useMemo(() => {
    return (
      Boolean(form.app.authSecret) &&
      Boolean(form.admin.email) &&
      Boolean(form.admin.password)
    );
  }, [form]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">One-time setup</h1>
      <p className="text-sm text-muted-foreground">
        This installer can only be run once.
      </p>

      {backendError && <p className="text-sm text-red-500">{backendError}</p>}

      {step === 0 && (
        <section className="space-y-4">
          <p>
            Welcome. We will configure database and create your first admin.
          </p>
          <button type="button" onClick={() => setStep(1)}>
            Continue
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Database settings</h2>

          <label className="block">
            <span>Host</span>
            <input
              value={form.database.host}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, host: event.target.value },
                }));
              }}
            />
          </label>

          <label className="block">
            <span>Port</span>
            <input
              value={form.database.port}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, port: event.target.value },
                }));
              }}
            />
          </label>

          <label className="block">
            <span>Username</span>
            <input
              value={form.database.username}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, username: event.target.value },
                }));
              }}
            />
          </label>

          <label className="block">
            <span>Password</span>
            <input
              type="password"
              value={form.database.password}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, password: event.target.value },
                }));
              }}
            />
          </label>

          <label className="block">
            <span>Database name</span>
            <input
              value={form.database.name}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, name: event.target.value },
                }));
              }}
            />
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.database.ssl}
              onChange={(event) => {
                setDbValidated(false);
                setForm((prev) => ({
                  ...prev,
                  database: { ...prev.database, ssl: event.target.checked },
                }));
              }}
            />
            <span>Use SSL</span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => validateDbAction.execute(form.database)}
              disabled={validateDbAction.isExecuting}
            >
              Validate connection
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!dbValidated}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">First admin account</h2>

          <label className="block">
            <span>Email</span>
            <input
              value={form.admin.email}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  admin: { ...prev.admin, email: event.target.value },
                }));
              }}
            />
          </label>

          <label className="block">
            <span>Password</span>
            <input
              type="password"
              value={form.admin.password}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  admin: { ...prev.admin, password: event.target.value },
                }));
              }}
            />
          </label>

          <button type="button" onClick={() => setStep(3)}>
            Next
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Review setup</h2>

          <p className="text-sm">
            Database: {form.database.host}:{form.database.port}/
            {form.database.name || '-'}
          </p>
          <p className="text-sm">Admin: {form.admin.email || '-'}</p>

          <label className="block">
            <span>Auth secret</span>
            <input
              type="password"
              value={form.app.authSecret}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  app: { ...prev.app, authSecret: event.target.value },
                }));
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => bootstrapAction.execute(form)}
            disabled={!canSubmitBootstrap || bootstrapAction.isExecuting}
          >
            Install
          </button>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Installation completed</h2>
          <p>You can now sign in with your admin account.</p>
          <button type="button" onClick={() => router.push('/auth/sign-in')}>
            Go to sign-in
          </button>
        </section>
      )}
    </div>
  );
};

export default SetupWizard;
