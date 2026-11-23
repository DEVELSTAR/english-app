import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-chat-content text-xs leading-relaxed space-y-2 text-slate-800
        [&>h1]:text-sm [&>h1]:font-black [&>h1]:text-slate-900 [&>h1]:mt-3 [&>h1]:mb-1.5
        [&>h2]:text-xs [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:mt-2.5 [&>h2]:mb-1
        [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-brand-700 [&>h3]:mt-2.5 [&>h3]:mb-1
        [&>p]:my-1.5 [&>p]:leading-relaxed
        [&>ul]:my-1.5 [&>ul]:space-y-1 [&>ul]:pl-4 [&>ul]:list-disc
        [&>ol]:my-1.5 [&>ol]:space-y-1 [&>ol]:pl-4 [&>ol]:list-decimal
        [&>li]:leading-relaxed
        [&>hr]:my-2.5 [&>hr]:border-slate-200
        [&_strong]:font-bold [&_strong]:text-slate-900
        [&_em]:italic [&_em]:text-slate-700
        [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-slate-100 [&_code]:rounded-md [&_code]:text-brand-700 [&_code]:font-mono [&_code]:text-[11px]
        [&_blockquote]:border-l-2 [&_blockquote]:border-brand-500 [&_blockquote]:pl-2.5 [&_blockquote]:py-1 [&_blockquote]:text-slate-600 [&_blockquote]:italic [&_blockquote]:bg-slate-50 [&_blockquote]:rounded-r-md
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
