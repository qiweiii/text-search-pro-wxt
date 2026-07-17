// Custom DOM text highlighter

const MARK_ATTR = "data-markjs";
const MARK_TAG = "mark";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "NOSCRIPT",
  "STYLE",
  "META",
  "HEAD",
  "TITLE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
]);

const WORD_LIMITERS = new Set([
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  ")",
  "(",
  "[",
  "]",
  "{",
  "}",
  "-",
  " ",
  "\t",
  "\n",
  "\r",
]);

const JOINER_PATTERN = "[\\u00ad\\u200b\\u200c\\u200d]*";

export interface MarkOptions {
  className?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  acrossElements?: boolean;
  ignoreJoiners?: boolean;
  exclude?: string[];
  iframes?: boolean;
  each?: (element: Element) => void;
  filter?: (
    node: Text,
    term: string,
    totalSoFar: number,
    termSoFar: number,
  ) => boolean;
  done?: (total: number) => void;
  noMatch?: (term: string) => void;
}

interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isBoundaryChar(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  return WORD_LIMITERS.has(ch);
}

function buildTermRegex(
  term: string,
  caseSensitive: boolean,
  ignoreJoiners: boolean,
): RegExp {
  let pattern: string;
  if (ignoreJoiners) {
    // escape each char individually, then join with joiner pattern
    pattern = term.split("").map(escapeRegex).join(JOINER_PATTERN);
  } else {
    pattern = escapeRegex(term);
  }
  const flags = `g${caseSensitive ? "" : "i"}`;
  return new RegExp(pattern, flags);
}

function* collectTextNodes(
  root: Node,
  exclude: string[],
  iframes: boolean,
): Generator<Text> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      for (const sel of exclude) {
        if (parent.closest(sel)) return NodeFilter.FILTER_REJECT;
      }
      if (!node.textContent || !node.textContent.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    yield walker.currentNode as Text;
  }

  if (iframes && root instanceof Element) {
    for (const iframe of Array.from(root.querySelectorAll("iframe"))) {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          yield* collectTextNodes(doc.body, exclude, false);
        }
      } catch {
        // cross-origin iframe — skip
      }
    }
  }
}

function wrapTextNodeRange(
  node: Text,
  start: number,
  end: number,
  className: string | undefined,
  each: ((el: Element) => void) | undefined,
): HTMLElement {
  const text = node.textContent!;
  const matchText = text.slice(start, end);

  const middle = node.splitText(start);
  middle.splitText(end - start);

  const mark = document.createElement(MARK_TAG);
  mark.setAttribute(MARK_ATTR, "true");
  if (className) mark.className = className;
  mark.textContent = matchText;

  middle.parentNode!.replaceChild(mark, middle);

  if (each) each(mark);
  return mark;
}

function collectMatches(
  text: string,
  regex: RegExp,
  wholeWord: boolean,
): { start: number; end: number }[] {
  const matches: { start: number; end: number }[] = [];
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    const start = m.index;
    const end = start + m[0].length;

    if (wholeWord) {
      const before = start > 0 ? text[start - 1] : undefined;
      const after = end < text.length ? text[end] : undefined;
      if (!isBoundaryChar(before) || !isBoundaryChar(after)) continue;
    }

    matches.push({ start, end });
  }
  return matches;
}

function findOverlappingEntries(
  entries: TextNodeEntry[],
  start: number,
  end: number,
): TextNodeEntry[] {
  return entries.filter((e) => e.end > start && e.start < end);
}

export class Highlighter {
  constructor(
    private root: string | HTMLElement | HTMLElement[] | NodeList,
  ) {}

  private getRootElements(): HTMLElement[] {
    if (typeof this.root === "string") {
      return Array.from(document.querySelectorAll(this.root));
    }
    if (this.root instanceof HTMLElement) return [this.root];
    if (NodeList.prototype.isPrototypeOf(this.root) || Array.isArray(this.root)) {
      return Array.from(this.root) as HTMLElement[];
    }
    return [];
  }

  mark(input: string | string[], options: MarkOptions): void {
    const terms = typeof input === "string" ? [input] : input;
    let total = 0;

    for (const term of terms) {
      if (!term) continue;
      let termCount = 0;
      for (const rootEl of this.getRootElements()) {
        termCount += options.acrossElements
          ? this.markAcross(rootEl, term, options, total)
          : this.markSingle(rootEl, term, options, total);
      }
      if (termCount === 0) options.noMatch?.(term);
      total += termCount;
    }

    options.done?.(total);
  }

  markRegExp(regex: RegExp, options: MarkOptions): void {
    if (!regex.global) {
      regex = new RegExp(regex.source, regex.flags + "g");
    }

    let total = 0;
    for (const rootEl of this.getRootElements()) {
      total += options.acrossElements
        ? this.markRegExpAcross(rootEl, regex, options, total)
        : this.markRegExpSingle(rootEl, regex, options, total);
    }

    if (total === 0) options.noMatch?.(regex.source);
    options.done?.(total);
  }

