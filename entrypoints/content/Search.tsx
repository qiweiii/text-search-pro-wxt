import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  WholeWordIcon,
  CaseSensitiveIcon,
  RegexIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  X,
  EllipsisVertical,
} from "lucide-react";
import debounce from "lodash/debounce";

import "./global.css";
import { SearchConfig } from "@/lib/type";
import { markInstance } from "@/lib/dom";
import { getStorage } from "@/lib/storage";

interface SearchProps {
  onSearch: (searchText: string, config: SearchConfig) => void;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onClear: () => void;
  numResults: number | undefined;
  currentIndex: number;
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

  const triggerCloseSearch = () => {
    setVisible(false);
    setTimeout(() => {
      markInstance.unmark();
      setInDom(false);
    }, 200);
  };

  const handleSearch = useCallback(
    debounce(async (text: string) => {
      if (!text) {
        onClear();
        return;
      }

      try {
        onSearch(text, config);
        setInputError("");
      } catch (e) {
        console.error(e);
        if (e instanceof Error) {
          onClear();
          setInputError(e.message);
        }
      }
    }, 400),
    [config, onSearch]
  );

  const toggleMenu = () => {
    setMenuOpen((menuOpen) => !menuOpen);
  };

  // MARK:- Effects

  useEffect(() => {
    handleSearch(searchText);
  }, [config, searchText, handleSearch]);

  // On mount
  useEffect(() => {
    // Add listener for when click on extension icon
    browser.runtime.onMessage.addListener(function (request) {
      if (request.message === "toggle_tsp_extension") {
        // 2 step to allow animation finish then remove from dom
        setVisible((visible) => !visible);
        if (inDom) {
          // delay to make sure the animation is finished
          setTimeout(() => {
            setInDom(false);
          }, 300);
        } else {
          setInDom(true);
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
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
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
  }, [inputRef.current, inDom, visible]);

  // MARK:- <Render />
  return (
    <div
      className={`${inDom ? "visible" : "hidden"} root ${darkMode}`}
      style={{ opacity: visible ? 1 : 0 }}
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
            autoFocus={true}
            onInput={(e) => {
              const elem = e.target as HTMLTextAreaElement;
              elem.style.height = "auto";
              elem.style.height = `${elem.scrollHeight - 4}px`;
              if (elem.value.length === 0) {
                elem.style.height = "auto";
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
            MARK:- Case sensitive
          */}
          <div className="tooltip-container">
            <button
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
              className={`iconButton ${config.isWholeWord ? "active" : ""}`}
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
          {/* <div className="tooltip-container">
            <button
              className={`iconButton ${config.isRegex ? "active" : ""}`}
              onClick={() => {
                setConfig((config) => ({
                  ...config,
                  isRegex: !config.isRegex,
                }));
              }}
            >
              <RegexIcon size={17} style={{ marginTop: "-1px" }} />
            </button>
            <div className="tooltip">Match Regex</div>
          </div> */}

          <div className="border"></div>

          {/*
            MARK:- Nav Btns
          */}
          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={onPrev}>
              <ArrowUp size={18} />
            </button>
            <div className="tooltip">Previous</div>
          </div>

          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={onNext}>
              <ArrowDown size={18} />
            </button>
            <div className="tooltip">Next</div>
          </div>

          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={onFirst}>
              <ArrowUpToLine size={18} />
            </button>
            <div className="tooltip">First</div>
          </div>

          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={onLast}>
              <ArrowDownToLine size={18} />
            </button>
            <div className="tooltip">Last</div>
          </div>

          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={triggerCloseSearch}>
              <X size={19} />
            </button>
            <div className="tooltip">Close (Alt + F)</div>
          </div>

          <div className="tooltip-container nav">
            <button className="iconButton nav" onClick={toggleMenu}>
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
          animate={numResults != undefined ? "visible" : "hidden"}
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
          className="menu-container"
          initial="hidden"
          animate={menuOpen ? "visible" : "hidden"}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Search;
