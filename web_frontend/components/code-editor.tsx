"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export type CodeLanguage = "yaml" | "python" | "cpp" | "xml";

type TokenKind = "plain" | "comment" | "key" | "string" | "keyword" | "number" | "tag" | "attr";

const TEXT =
  "m-0 box-border border-0 px-4 pt-4 pb-10 font-mono text-[0.65rem] leading-5 whitespace-pre [font-variant-ligatures:none]";

const COLOR: Record<TokenKind, string> = {
  plain: "",
  comment: "text-[#8ec5ff]",
  key: "text-[#ffd56a]",
  string: "text-[#f0b48a]",
  keyword: "text-[#f0a0d0]",
  number: "text-[#f7f3ea]",
  tag: "text-[#ffe14a]",
  attr: "text-[#c9b896]",
};

/** Two spaces. Matches the behavior-tree files. */
const INDENT = "  ";

const INDENT_MARK = {
  backgroundImage:
    "linear-gradient(to right, rgb(230 179 37 / 0.55), rgb(230 179 37 / 0.55) calc(100% - 1px), rgb(255 214 106) calc(100% - 1px))",
} as const;

type Token = { text: string; kind: TokenKind };

const PYTHON = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const CPP = new Set([
  "auto",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "double",
  "else",
  "enum",
  "false",
  "float",
  "for",
  "if",
  "int",
  "namespace",
  "new",
  "nullptr",
  "override",
  "private",
  "protected",
  "public",
  "return",
  "sizeof",
  "static",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typename",
  "using",
  "virtual",
  "void",
  "while",
]);

function push(out: Token[], text: string, kind: TokenKind) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ text, kind });
}

