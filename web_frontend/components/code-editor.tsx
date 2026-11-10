"use client";

import { useRef } from "react";

export type CodeLanguage = "yaml" | "python" | "cpp" | "xml";

type TokenKind = "plain" | "comment" | "key" | "string" | "keyword" | "number";

const TEXT = "m-0 box-border p-4 font-mono text-[0.65rem] leading-5 whitespace-pre";
const FIELD = `${TEXT} h-full w-full`;

const COLOR: Record<TokenKind, string> = {
  plain: "",
  comment: "text-[#8ec5ff]",
  key: "text-[#ffd56a]",
  string: "text-[#f0b48a]",
  keyword: "text-[#f0a0d0]",
  number: "text-[#f7f3ea]",
};

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
      push(out, source.slice(index, cursor), "key");
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(source[index])) {
      let cursor = index + 1;
      while (cursor < source.length && /[A-Za-z0-9_:-]/.test(source[cursor])) cursor += 1;
      const word = source.slice(index, cursor);
      const later = source.slice(cursor).match(/^\s*=/);
      push(out, word, later ? "key" : "plain");
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

function Highlighted({ source, language }: { source: string; language: CodeLanguage }) {
  return tokensOf(source, language).map((token, index) =>
    token.kind === "plain" ? (
      <span key={index}>{token.text}</span>
    ) : (
      <span key={index} className={COLOR[token.kind]}>
        {token.text}
      </span>
    ),
  );
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
  if (readOnly) {
    return (
      <pre aria-label={label} className={`overflow-auto rounded-lg border border-border bg-[#1c1404] text-[#f4efe4] ${TEXT}`}>
        <Highlighted source={value} language={language} />
      </pre>
    );
  }
  return (
    <div className={`relative ${height} min-h-[16rem] resize-y overflow-hidden rounded-lg border border-border bg-[#1c1404]`}>
      <pre ref={backdrop} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden text-[#f4efe4] ${FIELD}`}>
        <Highlighted source={value} language={language} />
      </pre>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onScroll={(event) => {
          const view = backdrop.current;
          if (!view) return;
          view.scrollTop = event.currentTarget.scrollTop;
          view.scrollLeft = event.currentTarget.scrollLeft;
        }}
        spellCheck={false}
        aria-label={label}
        className={`absolute inset-0 resize-none overflow-auto bg-transparent text-transparent caret-[#f4efe4] outline-none ${FIELD}`}
      />
    </div>
  );
}
