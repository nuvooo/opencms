# Globaler Theme-Umschalter via TopBar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bestehenden Dark/Light-`ModeSwitcher` über eine wiederverwendbare `TopBar`-Komponente auf jeder Route (Admin, Home, Profil, Auth) erreichbar machen.

**Architecture:** Eine neue, rein präsentationale `TopBar`-Komponente (`apps/web/components/top-bar.tsx`) umschließt den vorhandenen `ModeSwitcher` und bietet `start`/`end`-Slots. Sie wird in die Section-Chrome eingehängt. Theming-Mechanik (`ThemeProvider`, `.dark`-CSS, `ModeSwitcher`) bleibt unverändert.

**Tech Stack:** Next.js (App Router), React, Tailwind, next-themes, Vitest + @testing-library/react.

---

## Datei-Struktur

- **Neu:** `apps/web/components/top-bar.tsx` — präsentationale Header-Hülle, rendert `ModeSwitcher` rechts.
- **Neu:** `apps/web/components/top-bar.test.tsx` — Render-Test.
- **Neu:** `apps/web/app/auth/layout.tsx` — Auth-Layout mit minimaler TopBar.
- **Ändern:** `apps/web/app/admin/layout.tsx` — TopBar oben im `<main>`.
- **Ändern:** `apps/web/components/admin-sidebar.tsx` — `ModeSwitcher` in die Mobile-Topbar.
- **Ändern:** `apps/web/app/(home)/page.tsx` — `<nav>` auf TopBar umstellen.
- **Ändern:** `apps/web/app/(home)/page.test.tsx` — Test an neue Struktur anpassen.
- **Ändern:** `apps/web/app/[username]/page.tsx` — TopBar über `ProfileHeader`.

---

### Task 1: TopBar-Komponente

**Files:**

- Create: `apps/web/components/top-bar.tsx`
- Test: `apps/web/components/top-bar.test.tsx`

- [ ] **Step 1: Failing-Test schreiben**

```tsx
// apps/web/components/top-bar.test.tsx
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `pnpm --filter web exec vitest run components/top-bar.test.tsx`
Expected: FAIL — `Cannot find module '@/components/top-bar'`.

- [ ] **Step 3: Komponente implementieren**

```tsx
// apps/web/components/top-bar.tsx
import { cn } from '@repo/shadcn/lib/utils';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { ReactNode } from 'react';

type TopBarProps = {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
};

const TopBar = ({ start, end, className }: TopBarProps) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6',
        className,
      )}
    >
      {start}
      <div className="ml-auto flex items-center gap-2">
        {end}
        <ModeSwitcher />
      </div>
    </header>
  );
};

export default TopBar;
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `pnpm --filter web exec vitest run components/top-bar.test.tsx`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/top-bar.tsx apps/web/components/top-bar.test.tsx
git commit -m "feat(web): add reusable TopBar with theme switcher"
```

---

### Task 2: Admin-Layout (Desktop-Header)

**Files:**

- Modify: `apps/web/app/admin/layout.tsx`

- [ ] **Step 1: TopBar in `<main>` einhängen**

Import oben ergänzen:

```tsx
import TopBar from '@/components/top-bar';
```

`<main>` so anpassen, dass die TopBar erstes Kind ist (nur Desktop sichtbar, da Mobile in Task 3 abgedeckt wird):

```tsx
<main className="lg:pl-64 pt-14 lg:pt-0">
  <TopBar className="hidden lg:flex" />
  <TenantTabs />
  <div className="p-6">{children}</div>
</main>
```

- [ ] **Step 2: Typen prüfen**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler bzgl. `top-bar`/`admin/layout`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/layout.tsx
git commit -m "feat(web): add TopBar to admin desktop layout"
```

---

### Task 3: Admin-Sidebar (Mobile-Switcher)

**Files:**

- Modify: `apps/web/components/admin-sidebar.tsx`

- [ ] **Step 1: ModeSwitcher importieren**

Import oben ergänzen:

```tsx
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
```

- [ ] **Step 2: Switcher rechts in die Mobile-Topbar setzen**

Den mobilen Balken so ändern, dass der Titel-`<span>` den Platz füllt und der Switcher rechts steht:

