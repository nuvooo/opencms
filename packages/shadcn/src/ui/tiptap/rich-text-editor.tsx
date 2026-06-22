'use client';
import { cn } from '@repo/shadcn/lib/utils';
import { defaultExtensions } from '@repo/shadcn/tiptap/extensions/extension';
import { TipTapFloatingMenu } from '@repo/shadcn/tiptap/extensions/floating-menu';
import { CodeLanguage } from '@repo/shadcn/tiptap/toolbars/code-language';
import { EditorToolbar } from '@repo/shadcn/tiptap/toolbars/editor-toolbar';
import { TableMenu } from '@repo/shadcn/tiptap/toolbars/table-menu';
import { EditorContent, type Extension, useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import './tiptap.css';

interface RichTextEditorProps {
  className?: string;
  content?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  className,
  content = '',
  onChange,
  editable = true,
  minHeight = '200px',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: defaultExtensions as Extension[],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose-article',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  // Keep the editor in sync when the `content` prop arrives or changes after
  // mount (e.g. async-loaded entries). Without this the editor stays empty and
  // saving would overwrite the stored value with blank HTML. `false` keeps
  // setContent from firing onUpdate, avoiding a feedback loop.
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn('relative w-full bg-card overflow-hidden', className)}>
      <TableMenu editor={editor} />
      <CodeLanguage editor={editor} />
      <EditorToolbar editor={editor} />
      <TipTapFloatingMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="min-w-full cursor-text p-3 md:p-6 no-scrollbar lg:p-12"
        style={{ minHeight }}
      />
    </div>
  );
}
