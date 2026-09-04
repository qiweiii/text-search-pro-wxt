import { SiDiscord, SiGithub, SiX } from "@icons-pack/react-simple-icons";
import { motion } from "framer-motion";
import debounce from "lodash/debounce";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  CaseSensitiveIcon,
  EllipsisVertical,
  Regex as RegexIcon,
  Search as SearchIcon,
  WholeWordIcon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import "./global.css";
import { markInstance } from "@/lib/dom";
import type { SearchConfig } from "@/lib/type";

interface SearchProps {
  onSearch: (searchText: string, config: SearchConfig) => void;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onClear: () => void;
  numResults: number | undefined;
  currentIndex: number;
  loading: boolean;
}

const Search: React.FC<SearchProps> = ({
  onSearch,
  onNext,
  onPrev,
  onFirst,
  onLast,
  onClear,
  numResults,
  currentIndex,
}) => {
  const [inDom, setInDom] = useState(false);
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<SearchConfig>({
    isWholeWord: false,
    isCaseSensitive: false,
    isRegex: false,
  });
  const [searchText, setSearchText] = useState("");
  const [darkMode, setDarkMode] = useState<"dark" | "light">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputError, setInputError] = useState<string>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isOpenRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const triggerCloseSearch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    isOpenRef.current = false;
    setVisible(false);
    timeoutRef.current = setTimeout(() => {
      markInstance.unmark();
      setInDom(false);
      timeoutRef.current = undefined;
    }, 200);
  }, []);

  const handleSearch = useCallback(
    debounce(async (text: string, cfg: SearchConfig) => {
      if (!text) {
        onClear();
        return;
      }

      try {
        onSearch(text, cfg);
        setInputError("");
      } catch (e) {
        console.error(e);
        if (e instanceof Error) {
          onClear();
          setInputError(e.message);
        }
      }
    }, 400),
    [],
  );

  const toggleMenu = () => {
    setMenuOpen((menuOpen) => !menuOpen);
  };

  // Helper function to get the correct modifier key text
  const getModifierKeyText = () => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    return isMac ? "Cmd" : "Ctrl";
  };

  // MARK:- Effects

  useEffect(() => {
    handleSearch(searchText, config);
  }, [searchText, config, handleSearch]);

  // On mount
  useEffect(() => {
    // Add listener for when click on extension icon
    browser.runtime.onMessage.addListener((request: { message?: string }) => {
      if (request.message === "toggle_tsp_extension") {
        // Debounce: cancel any pending close timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }

        if (isOpenRef.current) {
          // Closing
          isOpenRef.current = false;
          setVisible(false);
          timeoutRef.current = setTimeout(() => {
            setInDom(false);
            timeoutRef.current = undefined;
          }, 300);
        } else {
          // Opening
          isOpenRef.current = true;
          setInDom(true);
          setVisible(true);
        }

        browser.storage.local
          // NOTE: these could be global configs if required
          // (like allow users set in options page or a popup in content script)
          .get(["isWholeWord", "isCaseSensitive", "isRegex"])
          .then((res) => {
            setConfig(res as SearchConfig);
          });

        // send message to background.js for google analytics (if any)
        // browser.runtime.sendMessage({
        //   action: "extension_action_clicked",
        //   url: request.url,
        // });
      }
    });

    // set color mode
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setDarkMode("dark");
    } else {
      setDarkMode("light");
    }
  }, []);

  // set dark mode
  useEffect(() => {
    browser.storage.local.set({ darkMode });
  }, [darkMode]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // this force auto focus on visible
  useEffect(() => {
    if (inputRef.current && inDom && visible) {
      inputRef.current.focus();
      inputRef.current.value = "";
    }
  }, [inDom, visible]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when the search component is visible
      if (!inDom || !visible) return;

      // Detect platform for correct modifier key
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Handle arrow keys for navigation (works even when input is focused)
      if (e.key === "ArrowDown" && modifierKey) {
        e.preventDefault();
        e.stopPropagation();
        onNext();
      } else if (e.key === "ArrowUp" && modifierKey) {
        e.preventDefault();
        e.stopPropagation();
        onPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        triggerCloseSearch();
      } else if (e.key === "Enter" && modifierKey) {
        e.preventDefault();
        e.stopPropagation();
        onNext();
      }
    };

    // Add event listener to document to capture all keyboard events
    document.addEventListener("keydown", handleKeyDown, true);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [inDom, visible, onNext, onPrev, triggerCloseSearch]);

  // Close menu on click away
  useEffect(() => {
    if (!menuOpen) return;

    const handleShadowClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const shadowRoot = menuRef.current?.getRootNode();
      const host = shadowRoot instanceof ShadowRoot ? shadowRoot.host : null;
      // Ignore clicks from inside the shadow root (handled by shadow listener)
      if (host?.contains(target)) return;
      // Page click — close
      setMenuOpen(false);
    };

    const shadowRoot = menuRef.current?.getRootNode();
    if (shadowRoot instanceof ShadowRoot) {
      shadowRoot.addEventListener(
        "mousedown",
        handleShadowClick as EventListener,
      );
    }
    document.addEventListener(
      "mousedown",
      handleDocumentClick as EventListener,
    );

    return () => {
      if (shadowRoot instanceof ShadowRoot) {
        shadowRoot.removeEventListener(
          "mousedown",
          handleShadowClick as EventListener,
        );
      }
      document.removeEventListener(
        "mousedown",
        handleDocumentClick as EventListener,
      );
    };
  }, [menuOpen]);

  // MARK:- <Render />
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay container that stops event propagation to underlying page
    <div
      className={`${inDom ? "visible" : "hidden"} root ${darkMode}`}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        zIndex: 2147483647,
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial="hidden"
        animate={inDom ? "visible" : "hidden"}
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }}
        transition={{
          delay: 0.08,
          duration: 0.2,
          ease: "easeOut",
        }}
        className="RowOne"
      >
        {/*
          MARK:- Search Input
        */}
        <div className="searchInputContainer">
          <textarea
            ref={inputRef}
            name="text"
            className={`searchInput ${searchText ? "focus" : ""}`}
            placeholder="Search"
            rows={1}
            autoComplete="off"
            spellCheck="false"
            maxLength={1024}
            value={searchText}
            onInput={(e) => {
              const elem = e.target as HTMLTextAreaElement;
              elem.style.height = "auto";
              if (elem.value.length > 0) {
                elem.style.height = `${elem.scrollHeight - 4}px`;
              }
            }}
            // NOTE: not using enter, since search on type feels better
            // onKeyDown={(e) => {
            //   if (e.key == "Enter" && !e.shiftKey) {
            //     handleSearch();
            //     e.preventDefault();
            //   }
            // }}
            onChange={(e) => {
              setSearchText(e.target.value);
            }}
          />
          <span className="errorMsg">{inputError}</span>
        </div>

        <div className="right">
          {/*
            MARK:- Search button
          */}
          <div className="tooltip-container">
            <button
              type="button"
              className="iconButton"
              onClick={() => {
                if (searchText) {
                  try {
                    onSearch(searchText, config);
                    setInputError("");
                  } catch (e) {
                    console.error(e);
                    if (e instanceof Error) {
                      onClear();
                      setInputError(e.message);
                    }
                  }
                }
              }}
            >
              <SearchIcon size={17} />
            </button>
            <div className="tooltip">{`${getModifierKeyText()} + Enter`}</div>
          </div>

          {/*
            MARK:- Case sensitive
          */}
          <div className="tooltip-container">
            <button
              type="button"
              className={`iconButton ${config.isCaseSensitive ? "active" : ""}`}
              onClick={() => {
                setConfig((config) => ({
                  ...config,
                  isCaseSensitive: !config.isCaseSensitive,
                }));
              }}
            >
              <CaseSensitiveIcon size={20} style={{ marginTop: "1.5px" }} />
            </button>

            <div className="tooltip">Match Case</div>
          </div>

          {/*
            MARK:- Whole word
          */}
          <div className="tooltip-container">
            <button
              type="button"
              className={`iconButton ${config.isWholeWord ? "active" : ""}`}
              disabled={config.isRegex}
              onClick={() => {
                setConfig((config) => ({
                  ...config,
                  isWholeWord: !config.isWholeWord,
                }));
              }}
            >
              <WholeWordIcon size={18} />
            </button>
            <div className="tooltip">Match Whole Word</div>
          </div>

          {/*
            MARK:- Regex
          */}
          <div className="tooltip-container">
            <button
              type="button"
              className={`iconButton ${config.isRegex ? "active" : ""}`}
              onClick={() => {
                setConfig((config) => ({
                  ...config,
                  isRegex: !config.isRegex,
                  isWholeWord: false,
                }));
              }}
            >
              <RegexIcon size={17} style={{ marginTop: "-1px" }} />
            </button>
            <div className="tooltip">Match Regex</div>
          </div>

          {/*
            MARK:- Nav Btns
          */}
          <div className="tooltip-container nav">
            <button type="button" className="iconButton nav" onClick={onPrev}>
              <ArrowUp size={18} />
            </button>
            <div className="tooltip">Previous ({getModifierKeyText()} + ↑)</div>
          </div>

          <div className="tooltip-container nav">
            <button type="button" className="iconButton nav" onClick={onNext}>
              <ArrowDown size={18} />
            </button>
            <div className="tooltip">Next ({getModifierKeyText()} + ↓)</div>
          </div>

          <div className="tooltip-container nav">
            <button type="button" className="iconButton nav" onClick={onFirst}>
              <ArrowUpToLine size={18} />
            </button>
            <div className="tooltip">First</div>
          </div>

          <div className="tooltip-container nav">
            <button type="button" className="iconButton nav" onClick={onLast}>
              <ArrowDownToLine size={18} />
            </button>
            <div className="tooltip">Last</div>
          </div>

          <div className="tooltip-container nav">
            <button
              type="button"
              className="iconButton nav"
              onClick={triggerCloseSearch}
            >
              <X size={19} />
            </button>
            <div className="tooltip">Close (Alt + F)</div>
          </div>

          <div className="tooltip-container nav">
            <button
              type="button"
              className="iconButton nav"
              ref={menuBtnRef}
              onClick={toggleMenu}
            >
              <EllipsisVertical size={17} />
            </button>
            <div className="tooltip">Menu</div>
          </div>
        </div>
      </motion.div>

      <div className="RowTwo">
        {/*
          MARK:- Result Counter
        */}
        <motion.div
          className="result-counter"
          initial="hidden"
          animate={numResults !== undefined ? "visible" : "hidden"}
          exit="hidden"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          transition={{
            delay: 0.05,
            duration: 0.1,
            ease: "easeOut",
          }}
        >
          <span>
            {numResults ? `${currentIndex + 1} / ${numResults}` : "No match"}
          </span>
        </motion.div>
        {/*
          MARK:- Menu
        */}
        <motion.div
          ref={menuRef}
          className="menu-container"
          initial="hidden"
          animate={menuOpen ? "visible" : "hidden"}
          exit="hidden"
          variants={{
            hidden: { opacity: 0, pointerEvents: "none" as const },
            visible: { opacity: 1, pointerEvents: "auto" as const },
          }}
          transition={{
            delay: 0.05,
            duration: 0.1,
            ease: "easeOut",
          }}
        >
          {/* <span className="tip">
            These are global settings to be applied to all sites.
          </span> */}
          <div className="menu">
            <div className={`menu-item`}>
              <span>Dark/Light</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={darkMode === "light"}
                  onChange={() => {
                    if (darkMode === "dark") {
                      setDarkMode("light");
                    } else {
                      setDarkMode("dark");
                    }
                  }}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className={`menu-item`}>
              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href="https://github.com/qiweiii/text-search-pro-wxt"
                  target="_blank"
                  rel="noopener"
                >
                  <SiGithub
                    display="flex"
                    title="Github"
                    size={20}
                    color={darkMode === "dark" ? "#fff" : "#000"}
                  />
                </a>
                <a href="https://x.com/qiweiiiy" target="_blank" rel="noopener">
                  <SiX
                    display="flex"
                    title="X"
                    size={20}
                    color={darkMode === "dark" ? "#fff" : "#000"}
                  />
                </a>
                <a
                  href="https://discord.gg/X5EK8m2ksN"
                  target="_blank"
                  rel="noopener"
                >
                  <SiDiscord
                    display="flex"
                    title="Discord"
                    size={20}
                    color={darkMode === "dark" ? "#fff" : "#000"}
                  />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Search;
