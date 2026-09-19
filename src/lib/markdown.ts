/**
 * Markdown-Parser: reiner Text rein, Blöcke raus. Bewusst ohne
 * React-Abhängigkeit, damit er sich isoliert testen lässt.
 */

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'rule' };

/** Zerlegt Markdown in Blöcke. Bewusst schlank: deckt ab, was Antworten wirklich nutzen. */
export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n').trim() });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      flushParagraph();
      const language = fence[1] ?? '';
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      blocks.push({ kind: 'code', language, code: code.join('\n') });
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      const items = [bullet[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*[-*+]\s+(.*)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: 'bullet', items });
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      const items = [ordered[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*\d+[.)]\s+(.*)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: 'ordered', items });
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      const parts = [quote[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*>\s?(.*)$/);
        if (!next) break;
        parts.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: 'quote', text: parts.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

export interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

/** Inline-Auszeichnungen: **fett**, *kursiv*, `Code`, [Text](URL). */
export function parseInline(source: string): Segment[] {
  const pattern = /(\[[^\]]+\]\([^)\s]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) segments.push({ text: source.slice(last, match.index) });
    const token = match[0];

    if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) segments.push({ text: link[1], href: link[2] });
      else segments.push({ text: token });
    } else if (token.startsWith('`')) {
      segments.push({ text: token.slice(1, -1), code: true });
    } else if (token.startsWith('**')) {
      segments.push({ text: token.slice(2, -2), bold: true });
    } else {
      segments.push({ text: token.slice(1, -1), italic: true });
    }

    last = match.index + token.length;
  }

  if (last < source.length) segments.push({ text: source.slice(last) });
  return segments;
}

