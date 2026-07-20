import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { markInstance, scrollTo, search } from "@/lib/dom";
import { increaseSearchNoBy1 } from "@/lib/storage";
import type { SearchConfig } from "@/lib/type";
import Search from "./Search";

const App: React.FC = () => {
  const [results, setResults] = useState<NodeListOf<Element> | undefined>();
  const [numResults, setNumResults] = useState<number>();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // MARK:- Nav handlers

  const scrollToCurrent = () => {
    if (!results) return;
    const element = results[currentIndex];
    if (element) {
      scrollTo(element);
    }
  };

  const onSearch = useCallback((searchText: string, config: SearchConfig) => {
    setLoading(true);
    search(searchText, config, (num) => {
      const results = document.querySelectorAll(".tsp-mark");
      setResults(results);
      setNumResults(num);
      setCurrentIndex(0);
      increaseSearchNoBy1();
      setLoading(false);
    });
  }, []);

  const onNext = () => {
    if (!numResults) return;
    const nextIndex = currentIndex + 1 < numResults ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    // NOTE: has to force scroll
    scrollToCurrent();
  };

  const onPrev = () => {
    if (!numResults) return;
    const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : numResults - 1;
    setCurrentIndex(prevIndex);
    scrollToCurrent();
  };

  const onFirst = () => {
    setCurrentIndex(0);
    scrollToCurrent();
  };

  const onLast = () => {
    setCurrentIndex(Math.max(0, (numResults || 0) - 1));
    scrollToCurrent();
  };

  const onClear = () => {
    markInstance.unmark();
    setResults(undefined);
    setNumResults(undefined);
    setCurrentIndex(0);
  };

  // MARK:- Effects

  useEffect(() => {
    const element = results?.[currentIndex];
    if (element) {
      results?.forEach((e) => {
        e.classList.remove("current");
      });
      element.classList.add("current");
      scrollTo(element);
    }
  }, [currentIndex, results]);

  return (
    <Search
      onSearch={onSearch}
      onNext={onNext}
      onPrev={onPrev}
      onFirst={onFirst}
      onLast={onLast}
      onClear={onClear}
      numResults={numResults}
      currentIndex={currentIndex}
      loading={loading}
    />
  );
};

export default App;
