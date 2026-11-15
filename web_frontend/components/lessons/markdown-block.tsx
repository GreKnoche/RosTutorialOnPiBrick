import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

export function MarkdownBlock({
  source,
  variant = "body",
  className,
}: {
  source: string;
  variant?: "intro" | "body";
  className?: string;
}) {
  const paragraph =
    variant === "intro"
      ? "max-w-3xl text-sm leading-7 sm:text-base"
      : "max-w-2xl text-sm leading-6";
  const components: Components = {
    p: ({ children }) => <p className={paragraph}>{children}</p>,
    pre: ({ children }) => (
      <pre className="max-w-2xl overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[0.65rem] leading-5">
        {children}
      </pre>
    ),
    code: ({ className, children }) =>
      className ? (
        <code className={className}>{children}</code>
      ) : (
        <code className="font-mono text-[0.85em]">{children}</code>
      ),
  };

  return (
    <div className={cn("markdown-content flex flex-col gap-2", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
