import { SearchConfig } from "@/lib/type";

const toggleSearch = () => {
  // Send a message to the active tab
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    let activeTab = tabs[0];
    if (!activeTab.id) return;
    browser.tabs.sendMessage(activeTab.id, {
      message: "toggle_tsp_extension",
    });
  });
};

export default defineBackground({
  main() {
    console.log("Hello background!", { id: browser.runtime.id });

    // MARK: - Install
    browser.runtime.onInstalled.addListener(function (details) {
      if (details.reason === "install") {
        browser.storage.local.set({
          isWholeWord: false,
          isCaseSensitive: false,
          isRegex: false,
          darkMode: "light",
          searchNum: "0",
        } as SearchConfig);
        // .then(() => {
        //   // log all storage
        //   return browser.storage.local.get(null);
        // })
        // .then((res) => {
        //   console.log(res);
        // });
      }

      // on extension update
      // if (details.reason === "update") {
      // }
    });

    // MARK: - Toggle
    // extension icon clicked
    browser.action.onClicked.addListener((tab) => {
      toggleSearch();
    });

    // extension shortcut key pressed
    browser.commands.onCommand.addListener((command) => {
      console.log(`Command: ${command}`);
      if (command === "toggle-search") {
        toggleSearch();
      }
    });

    // MARK: - Messages
    browser.runtime.onMessage.addListener((message) => {
      if (message.message === "open-options") {
        browser.runtime.openOptionsPage();
      }
    });
  },
});
