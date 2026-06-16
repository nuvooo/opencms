import Page from '@/app/(home)/page';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@repo/shadcn/mode-switcher', () => ({
  ModeSwitcher: () => <div>ModeSwitcher</div>,
}));

vi.mock('@repo/shadcn/tiptap/rich-text-editor', () => ({
  RichTextEditor: () => <div>RichTextEditor</div>,
}));

vi.mock('@/components/session', () => ({
  default: () => <div>Session</div>,
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => null),
}));

describe('Home Page', () => {
  it('rendert die TopBar mit ModeSwitcher', async () => {
    render(await Page());
    expect(screen.getByText('ModeSwitcher')).toBeDefined();
  });
});
