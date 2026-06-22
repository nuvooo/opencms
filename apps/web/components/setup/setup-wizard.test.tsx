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

    fireEvent.click(
      screen.getByRole('button', { name: /validate connection/i }),
    );
    expect(validateAction.execute).toHaveBeenCalledWith({
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: '',
      name: '',
      ssl: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/first admin account/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/review setup/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/auth secret/i), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    expect(bootstrapAction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: {
          email: 'admin@example.com',
          password: 'password123',
        },
      }),
    );
    expect(await screen.findByText(/installation completed/i)).toBeDefined();
  });

  it('shows backend validation error when DB preflight fails', () => {
    validateAction.result = { serverError: 'Database connection failed' };

    render(<SetupWizard />);

    expect(screen.getByText(/database connection failed/i)).toBeDefined();
  });
});
