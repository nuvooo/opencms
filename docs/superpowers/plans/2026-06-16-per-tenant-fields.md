# Per-Tenant Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Beim Anlegen eines Mandanten dessen Content-Types einmalig aus einem Template-Mandanten kopieren; (B) im Entry-Editor Felder pro Entry an-/ausschalten, ausgeschaltete fehlen in Speicherung und API-Output.

**Architecture:** Schema-pro-Mandant (PostgreSQL). Part A: `is_template`-Flag auf `public.tenant` + Kopie via `INSERT…SELECT` über Schemas bei der Erstellung. Part B: Toggle = An-/Abwesenheit des Feld-Keys in `entry.fields` (JSON), rein im Frontend.

**Tech Stack:** NestJS + TypeORM (raw SQL via `TenantDbService`), Next.js (App Router, Client-Komponenten), shadcn UI (Switch/Badge), Vitest.

---

## Part A — Template-Mandant → einmalige Kopie (Backend + Admin-UI)

### Task A1: `is_template`-Spalte auf Tenant

**Files:**

- Modify: `apps/api/src/tenants/tenant.entity.ts`
- Modify: `apps/api/src/common/services/tenant-db.service.ts` (idempotente Spalten-Migration in `migrateExistingTenants`)

- [ ] **Step 1: Entity-Spalte ergänzen**

In `tenant.entity.ts` nach `locales`:

```ts
  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;
```

- [ ] **Step 2: Idempotente DB-Migration**

In `tenant-db.service.ts`, in `migrateExistingTenants()` (vor der `for`-Schleife, direkt nach dem `SELECT schema_name`), eine `ALTER TABLE` ergänzen:

```ts
await this.dataSource.query(
  `ALTER TABLE public.tenant ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false`,
);
```

- [ ] **Step 3: Build/Typecheck**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: keine neuen Fehler zu `tenant.entity`/`tenant-db.service`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/tenants/tenant.entity.ts apps/api/src/common/services/tenant-db.service.ts
git commit -m "feat(api): add is_template flag to tenant"
```

---

### Task A2: `copyContentTypes` im TenantDbService

**Files:**

- Modify: `apps/api/src/common/services/tenant-db.service.ts`

- [ ] **Step 1: Methode hinzufügen** (neben `createTenantSchema`)

```ts
  async copyContentTypes(fromSchema: string, toSchema: string): Promise<void> {
    this.validateSchemaName(fromSchema);
    this.validateSchemaName(toSchema);
    await this.dataSource.query(`
      INSERT INTO "${toSchema}"."content_type" (id, name, slug, description, fields, created_at, updated_at)
      SELECT gen_random_uuid(), name, slug, description, fields, now(), now()
      FROM "${fromSchema}"."content_type"
      ON CONFLICT (slug) DO NOTHING
    `);
  }
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/services/tenant-db.service.ts
git commit -m "feat(api): copyContentTypes across tenant schemas"
```

---

### Task A3: Single-Template-Invariante + Kopie bei Create

**Files:**

- Modify: `apps/api/src/tenants/tenants.service.ts`

- [ ] **Step 1: Beim Create vom Template kopieren**

In `create()` nach `await this.tenantDb.createTenantSchema(schemaName);` und vor dem `save`:

```ts
const template = await this.tenantRepo.findOneBy({ isTemplate: true });
if (template) {
  await this.tenantDb.copyContentTypes(template.schemaName, schemaName);
}
```

- [ ] **Step 2: Single-Template-Invariante im Update**

`update()` so anpassen, dass beim Setzen von `isTemplate = true` alle anderen zurückgesetzt werden:

```ts
  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    if (dto.isTemplate === true && !tenant.isTemplate) {
      await this.tenantRepo.update({ isTemplate: true }, { isTemplate: false });
    }
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }
```

- [ ] **Step 3: DTO erlaubt `isTemplate`**

In `apps/api/src/tenants/dto/update-tenant.dto.ts` sicherstellen, dass `isTemplate?: boolean` (validiert, optional) zulässig ist. Falls das DTO `PartialType(CreateTenantDto)` nutzt: in `create-tenant.dto.ts` ein optionales `@IsBoolean() @IsOptional() isTemplate?: boolean;` ergänzen (Datei vorher lesen, Validator-Imports prüfen).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tenants/
git commit -m "feat(api): seed new tenant content types from template tenant"
```

---

### Task A4: Tenants-Admin-UI — Template markieren

**Files:**

- Modify: `apps/web/types/tenant.type.ts` (Feld `isTemplate`)
- Modify: `apps/web/server/tenant.server.ts` (Action `setTemplateTenant`)
- Modify: `apps/web/app/admin/tenants/tenants-table.tsx` (Spalte + Toggle)

- [ ] **Step 1: Typ erweitern**

In `tenant.type.ts` das Tenant-Schema/Type um `isTemplate: z.boolean().optional()` (bzw. `boolean`) ergänzen — Datei vorher lesen, an bestehende Zod/Type-Struktur anpassen.

- [ ] **Step 2: Server-Action**

In `tenant.server.ts` eine Action ergänzen, die die bestehende Update-Route nutzt (analog zu vorhandenem `updateTenant`/`deleteTenant` — Datei vorher lesen für das Fetch-Pattern):

```ts
export const setTemplateTenant = async (id: string) => {
  // PATCH /tenants/:id { isTemplate: true } über den vorhandenen safeFetch/Action-Helper
};
```

- [ ] **Step 3: UI — Template-Spalte + Aktion**

In `tenants-table.tsx`: neue Spalte „Template". Pro Zeile ein Badge wenn `tenant.isTemplate`, sonst ein Button „Als Template" der `setTemplateTenant(tenant.id)` aufruft und danach `router.refresh()`. Import `Badge` ist bereits vorhanden.

