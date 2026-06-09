'use client';

import { ContentType, ContentTypeField } from '@/types/content-type.type';

interface EntryPreviewProps {
  fields: Record<string, unknown>;
  contentType: ContentType;
}

const renderFieldValue = (field: ContentTypeField, value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  switch (field.type) {
    case 'rich_text':
      return (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: value as string }}
        />
      );
    case 'image':
      return value ? (
        <img
          src={`/assets/${value}`}
          alt={field.label || field.name}
          className="max-w-full h-auto rounded-lg border max-h-64 object-cover"
        />
      ) : null;
    case 'boolean':
      return value ? (
        <span className="text-green-600 font-medium">Yes</span>
      ) : (
        <span className="text-muted-foreground">No</span>
      );
    case 'number':
      return <span className="font-mono">{String(value)}</span>;
    case 'date':
    case 'datetime':
    case 'time':
      return <span className="font-mono text-sm">{String(value)}</span>;
    case 'select':
      return (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {String(value)}
        </span>
      );
    case 'slug':
    case 'email':
    case 'url':
    case 'phone':
      return <span className="text-sm">{String(value)}</span>;
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <div
            className="size-4 rounded border"
            style={{ backgroundColor: String(value || '#000') }}
          />
          <span className="text-sm">{String(value)}</span>
        </div>
      );
    case 'json':
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    case 'm2o':
    case 'o2m':
    case 'm2m':
      return (
        <span className="text-sm text-muted-foreground italic">
          Relationship field
        </span>
      );
    default:
      return <span>{String(value)}</span>;
  }
};

const EntryPreview = ({ fields, contentType }: EntryPreviewProps) => {
  return (
    <div className="space-y-6">
      {contentType.fields.map((field) => {
        const value = fields[field.name];
        return (
          <div key={field.name}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {field.label || field.name}
              {field.options?.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </p>
            <div className="text-sm">{renderFieldValue(field, value)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default EntryPreview;