```tsx
<div className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-background px-4 py-3 flex items-center">
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon">
        <Menu className="size-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-64 p-4 flex flex-col">
      <div className="font-semibold text-lg">CMS Admin</div>
      <NavContent mobile />
      <div className="mt-auto space-y-2">
        <TenantSelector />
        {user && (
          <div className="border-t pt-2">
            <Link
              href="/admin/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <User className="size-4 shrink-0" />
              <div className="truncate min-w-0">
                <p className="truncate">{user.name || 'User'}</p>
                <p className="text-xs truncate text-muted-foreground/60">
                  {user.email}
                </p>
              </div>
            </Link>
            <SignOut />
          </div>
        )}
      </div>
    </SheetContent>
  </Sheet>
  <span className="ml-3 font-semibold">CMS Admin</span>
  <div className="ml-auto">
    <ModeSwitcher />
  </div>
</div>
```

(Nur die letzten beiden Zeilen vor dem schließenden `</div>` sind neu: der `ml-auto`-Wrapper mit `ModeSwitcher`.)

- [ ] **Step 3: Typen prüfen**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin-sidebar.tsx
git commit -m "feat(web): add theme switcher to admin mobile topbar"
```

---

### Task 4: Home-Page auf TopBar umstellen

**Files:**

- Modify: `apps/web/app/(home)/page.tsx`
- Modify: `apps/web/app/(home)/page.test.tsx`

Verhaltenswahrender Refactor: alt wie neu rendert den `ModeSwitcher`. Der bestehende Test prüft zusätzlich einen `video-player`, den die Seite längst nicht mehr rendert — er wird auf die reale Struktur reduziert.

- [ ] **Step 1: `<nav>` durch TopBar ersetzen**

In `apps/web/app/(home)/page.tsx` den Import von `ModeSwitcher` entfernen und `TopBar` importieren:

```tsx
import TopBar from '@/components/top-bar';
import LogoIcon from '@/components/logo-icon';
import Session from '@/components/session';
```

Die bestehende `<nav>…</nav>` ersetzen durch:

```tsx
<TopBar
  start={
    <Link href="/">
      <LogoIcon width={30} height={30} />
    </Link>
  }
  end={<Session />}
/>
```

(Der separate `import { ModeSwitcher } from '@repo/shadcn/mode-switcher';` entfällt, da nicht mehr direkt genutzt.)

- [ ] **Step 2: Home-Test an neue Struktur anpassen**

```tsx
// apps/web/app/(home)/page.test.tsx
import Page from '@/app/(home)/page';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@repo/shadcn/mode-switcher', () => ({
  ModeSwitcher: () => <div>ModeSwitcher</div>,
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
```

- [ ] **Step 3: Test ausführen, Erfolg bestätigen**

Run: `pnpm --filter web exec vitest run "app/(home)/page.test.tsx"`
Expected: PASS (1 Test). Falls FAIL wegen nicht gemocktem `@/auth`/`redirect`: Mock aus Step 2 prüfen.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(home)/page.tsx" "apps/web/app/(home)/page.test.tsx"
git commit -m "refactor(web): use shared TopBar on home page"
```

---

### Task 5: Auth-Layout mit minimaler TopBar

**Files:**

- Create: `apps/web/app/auth/layout.tsx`

- [ ] **Step 1: Auth-Layout anlegen**

```tsx
// apps/web/app/auth/layout.tsx
import TopBar from '@/components/top-bar';
import { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      {children}
    </div>
  );
};

export default AuthLayout;
```

- [ ] **Step 2: Typen prüfen**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/auth/layout.tsx
git commit -m "feat(web): add minimal TopBar to auth layout"
```

---

### Task 6: Profil-Seite

**Files:**

- Modify: `apps/web/app/[username]/page.tsx`

- [ ] **Step 1: TopBar als erstes Element der Section einhängen**

Import ergänzen:

```tsx
import TopBar from '@/components/top-bar';
```

Die `<TopBar />` als erstes Kind von `<section>` direkt vor `<BackNavigation />` setzen:

```tsx
    <section className="min-h-screen bg-background">
      <TopBar />
      <BackNavigation />
```

- [ ] **Step 2: Typen prüfen**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[username]/page.tsx"
git commit -m "feat(web): add TopBar to profile page"
```

---

### Task 7: Gesamtverifikation

- [ ] **Step 1: Alle Web-Tests**

Run: `pnpm --filter web test`
Expected: PASS (inkl. `top-bar.test.tsx` und `page.test.tsx`).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Manuelle Sicht (Dev-Server)**

Run: `pnpm --filter web dev`
Prüfen:

1. Umschalter sichtbar auf Home, Admin (Desktop + Mobile), Profil, Auth.
2. Umschalten wechselt Theme; Wahl überlebt Reload.
3. Kein doppelter Umschalter auf Home.
4. Kein doppelter Header auf Admin-Mobile.

```

```
