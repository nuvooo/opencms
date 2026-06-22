import SetupWizard from '@/components/setup/setup-wizard';
import { bootstrapSetup, validateSetupDb } from '@/server/setup.server';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedUseAction, pushMock } = vi.hoisted(() => ({
  mockedUseAction: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('next-safe-action/hooks', () => ({
  useAction: mockedUseAction,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/server/setup.server', () => ({
  validateSetupDb: vi.fn(),
  bootstrapSetup: vi.fn(),
}));

describe('SetupWizard', () => {
  let validateOnSuccess: (() => void) | undefined;
  let bootstrapOnSuccess: (() => void) | undefined;

  const validateAction = {
    execute: vi.fn(),
    isExecuting: false,
    result: {},
  };
  const bootstrapAction = {
    execute: vi.fn(),
    isExecuting: false,
    result: {},
  };

  beforeEach(() => {
    mockedUseAction.mockReset();
    validateAction.execute.mockReset();
    validateAction.execute.mockImplementation(() => {
      validateOnSuccess?.();
    });
    validateAction.isExecuting = false;
    validateAction.result = {};
    bootstrapAction.execute.mockReset();
    bootstrapAction.execute.mockImplementation(() => {
      bootstrapOnSuccess?.();
    });
    bootstrapAction.isExecuting = false;
    bootstrapAction.result = {};

    mockedUseAction.mockImplementation((action, options) => {
      if (action === validateSetupDb) {
        validateOnSuccess = options?.onSuccess;
        return validateAction;
      }
      if (action === bootstrapSetup) {
        bootstrapOnSuccess = options?.onSuccess;
        return bootstrapAction;
      }
      return {
        execute: vi.fn(),
        isExecuting: false,
        result: {},
      };
    });
  });

  it('shows one-time warning and follows intro -> database -> admin -> review -> completion', async () => {
    render(<SetupWizard />);

    expect(screen.getByText(/only be run once/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/database settings/i)).toBeDefined();

    // The database name is required before a connection can be validated.
    fireEvent.change(screen.getByLabelText(/database name/i), {
      target: { value: 'cms' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /validate connection/i }),
    );
    expect(validateAction.execute).toHaveBeenCalledWith({
      type: 'postgres',
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: '',
      name: 'cms',
      database: './data/cms.sqlite',
      ssl: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/first admin account/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/review setup/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/auth secret/i), {
      target: { value: 'supersecret-123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    expect(bootstrapAction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: {
          email: 'admin@example.com',
          password: 'Password123!',
        },
      }),
    );
    expect(await screen.findByText(/installation completed/i)).toBeDefined();
  });

  it('surfaces zod validation inline and blocks advancing on a weak admin password', async () => {
    render(<SetupWizard />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByText(/database settings/i);
    fireEvent.change(screen.getByLabelText(/database name/i), {
      target: { value: 'cms' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /validate connection/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    await screen.findByText(/first admin account/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'weak' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    // The zod message is shown in the UI and the review step is not reached.
    // "Use at least 8 characters" disambiguates from the field's helper text.
    expect(await screen.findByText(/use at least 8 characters/i)).toBeDefined();
    expect(screen.queryByText(/review setup/i)).toBeNull();
  });

  it('blocks DB validation and shows a required-field error when the name is empty', async () => {
    render(<SetupWizard />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByText(/database settings/i);
    fireEvent.click(
      screen.getByRole('button', { name: /validate connection/i }),
    );

    expect(await screen.findByText(/enter a database name/i)).toBeDefined();
    expect(validateAction.execute).not.toHaveBeenCalled();
  });

  it('shows backend validation error when DB preflight fails', () => {
    validateAction.result = { serverError: 'Database connection failed' };

    render(<SetupWizard />);

    expect(screen.getByText(/database connection failed/i)).toBeDefined();
  });
});
