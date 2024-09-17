import { defineConfig } from "wxt";
// import { viteStaticCopy } from "vite-plugin-static-copy";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    short_name: "Text Search Pro",
    name: "Text Search Pro",
    // need storage for set local storage in content script
    // need identity for user id
    permissions: ["storage"],
    action: {
      default_title: "Open Text Search Pro",
    },
    commands: {
      "toggle-search": {
        suggested_key: {
          default: "Alt+F",
        },
        description: "show search box",
      },
    },
    web_accessible_resources: [
      {
        resources: ["fonts/**/*"],
        matches: ["<all_urls>"],
      },
    ],
    host_permissions: ["<all_urls>"],
  },
  // vite: () => ({
  //   plugins: [
  //     viteStaticCopy({
  //       targets: [
  //         {
  //           src: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  //           dest: ".",
  //         },
  //       ],
  //     }),
  //   ],
  // }),
});