function scanWord(source: string, words: Set<string>, hashComment: boolean, slashComment: boolean): Token[] {
  const out: Token[] = [];
  let index = 0;
  while (index < source.length) {
    if (hashComment && source[index] === "#") {
      const end = source.indexOf("\n", index);
      const stop = end < 0 ? source.length : end;
      push(out, source.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (slashComment && source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      const stop = end < 0 ? source.length : end;
      push(out, source.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (slashComment && source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      const stop = end < 0 ? source.length : end + 2;
      push(out, source.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      if (hashComment && source.startsWith(quote.repeat(3), index)) {
        const end = source.indexOf(quote.repeat(3), index + 3);
        const stop = end < 0 ? source.length : end + 3;
        push(out, source.slice(index, stop), "string");
        index = stop;
        continue;
      }
      let cursor = index + 1;
      while (cursor < source.length) {
        if (source[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (source[cursor] === quote) {
          cursor += 1;
          break;
        }
        if (source[cursor] === "\n") break;
        cursor += 1;
      }
      push(out, source.slice(index, cursor), "string");
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(source[index])) {
      let cursor = index + 1;
      while (cursor < source.length && /[A-Za-z0-9_]/.test(source[cursor])) cursor += 1;
      const word = source.slice(index, cursor);
      push(out, word, words.has(word) ? "keyword" : "plain");
      index = cursor;
      continue;
    }
    if (/[0-9]/.test(source[index])) {
      let cursor = index + 1;
      while (cursor < source.length && /[0-9.]/.test(source[cursor])) cursor += 1;
      push(out, source.slice(index, cursor), "number");
      index = cursor;
      continue;
    }
    push(out, source[index], "plain");
    index += 1;
  }
  return out;
}

function scanYaml(source: string): Token[] {
  const out: Token[] = [];
  const lines = source.split("\n");
  lines.forEach((line, lineIndex) => {
    const comment = /^(\s*)(#.*)$/.exec(line);
    if (comment) {
      push(out, comment[1], "plain");
      push(out, comment[2], "comment");
    } else {
      const keyed = /^(\s*)([A-Za-z0-9_]+)(:)(.*)$/.exec(line);
      if (!keyed) push(out, line, "plain");
      else {
        push(out, keyed[1], "plain");
        push(out, keyed[2], "key");
        push(out, keyed[3], "plain");
        const inline = /^(.*?)(\s+#.*)$/.exec(keyed[4]);
        const value = inline ? inline[1] : keyed[4];
        const note = inline ? inline[2] : "";
        const lead = /^\s*/.exec(value)?.[0] ?? "";
        const token = value.slice(lead.length);
        push(out, lead, "plain");
        if (token === "true" || token === "false") push(out, token, "keyword");
        else if (token.startsWith('"') || token.startsWith("'")) push(out, token, "string");
        else if (/^-?\d+(\.\d+)?$/.test(token)) push(out, token, "number");
        else push(out, token, "plain");
        push(out, note, "comment");
      }
    }
    if (lineIndex < lines.length - 1) push(out, "\n", "plain");
  });
  return out;
}

function scanXml(source: string): Token[] {
  const out: Token[] = [];
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("<!--", index)) {
      const end = source.indexOf("-->", index + 4);
      const stop = end < 0 ? source.length : end + 3;
      push(out, source.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== quote && source[cursor] !== "\n") cursor += 1;
      if (cursor < source.length && source[cursor] === quote) cursor += 1;
      push(out, source.slice(index, cursor), "string");
      index = cursor;
      continue;
    }
    if (source[index] === "<") {
      const close = source.startsWith("</", index);
      push(out, close ? "</" : "<", "plain");
      index += close ? 2 : 1;
      let cursor = index;
      while (cursor < source.length && /[A-Za-z0-9_:-]/.test(source[cursor])) cursor += 1;
      push(out, source.slice(index, cursor), "tag");
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(source[index])) {
      let cursor = index + 1;
      while (cursor < source.length && /[A-Za-z0-9_:-]/.test(source[cursor])) cursor += 1;
      const word = source.slice(index, cursor);
      const later = source.slice(cursor).match(/^\s*=/);
      push(out, word, later ? "attr" : "plain");
      index = cursor;
      continue;
    }
    push(out, source[index], "plain");
    index += 1;
  }
  return out;
}

function tokensOf(source: string, language: CodeLanguage): Token[] {
  if (language === "yaml") return scanYaml(source);
  if (language === "python") return scanWord(source, PYTHON, true, false);
  if (language === "cpp") return scanWord(source, CPP, false, true);
  return scanXml(source);
}

function painted(token: Token, key: number) {
  return token.kind === "plain" ? (
    <span key={key}>{token.text}</span>
  ) : (
    <span key={key} className={COLOR[token.kind]}>
      {token.text}
    </span>
  );
}

function indentSpaces(text: string, key: { n: number }): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index + INDENT.length <= text.length) {
    nodes.push(
      <span key={key.n++} style={INDENT_MARK}>
        {text.slice(index, index + INDENT.length)}
      </span>,
    );
    index += INDENT.length;
  }
  if (index < text.length) nodes.push(<span key={key.n++}>{text.slice(index)}</span>);
  return nodes;
}

function Highlighted({ source, language }: { source: string; language: CodeLanguage }) {
  const tokens = tokensOf(source, language);
  if (language !== "xml") return tokens.map((token, index) => painted(token, index));
  const nodes: ReactNode[] = [];
  const key = { n: 0 };
  let atLineStart = true;
  for (const token of tokens) {
    for (const part of token.text.split(/(\n)/)) {
      if (part === "\n") {
        nodes.push(<span key={key.n++}>{"\n"}</span>);
        atLineStart = true;
        continue;
      }
      if (atLineStart && token.kind === "plain") {
        const lead = /^ +/.exec(part)?.[0] ?? "";
        if (lead) {
          nodes.push(...indentSpaces(lead, key));
          const rest = part.slice(lead.length);
          if (rest) nodes.push(painted({ text: rest, kind: "plain" }, key.n++));
          if (rest) atLineStart = false;
          continue;
        }
      }
      if (part.length > 0) atLineStart = false;
      nodes.push(painted({ text: part, kind: token.kind }, key.n++));
    }
  }
  return nodes;
}

export function ResetCodeButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      Reset to default
    </button>
  );
}

function placeHighlight(view: HTMLPreElement | null, box: HTMLTextAreaElement | null) {
  if (!view || !box) return;
  view.style.transform = `translate(${-box.scrollLeft}px, ${-box.scrollTop}px)`;
}

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf("\n", end);
  return { lineStart, stop: lineEnd < 0 ? value.length : lineEnd };
}

function spacesToCut(line: string): number {
  if (line.startsWith("\t")) return 1;
  const spaces = /^ */.exec(line)?.[0].length ?? 0;
  return Math.min(INDENT.length, spaces);
}

/** Tab indents the touched lines. Shift+Tab removes one indent. */
function editIndent(value: string, start: number, end: number, shift: boolean) {
  const { lineStart, stop } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, stop).split("\n");
  const cut = lines.map((line) => (shift ? spacesToCut(line) : 0));
  const nextLines = lines.map((line, index) => (shift ? line.slice(cut[index]) : INDENT + line));
  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, lineStart) + nextBlock + value.slice(stop);
  const beforeStart = value.slice(lineStart, start).split("\n").length;
  const beforeEnd = value.slice(lineStart, end).split("\n").length;
  if (!shift) {
    return { value: next, start: start + INDENT.length * beforeStart, end: end + INDENT.length * beforeEnd };
  }
  const removedStart = cut.slice(0, beforeStart).reduce((sum, count) => sum + count, 0);
  const removedEnd = cut.slice(0, beforeEnd).reduce((sum, count) => sum + count, 0);
  return { value: next, start: Math.max(lineStart, start - removedStart), end: Math.max(lineStart, end - removedEnd) };
}

