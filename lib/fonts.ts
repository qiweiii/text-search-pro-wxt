const createFonts = () => {
	const vendor = browser.runtime.getURL("/").replace(/\/$/, "");
	return [
		new FontFace("Poppins", `url("${vendor}/fonts/Poppins/Poppins-Regular.ttf")`, {
			weight: "400",
			style: "normal",
		}),
		new FontFace(
			"Poppins",
			`url("${vendor}/fonts/Poppins/Poppins-SemiBold.ttf")`,
			{
				weight: "600",
				style: "normal",
			},
		),
	];
};

const loadFonts = async (fontSet: FontFaceSet) => {
	const fonts = createFonts();
	for (const font of fonts) {
		try {
			const loaded = await font.load();
			fontSet.add(loaded);
		} catch (error) {
			console.error("Failed to load font:", error);
		}
	}
};

export { loadFonts };