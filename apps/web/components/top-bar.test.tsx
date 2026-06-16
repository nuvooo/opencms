import TopBar from '@/components/top-bar';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@repo/shadcn/mode-switcher', () => ({
  ModeSwitcher: () => <div>ModeSwitcher</div>,
}));

describe('TopBar', () => {
  it('rendert immer den ModeSwitcher', () => {
    render(<TopBar />);
    expect(screen.getByText('ModeSwitcher')).toBeDefined();
  });

  it('rendert start- und end-Slots', () => {
    render(<TopBar start={<span>LEFT</span>} end={<span>RIGHT</span>} />);
    expect(screen.getByText('LEFT')).toBeDefined();
    expect(screen.getByText('RIGHT')).toBeDefined();
    expect(screen.getByText('ModeSwitcher')).toBeDefined();
  });
});
