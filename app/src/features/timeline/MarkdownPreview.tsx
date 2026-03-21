import ReactMarkdown from 'react-markdown'

export function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-text-muted text-sm italic">Empty scene — click edit to add content.</p>
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        children={content}
        components={{
          h1: ({ children }) => <h1 className="text-xl text-text-heading font-semibold mb-3 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg text-text-heading font-semibold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base text-text-heading font-medium mb-2 mt-3">{children}</h3>,
          p: ({ children }) => <p className="text-text-body text-sm leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-sm text-text-body mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-text-body mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-text-body">{children}</li>,
          strong: ({ children }) => <strong className="text-text-heading font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-bg-raised px-1.5 py-0.5 rounded text-xs font-mono text-primary-light">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-bg-raised rounded-[--radius-md] p-3 text-xs font-mono overflow-x-auto mb-2">{children}</pre>
          ),
          hr: () => <hr className="border-border my-4" />,
          // Read-aloud blockquotes — the TTRPG convention
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary pl-4 py-2 my-3 bg-primary-ghost rounded-r-[--radius-md] italic text-text-heading">
              {children}
            </blockquote>
          ),
        }}
      />
    </div>
  )
}
