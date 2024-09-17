import Mark from "mark.js";
import { SearchConfig } from "./type";

// https://markjs.io/
export const markInstance = new Mark("body");

/**
 * Default options for mark.js
 */
const defaultOptions: Mark.MarkOptions = {
  className: "tsp-mark",
  acrossElements: true,
  separateWordSearch: false,
  ignoreJoiners: true,
  exclude: ["text-search-pro-shadow-root-ui"], // ignore stuff inside my extension
  debug: false,
  iframes: true,
  iframesTimeout: 2000,
  each: function (mark: Element) {
    mark.classList.add("animate");
  },
};

/**
 * recusive check parents not display none or visibility hidden until some levels up
 */
const isVisible = (
  node: Text | Element | HTMLElement | ChildNode,
  level = 20
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
  levels: number = 5
): boolean => {
  let parent: HTMLElement | null | undefined = node.parentElement;
  for (let i = 0; i < levels; i++) {
    if (
      // TODO: inputs and textareas should be searchable
      ["SCRIPT", "NOSCRIPT", "STYLE", "META", "INPUT", "TEXTAREA"].includes(
        parent?.tagName || ""
      )
    ) {
      return false;
    }
    parent = parent?.parentElement;
  }
  return true;
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
  onNoMatch?: (notFoundTerm: string) => void
) => {
  const options: Mark.MarkOptions = {
    ...defaultOptions,
    done: done,
    noMatch: function (notFoundTerm: string) {
      if (onNoMatch) {
        onNoMatch(notFoundTerm);
      }
    },
    filter: function (
      textNode: Text,
      term: string,
      marksSoFar: number,
      marksTotal: number
    ) {
      return isVisible(textNode) && isValidTag(textNode);
    },
  };

  if (!mode.isRegex) {
    options.caseSensitive = mode.isCaseSensitive;
    // NOTE: this is not working, if the term is the first work in a prargrah/sentence
    // it will not be marked, I tried to fix using my forked mark.js, but failed
    options.accuracy = mode.isWholeWord
      ? {
          value: "exactly",
          limiters: [
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
          ],
        }
      : "partially";
  } else {
    // do nothing for now
  }

  markInstance.unmark({
    done: function () {
      if (mode.isRegex) {
        // TODO: mark.js regex search is not working
        // try {
        //   const regex = new RegExp(input);
        //   markInstance.markRegExp(regex, options);
        // } catch (error) {
        //   console.error("Invalid regular expression: " + error);
        //   throw new Error("Invalid regular expression: " + error);
        // }
      } else {
        if (typeof input !== "string") {
          throw new Error("Input must be a string");
        }
        markInstance.mark(input, options);
      }
    },
  });
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
