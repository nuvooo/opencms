# Design: Globaler Dark/Light-Umschalter über eine gemeinsame TopBar

**Datum:** 2026-06-16
**Status:** Entwurf zur Freigabe

## Ziel

Den Dark/Light-Mode-Umschalter auf jeder Route der Web-App erreichbar machen,
über eine einzige wiederverwendbare `TopBar`-Komponente statt mehrerer
duplizierter Einbauten.

## Ausgangslage (bereits vorhanden)

Die Theming-Mechanik existiert vollständig und bleibt unverändert:

- `ThemeProvider` (next-themes) ist in `apps/web/components/providers.tsx`
  verdrahtet: `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- Dark-Mode-CSS-Variablen sind definiert in `packages/shadcn/src/shadcn.css`
  (`@custom-variant dark`, `.dark { … }`) inkl. View-Transition-Animation.
- `ModeSwitcher` (Sonne/Mond-Toggle) existiert in
  `packages/shadcn/src/ui/mode-switcher.tsx` und wird aktuell **nur** auf der
  Home-Page genutzt.

**Problem:** Es gibt keine gemeinsame Chrome-Fläche; jede Sektion hat eigene
Navigation (Admin-Sidebar, Home-Nav, Profil-Header), der Admin-Bereich und die
Auth-Seiten haben gar keinen Umschalter.

## Lösung

### Neue Komponente: `apps/web/components/top-bar.tsx`

Rein präsentational, keine eigene State-Logik, über Slots erweiterbar.

```
sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur
flex items-center gap-3 px-4 lg:px-6
```

Props:

- `start?: ReactNode` — linker Bereich (Logo, Mobile-Menü-Trigger, …)
- `end?: ReactNode` — zusätzliche Aktionen rechts (z. B. `<Session/>`)
- rendert **immer** `<ModeSwitcher/>` ganz rechts (nach `end`)

Der bestehende `ModeSwitcher` bleibt die einzige Quelle der Wahrheit für das
Umschalten; die TopBar ist nur die wiederverwendbare Hülle.

### Einhängepunkte

| Fläche          | Datei                                   | Änderung                                                                                                               |
| --------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Admin**       | `apps/web/app/admin/layout.tsx`         | `<TopBar/>` als erstes Element im `<main>` (Desktop-Header, links leer).                                               |
| **Admin mobil** | `apps/web/components/admin-sidebar.tsx` | `<ModeSwitcher/>` rechts in die bestehende Mobile-Topbar (die den Menü-Trigger enthält).                               |
| **Home**        | `apps/web/app/(home)/page.tsx`          | Bestehende `<nav>` durch `<TopBar start={<LogoIcon/>} end={<Session/>}/>` ersetzen; Inline-`<ModeSwitcher/>` entfällt. |
| **Profil**      | `apps/web/app/[username]/page.tsx`      | `<TopBar/>` über `ProfileHeader`.                                                                                      |
| **Auth**        | `apps/web/app/auth/layout.tsx` (neu)    | Neues Layout mit minimaler `<TopBar/>` (nur Switcher), umschließt alle Auth-Seiten.                                    |

### Designentscheidungen

- **Admin-TopBar links:** leer (nur Umschalter rechts). Breadcrumb/Titel kann
  später ergänzt werden, ist hier bewusst nicht im Scope (YAGNI).
- **Auth-Seiten:** bekommen den Umschalter über ein neues, gemeinsames
  `auth/layout.tsx` — eine Stelle statt fünf Einzelseiten.
- **Mobile Admin:** kein zweiter Balken; der Umschalter wird in die schon
  vorhandene Mobile-Topbar integriert, um doppelte Header zu vermeiden.

## Bewusst NICHT im Scope

- Keine Änderung an `ThemeProvider`, CSS-Variablen oder `ModeSwitcher`-Logik.
- Kein Breadcrumb/Seitentitel in der Admin-TopBar.
- Keine zusätzliche Theme-Auswahl über Light/Dark/System hinaus
  (`AppearanceSettings` auf der Profilseite bleibt unangetastet).

## Manuelle Verifikation

1. Auf Home, Admin (Desktop + Mobile), Profil und einer Auth-Seite ist der
   Umschalter sichtbar und erreichbar.
2. Umschalten wechselt das Theme sichtbar; die Wahl bleibt nach Reload erhalten
   (next-themes-Persistenz).
3. Kein doppelter Umschalter auf der Home-Page.
4. Kein Layout-Bruch (kein doppelter Header) auf Admin-Mobile.
