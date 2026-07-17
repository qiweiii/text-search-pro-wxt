import { Highlighter, MarkOptions } from "./highlighter";
import { SearchConfig } from "./type";

export const markInstance = new Highlighter("body");

/**
 * recusive check parents not display none or visibility hidden until some levels up
 */
const isVisible = (
  node: Text | Element | HTMLElement | ChildNode,
  level = 20,
): boolean => {
  let parent: HTMLElement | null | undefined = node.parentElement;
  for (let i = 0; i < level; i++) {
    if (
      parent?.computedStyleMap().get("display")?.toString() === "none" ||
      parent?.computedStyleMap().get("visibility")?.toString() === "hidden"
    ) {
      return false;
    }
    parent = parent?.parentElement;
  }
  return true;
};

/**
 * Check if the node tag is a tag with some text
 */
const isValidTag = (
  node: Text | Element | HTMLElement | ChildNode,
  levels: number = 5,
): boolean => {
  let parent: HTMLElement | null | undefined = node.parentElement;
  for (let i = 0; i < levels; i++) {
    if (
      // TODO: inputs and textareas should be searchable
      ["SCRIPT", "NOSCRIPT", "STYLE", "META", "INPUT", "TEXTAREA"].includes(
        parent?.tagName || "",
      )
    ) {
      return false;
    }
    parent = parent?.parentElement;
  }
  return true;
};

const baseOptions: MarkOptions = {
  className: "tsp-mark",
  acrossElements: true,
  ignoreJoiners: true,
  exclude: ["text-search-pro-shadow-root-ui"],
  iframes: true,
  each: (mark: Element) => mark.classList.add("animate"),
  filter: (textNode: Text) => isVisible(textNode) && isValidTag(textNode),
};

/**
 * Search for keyword in the document
 *
 * Note that this throws on input errors
 */
export const search = (
  input: string,
  mode: SearchConfig,
  done: (numOfMatches: number) => void,
  onNoMatch?: (notFoundTerm: string) => void,
) => {
  markInstance.unmark();

  const options: MarkOptions = {
    ...baseOptions,
    done: done,
    noMatch: (term: string) => onNoMatch?.(term),
  };

  if (mode.isRegex) {
    try {
      const regex = new RegExp(input, mode.isCaseSensitive ? "g" : "gi");
      markInstance.markRegExp(regex, options);
    } catch (error) {
      console.error("Invalid regular expression: " + error);
      throw new Error("Invalid regular expression: " + error);
    }
  } else {
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }
    options.caseSensitive = mode.isCaseSensitive;
    options.wholeWord = mode.isWholeWord;
    markInstance.mark(input, options);
  }
};

/**
 * Scroll to element's position in window
 */
export function scrollTo(element: Element): void {
  var headerOffset = 185;
  var elementPosition = element.getBoundingClientRect().top;
  var offsetPosition = elementPosition + window.scrollY - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}
