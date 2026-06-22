import Page from '@/app/setup/page';
import { getSetupStatus } from '@/server/setup.server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock('@/server/setup.server', () => ({
  getSetupStatus: vi.fn(),
}));

vi.mock('@/components/setup/setup-wizard', () => ({
  default: () => <h1>One-time setup</h1>,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('Setup page guard', () => {
  it('renders setup page when uninitialized', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      initialized: false,
      inProgress: false,
    });

    render(await Page());

    expect(screen.getByText(/one-time setup/i)).toBeDefined();
  });

  it('redirects to sign-in when already initialized', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      initialized: true,
      inProgress: false,
    });

    await Page();

    expect(redirectMock).toHaveBeenCalledWith('/auth/sign-in');
  });
});
