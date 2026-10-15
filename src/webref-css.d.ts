declare module '@webref/css' {
	interface CssProperty {
		name: string;
		/** The value grammar, absent for a few legacy entries. */
		syntax?: string;
		initial: string;
		appliesTo: string;
		inherited: string;
		percentages: string;
		computedValue: string;
		canonicalOrder: string;
		animationType: string;
	}

	interface CssType {
		name: string;
		syntax?: string;
	}

	interface IndexedCssData {
		properties: Record<string, CssProperty>;
		/** Value types like `display-inside`, keyed without the angle brackets. */
		types: Record<string, CssType>;
	}

	interface CssModule {
		index: () => Promise<IndexedCssData>;
	}

	const css: CssModule;
	export default css;
}