/** Enter keeps the indent. After an opening tag the next line goes one step deeper. */
function editEnter(value: string, start: number, end: number, language: CodeLanguage) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const prefix = value.slice(lineStart, start);
  let indent = /^[ \t]*/.exec(prefix)?.[0] ?? "";
  if (language === "xml") {
    const trimmed = prefix.trim();
    if (trimmed.startsWith("</")) {
      if (indent.endsWith(INDENT)) indent = indent.slice(0, -INDENT.length);
    } else if (/^<[A-Za-z_:][\w:.-]*\b[^>]*[^/]>$/.test(trimmed)) {
      indent += INDENT;
    }
  }
  const insert = `\n${indent}`;
  const caret = start + insert.length;
  return { value: value.slice(0, start) + insert + value.slice(end), start: caret, end: caret };
}

export function CodeEditor({
  value,
  onChange,
  label,
  language,
  height,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  language: CodeLanguage;
  height: string;
  readOnly?: boolean;
}) {
  const backdrop = useRef<HTMLPreElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  useLayoutEffect(() => {
    const box = field.current;
    const pending = caret.current;
    if (box && pending) {
      box.selectionStart = pending.start;
      box.selectionEnd = pending.end;
      caret.current = null;
    }
    placeHighlight(backdrop.current, field.current);
  });
  const apply = (next: { value: string; start: number; end: number }) => {
    if (next.value === value) {
      const box = field.current;
      if (!box) return;
      box.selectionStart = next.start;
      box.selectionEnd = next.end;
      return;
    }
    caret.current = { start: next.start, end: next.end };
    onChange?.(next.value);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onChange) return;
    const box = event.currentTarget;
    if (event.key === "Tab") {
      event.preventDefault();
      apply(editIndent(box.value, box.selectionStart, box.selectionEnd, event.shiftKey));
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      apply(editEnter(box.value, box.selectionStart, box.selectionEnd, language));
    }
  };
  if (readOnly) {
    return (
      <pre aria-label={label} className={`overflow-auto rounded-lg border border-border bg-[#1c1404] text-[#f4efe4] ${TEXT}`}>
        <Highlighted source={value} language={language} />
        {"\n"}
      </pre>
    );
  }
  return (
    <div className={`relative ${height} min-h-[16rem] resize-y overflow-hidden rounded-lg border border-border bg-[#1c1404]`}>
      <pre
        ref={backdrop}
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 min-h-full w-max min-w-full text-[#f4efe4] ${TEXT}`}
      >
        <Highlighted source={value} language={language} />
        {"\n"}
      </pre>
      <textarea
        ref={field}
        value={value}
        wrap="off"
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(event) => placeHighlight(backdrop.current, event.currentTarget)}
        spellCheck={false}
        aria-label={label}
        className={`absolute inset-0 z-10 h-full w-full resize-none overflow-auto overscroll-contain bg-transparent text-transparent caret-[#f4efe4] outline-none selection:bg-[#e6b325]/35 selection:text-transparent ${TEXT}`}
      />
    </div>
  );
}
