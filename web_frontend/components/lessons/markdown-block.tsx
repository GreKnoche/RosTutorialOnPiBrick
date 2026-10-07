import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
