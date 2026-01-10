declare module '@webref/css' {
	interface CssProperty {
		name: string;
		value: string;
		initial: string;
		appliesTo: string;
		inherited: string;
		percentages: string;
		computedValue: string;
		canonicalOrder: string;
		animationType: string;
	}

	interface IndexedCssData {
		properties: Record<string, CssProperty>;
	}

	interface CssModule {
		index: () => Promise<IndexedCssData>;
	}

	const css: CssModule;
	export default css;
}