```tsx
<td className="px-4 py-3 text-sm">
  {tenant.isTemplate ? (
    <Badge>Template</Badge>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={async () => {
        await setTemplateTenant(tenant.id);
        toast.success(`${tenant.name} ist jetzt Template`);
        router.refresh();
      }}
    >
      Als Template
    </Button>
  )}
</td>
```

(Passenden `<th>Template</th>` im Header ergänzen.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler in den geänderten Dateien.

- [ ] **Step 5: Commit**

```bash
git add apps/web/types/tenant.type.ts apps/web/server/tenant.server.ts apps/web/app/admin/tenants/tenants-table.tsx
git commit -m "feat(web): mark a tenant as template in tenants admin"
```

---

## Part B — Feld-Toggle pro Entry (Frontend)

> Backend unverändert: `entry.fields` ist Freiform-JSON; `entries.service.create/update` speichert genau das übergebene Objekt. Ausgeschaltete Felder werden nicht in den Payload geschrieben → fehlen automatisch in Speicherung und API-Output.

### Task B1: Toggle im Create-Formular

**Files:**

- Modify: `apps/web/app/admin/entries/create/page.tsx`

- [ ] **Step 1: Enabled-State**

Neben `fields`:

```tsx
const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
```

Default „an": beim Setzen des Content-Types (im `useEffect`/bei `currentCt`-Wechsel) fehlende Keys als `true` behandeln. Helfer:

```tsx
const isFieldEnabled = (name: string) => enabledFields[name] !== false;
const toggleField = (name: string) =>
  setEnabledFields((p) => ({ ...p, [name]: p[name] === false ? true : false }));
```

- [ ] **Step 2: Switch je Feld + Input nur wenn aktiv**

Im `currentCt.fields.map(...)`-Block den Label-Kopf um einen Switch ergänzen und das Input nur bei aktivem Feld rendern (Import `Switch` aus `@repo/shadcn/switch`):

```tsx
<div key={field.name} className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>
      {field.label || field.name}
      {field.options?.required && isFieldEnabled(field.name) && (
        <span className="text-destructive ml-1">*</span>
      )}
    </Label>
    <Switch
      checked={isFieldEnabled(field.name)}
      onCheckedChange={() => toggleField(field.name)}
    />
  </div>
  {isFieldEnabled(field.name) && renderFieldInput(field)}
</div>
```

- [ ] **Step 3: Validierung überspringt deaktivierte Felder**

In `validate()` zu Beginn der Schleife:

```tsx
    for (const f of currentCt.fields) {
      if (enabledFields[f.name] === false) continue;
      const val = fields[f.name];
      ...
```

- [ ] **Step 4: Payload nur aktive Felder**

In `handleSubmit`, vor `createEntry`, den Payload bauen:

```tsx
const activeFields = Object.fromEntries(
  currentCt!.fields
    .filter((f) => enabledFields[f.name] !== false)
    .map((f) => [f.name, fields[f.name] ?? null]),
);
```

und im `createEntry`-Aufruf `fields: activeFields` statt `fields` verwenden. (Relations-Schleife unverändert, prüft `enabledFields` analog: deaktivierte m2o/m2m überspringen.)

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/admin/entries/create/page.tsx"
git commit -m "feat(web): per-entry field on/off toggle on entry create"
```

---

### Task B2: Toggle im Edit-Formular + Init aus vorhandenen Keys

**Files:**

- Modify: `apps/web/app/admin/entries/[id]/edit/page.tsx`

> Datei zuerst vollständig lesen — sie spiegelt das Create-Formular. Dieselben Änderungen wie B1 anwenden, plus die Initialisierung des Toggle-Zustands aus dem geladenen Entry.

- [ ] **Step 1: B1-Änderungen übernehmen** (Switch, `isFieldEnabled`/`toggleField`, Validierung-`continue`, Payload-Filter beim Update).

- [ ] **Step 2: enabledFields aus geladenem Entry initialisieren**

Beim Laden des Entry: ein im Content-Type definiertes Feld gilt als aktiv, wenn sein Key in `entry.fields` vorhanden ist (auch leer), sonst als deaktiviert.

```tsx
const init: Record<string, boolean> = {};
for (const f of loadedCt.fields) {
  init[f.name] = Object.prototype.hasOwnProperty.call(
    entry.fields ?? {},
    f.name,
  );
}
setEnabledFields(init);
```

(Exakte Variablennamen `loadedCt`/`entry` an die in der Datei vorhandenen anpassen.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: keine neuen Fehler.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/admin/entries/[id]/edit/page.tsx"
git commit -m "feat(web): per-entry field toggle on entry edit, init from stored keys"
```

---

## Gesamtverifikation (manuell)

1. Mandant als Template markieren (genau einer), Content-Types darin anlegen.
2. Neuen Mandanten erstellen → identische Content-Types/Felder als unabhängige Kopie. Ohne Template → leer.
3. Zweiten Mandanten als Template markieren → erster verliert das Badge (Single-Invariante).
4. Entry-Editor: Feld ausschalten + speichern → Feld fehlt in der gespeicherten Entry/API-Antwort; beim erneuten Öffnen ist das Toggle aus.
5. Aktives, leeres Feld bleibt nach Reload aktiv (Key vorhanden, Wert `null`/`""`).

## Self-Review-Notiz

- Backend-Validierung der Entry-`fields`: bestätigt unkritisch (Freiform-JSON, kein server-seitiges `required`).
- DTO-/Type-/Server-Action-Dateien jeweils vor dem Edit lesen (Struktur variiert) — keine Annahmen über Validator-/Fetch-Helfer.