  unmark(options?: { done?: () => void }): void {
    for (const rootEl of this.getRootElements()) {
      this.unmarkInElement(rootEl);
      for (const iframe of Array.from(rootEl.querySelectorAll("iframe"))) {
        try {
          if (iframe.contentDocument?.body) {
            this.unmarkInElement(iframe.contentDocument.body);
          }
        } catch {
          // cross-origin — skip
        }
      }
    }
    options?.done?.();
  }

  private unmarkInElement(el: Element): void {
    for (const mark of Array.from(el.querySelectorAll(`[${MARK_ATTR}]`))) {
      const parent = mark.parentNode;
      if (!parent) continue;
      const frag = document.createDocumentFragment();
      while (mark.firstChild) frag.appendChild(mark.firstChild);
      parent.replaceChild(frag, mark);
      parent.normalize();
    }
  }

  // MARK: String search

  private markSingle(
    root: HTMLElement,
    term: string,
    options: MarkOptions,
    totalOffset: number,
  ): number {
    const {
      className,
      caseSensitive = false,
      wholeWord = false,
      ignoreJoiners = false,
      exclude = [],
      iframes = false,
      each,
      filter,
    } = options;

    const regex = buildTermRegex(term, caseSensitive, ignoreJoiners);
    let count = 0;

    for (const textNode of collectTextNodes(root, exclude, iframes)) {
      const text = textNode.textContent!;
      const matches = collectMatches(text, regex, wholeWord);

      for (let i = matches.length - 1; i >= 0; i--) {
        const { start, end } = matches[i];
        const matchText = text.slice(start, end);
        if (filter && !filter(textNode, matchText, totalOffset + count, count)) {
          continue;
        }
        wrapTextNodeRange(textNode, start, end, className, each);
        count++;
      }
    }

    return count;
  }

  private markAcross(
    root: HTMLElement,
    term: string,
    options: MarkOptions,
    totalOffset: number,
  ): number {
    const {
      className,
      caseSensitive = false,
      wholeWord = false,
      ignoreJoiners = false,
      exclude = [],
      iframes = false,
      each,
      filter,
    } = options;

    const { composite, entries } = this.buildComposite(root, exclude, iframes);
    const regex = buildTermRegex(term, caseSensitive, ignoreJoiners);
    const matches = collectMatches(composite, regex, wholeWord);

    return this.wrapMatchesAcross(
      entries,
      composite,
      matches,
      className,
      each,
      filter,
      totalOffset,
    );
  }

  // MARK: Regex search

  private markRegExpSingle(
    root: HTMLElement,
    regex: RegExp,
    options: MarkOptions,
    totalOffset: number,
  ): number {
    const {
      className,
      exclude = [],
      iframes = false,
      each,
      filter,
    } = options;

    let count = 0;
    for (const textNode of collectTextNodes(root, exclude, iframes)) {
      const text = textNode.textContent!;
      const matches = collectMatches(text, regex, false);

      for (let i = matches.length - 1; i >= 0; i--) {
        const { start, end } = matches[i];
        const matchText = text.slice(start, end);
        if (filter && !filter(textNode, matchText, totalOffset + count, count)) {
          continue;
        }
        wrapTextNodeRange(textNode, start, end, className, each);
        count++;
      }
    }

    return count;
  }

  private markRegExpAcross(
    root: HTMLElement,
    regex: RegExp,
    options: MarkOptions,
    totalOffset: number,
  ): number {
    const {
      className,
      exclude = [],
      iframes = false,
      each,
      filter,
    } = options;

    const { composite, entries } = this.buildComposite(root, exclude, iframes);
    const matches = collectMatches(composite, regex, false);

    return this.wrapMatchesAcross(
      entries,
      composite,
      matches,
      className,
      each,
      filter,
      totalOffset,
    );
  }

  // MARK: Shared helpers

  private buildComposite(
    root: HTMLElement,
    exclude: string[],
    iframes: boolean,
  ): { composite: string; entries: TextNodeEntry[] } {
    const entries: TextNodeEntry[] = [];
    let composite = "";
    for (const node of collectTextNodes(root, exclude, iframes)) {
      const text = node.textContent!;
      entries.push({
        node,
        start: composite.length,
        end: composite.length + text.length,
      });
      composite += text;
    }
    return { composite, entries };
  }

  private wrapMatchesAcross(
    entries: TextNodeEntry[],
    composite: string,
    matches: { start: number; end: number }[],
    className: string | undefined,
    each: ((el: Element) => void) | undefined,
    filter: MarkOptions["filter"],
    totalOffset: number,
  ): number {
    let count = 0;

    // Process in reverse to preserve earlier offsets
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end } = matches[i];
      const matchText = composite.slice(start, end);
      const overlapping = findOverlappingEntries(entries, start, end);
      if (overlapping.length === 0) continue;

      // Wrap right-to-left within the match
      for (let j = overlapping.length - 1; j >= 0; j--) {
        const entry = overlapping[j];
        const text = entry.node.textContent!;
        const localStart = Math.max(0, start - entry.start);
        const localEnd = Math.min(text.length, end - entry.start);
        if (localEnd <= localStart) continue;

        if (filter && !filter(entry.node, matchText, totalOffset + count, count)) {
          continue;
        }
        wrapTextNodeRange(entry.node, localStart, localEnd, className, each);
        count++;
      }
    }

    return count;
  }
}
