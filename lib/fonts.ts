const loadFonts = () => {
	const vendor = browser.runtime.getURL("/").replace(/\/$/, "");
	const fonts = [
		new FontFace("Poppins", `url("${vendor}/fonts/Poppins/Poppins-Regular.ttf")`, {
			weight: "400",
			style: "normal",
		}),
		new FontFace("Poppins", `url("${vendor}/fonts/Poppins/Poppins-SemiBold.ttf")`, {
			weight: "600",
			style: "normal",
		}),
	];
	for (const font of fonts) {
		document.fonts.add(font);
	}
};

export { loadFonts };
