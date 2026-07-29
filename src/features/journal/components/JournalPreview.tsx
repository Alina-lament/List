import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface JournalPreviewProps {
  content: string
  className?: string
  placeholder?: string
}

export function JournalPreview({ content, className = '', placeholder = '暂无内容' }: JournalPreviewProps) {
  return (
    <div className={`h-full overflow-y-auto px-5 py-4 ${className}`}>
      {content.trim() ? (
        <div className="prose prose-sm max-w-none text-ink prose-headings:text-ink prose-p:text-ink prose-strong:text-ink prose-code:rounded prose-code:bg-canvas-2 prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:text-ink-2 prose-pre:bg-canvas-2 prose-pre:p-4 prose-blockquote:border-l-royal prose-blockquote:text-ink-2 prose-a:text-royal hover:prose-a:text-royal-dark">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      ) : (
        <p className="text-sm italic text-ink-3">{placeholder}</p>
      )}
    </div>
  )
}
