import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BioMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={
        "text-muted-foreground break-words leading-relaxed space-y-2 " +
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
        "[&_strong]:text-foreground [&_strong]:font-semibold " +
        "[&_em]:italic " +
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono " +
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
        "[&_li]:my-0.5 " +
        "[&_h2]:font-serif [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:mt-3 [&_h2]:mb-1 " +
        "[&_h3]:font-serif [&_h3]:text-foreground [&_h3]:text-lg [&_h3]:mt-2 [&_h3]:mb-1 " +
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic " +
        "[&_hr]:my-3 [&_hr]:border-border " +
        (className ?? "")
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={["h1", "img", "script", "iframe", "style"]}
        unwrapDisallowed
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
