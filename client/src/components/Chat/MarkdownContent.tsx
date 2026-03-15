import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import './Markdown.css';

interface MarkdownContentProps {
  content: string;
  /** When true, renders plain-text-style (for live streaming preview) */
  plain?: boolean;
}

export default function MarkdownContent({ content, plain }: MarkdownContentProps) {
  if (plain) {
    return <span className="markdown-plain">{content}</span>;
  }

  const components: Components = {
    // Code blocks with syntax highlighting
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const inline = !match && !className;

      if (inline) {
        return (
          <code className="md-inline-code" {...props}>
            {children}
          </code>
        );
      }

      const language = match?.[1] || 'text';
      const codeString = String(children).replace(/\n$/, '');

      return (
        <div className="md-code-block">
          <div className="md-code-block__header">
            <span className="md-code-block__lang">{language}</span>
            <button
              className="md-code-block__copy"
              onClick={() => navigator.clipboard.writeText(codeString)}
              title="Copy code"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneLight}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '12px 16px',
              background: 'transparent',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },

    // Links open in new tab
    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },

    // Tables
    table({ children, ...props }) {
      return (
        <div className="md-table-wrapper">
          <table {...props}>{children}</table>
        </div>
      );
    },
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
