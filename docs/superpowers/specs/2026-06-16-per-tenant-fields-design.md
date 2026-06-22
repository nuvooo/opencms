# Design: Mandanten-Feld-Vererbung & Entry-Feld-Toggle

**Datum:** 2026-06-16
**Status:** Entwurf zur Freigabe

## Ziel

Zwei zusammenhängende Fähigkeiten für das Multi-Tenant-CMS:

- **Part A:** Beim Anlegen eines Mandanten werden die Content-Types/Felder **einmalig** aus einem **Template-Mandanten** in das neue Tenant-Schema kopiert. Danach ist jeder Mandant unabhängig (keine Propagation).
- **Part B:** In einem einzelnen Entry lassen sich Felder **an-/ausschalten**. Ausgeschaltete Felder sind im Editor versteckt **und** aus der gespeicherten/ausgelieferten Entry-Repräsentation entfernt.

## Architektur-Ausgangslage (verifiziert im Code)

- **Multi-Tenancy = Schema-pro-Mandant** (PostgreSQL-Schemas, eine DB). `TenantDbService.withTenantDb(schemaName, …)`; `public.tenant` listet Mandanten mit `schema_name`.
- **Tenant-Erstellung** (`tenants.service.ts:21` → `tenantDb.createTenantSchema`): legt Schema + Tabellen `content_type`, `entry`, `relation`, `tenant_locale` an. **Seedet aktuell KEINE Content-Types** — neuer Mandant startet mit leerer `content_type`-Tabelle.
- **content_type**-Tabelle: `id, name, slug, description, fields jsonb (Array), created_at`. Feld-Definition: `{ name, type, label?, options? }`.
- **entry**-Tabelle: `id, content_type_slug, fields jsonb (Objekt `{feld: wert}`), locale, status, locale_group_id, created_at`.

## Part A — Einmalige Kopie vom Template-Mandanten

### Entscheidungen

- Quelle = **ein als Template markierter Mandant** (genau einer aktiv).
- Kopie erfolgt **einmal** bei der Erstellung; danach keine Synchronisierung.

### Umsetzung

1. **Template-Markierung:** Spalte `is_template boolean NOT NULL DEFAULT false` auf `public.tenant` (TypeORM-Entity `tenant.entity.ts` + Migration/`migrateExistingTenants`). Invariante: höchstens ein Mandant mit `is_template = true` — beim Setzen wird ein evtl. vorhandener Template-Mandant zurückgesetzt (im Service, transaktional).
2. **Tenants-Admin-UI:** In der Tenants-Verwaltung (`/admin/tenants`) eine Möglichkeit, einen Mandanten als Template zu markieren (Toggle/Badge „Template"). Genau einer.
3. **Kopier-Logik:** Neue Methode `TenantDbService.copyContentTypes(fromSchema, toSchema)`:
   `INSERT INTO "toSchema"."content_type" (id, name, slug, description, fields, created_at)
SELECT gen_random_uuid(), name, slug, description, fields, now() FROM "fromSchema"."content_type"`.
4. **Hook:** In `tenants.service.create()` nach `createTenantSchema(schemaName)`: Template-Mandant ermitteln (`is_template = true`); falls vorhanden, `copyContentTypes(templateSchema, schemaName)`. Falls kein Template gesetzt → leer (heutiges Verhalten).

### Bewusst NICHT im Scope (Part A)

- Keine nachträgliche Synchronisierung/Propagation von Template-Änderungen.
- Kein Kopieren von Entries (nur Content-Type-Definitionen).

## Part B — Feld-Toggle pro Entry (inkl. Entfernen aus dem Output)

### Entscheidung

- „Aus" = im Editor versteckt **und** aus gespeicherter/ausgelieferter Entry-Repräsentation entfernt.

### Umsetzung (kein DB-Schema-Change nötig)

- Das Toggle wird über **An-/Abwesenheit des Feld-Keys** in `entry.fields` kodiert:
  - **An:** Feld-Key ist in `entry.fields` enthalten (auch bei leerem Wert, z. B. `null`/`""`).
  - **Aus:** Feld-Key fehlt in `entry.fields`.
- **Entry-Editor** (`apps/web/app/admin/entries/create` + `[id]/edit`): pro Feld des Content-Types ein Toggle (Default an). Ausgeschaltet → Feld wird im Formular ausgeblendet, **nicht** validiert (nicht required) und **nicht** in den Payload geschrieben.
- **Beim Öffnen** eines bestehenden Entry: Felder, die in `entry.fields` vorhanden sind → Toggle an; im Content-Type definierte, aber in `entry.fields` fehlende Felder → Toggle aus.
- **Speichern/API:** `entry.fields` enthält nur aktive Felder → API gibt automatisch nur diese zurück. Backend-Validierung darf für fehlende (ausgeschaltete) Felder kein `required` erzwingen (Validierung im Frontend nur über aktive Felder; Backend prüfen, dass `create-entry.dto`/`entries.service` partielle `fields` akzeptiert — Stand heute Freiform-JSON, voraussichtlich ok).

### Unterscheidung „aktiv-aber-leer" vs. „aus"

Der Editor schreibt **aktive** Felder immer in den Payload (auch leer, als `null`/`""`), ausgeschaltete gar nicht. Dadurch bleibt „leer + aktiv" (`{feld: ""}`) eindeutig von „aus" (`Key fehlt`) unterscheidbar.

### Bewusst NICHT im Scope (Part B)

- Keine globale (Content-Type-weite) Feld-Deaktivierung — Toggle ist rein pro Entry.
- Keine Migration bestehender Entries (vorhandene Keys gelten als aktiv).

## Offene Risiken / zu prüfen bei der Planung

- Backend-Validierung der Entry-`fields` (akzeptiert partielle Feldmengen ohne required-Fehler?).
- Tenants-UI: existiert bereits eine Edit-Fläche, in die das Template-Toggle passt?
- Migration der `is_template`-Spalte für bestehende Mandanten (`migrateExistingTenants`).

## Manuelle Verifikation

1. Mandant als Template markieren; Content-Types darin anlegen.
2. Neuen Mandanten erstellen → er besitzt dieselben Content-Types/Felder (Kopie), unabhängig editierbar.
3. Ohne gesetztes Template → neuer Mandant startet leer.
4. Im Entry-Editor ein Feld ausschalten, speichern → Feld fehlt in gespeichertem Entry und in der API-Antwort; beim erneuten Öffnen ist das Toggle aus.
5. Aktives, leeres Feld bleibt nach Reload aktiv (nicht fälschlich als „aus" interpretiert).
