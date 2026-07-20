import ReactDOM from "react-dom/client";
import App from "./App";
import Pdf from "./Pdf";
import { loadFonts } from "@/lib/fonts";

const isPdfUrl = (url: string): boolean => {
	return (
		url.toLowerCase().endsWith(".pdf") ||
		(url.startsWith("file://") && url.toLowerCase().endsWith(".pdf"))
	);
};

export default defineContentScript({
	matches: ["<all_urls>"],
	cssInjectionMode: "ui",

	async main(ctx) {
		const ui = await createShadowRootUi(ctx, {
			name: "text-search-pro-shadow-root-ui",
			position: "overlay",
			alignment: "top-right",
			anchor: "body",
			append: (anchor, ui) => {
				ui.setAttribute("style", "float: right;");
				anchor.insertBefore(ui, anchor.firstChild);
			},
			onMount: (container) => {
				const rootNode = container.getRootNode() as ShadowRoot & {
					fonts?: FontFaceSet;
				};
				const fontSet = rootNode.fonts ?? document.fonts;
				loadFonts(fontSet);

				const wrapper = document.createElement("div");
				container.append(wrapper);

				const root = ReactDOM.createRoot(wrapper);
				const isPdf = isPdfUrl(window.location.href);
				root.render(isPdf ? <Pdf url={window.location.href} /> : <App />);
				return { root, wrapper };
			},
			onRemove: (elements) => {
				elements?.root.unmount();
				elements?.wrapper.remove();
			},
		});

		ui.mount();
	},
});
