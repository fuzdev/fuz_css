<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {tome_get_by_slug} from '@fuzdev/fuz_ui/tome.js';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import SourceFileLink from '$routes/SourceFileLink.svelte';
	import Introduction from '$routes/Introduction.svelte';

	const LIBRARY_ITEM_NAME = 'introduction';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<section>
		<Introduction />
		<TomeSection>
			<TomeSectionHeader text="Usage" />
			<Code lang={null} content="npm i -D @fuzdev/fuz_css" />
			<p>
				Use the <TomeLink slug="classes" hash="Vite-plugin">Vite plugin</TomeLink> or
				<TomeLink slug="classes" hash="Gro-generator">Gro generator</TomeLink> for bundled CSS that includes
				theme variables, base styles, and utility classes in a single import:
			</p>
			<Code
				lang="ts"
				content={`// bundled mode (recommended)
// includes only used base styles, variables, and utilities
import 'virtual:fuz.css'; // Vite plugin
// or
import './fuz.css'; // Gro generator`}
			/>
			<p>
				For projects managing their own theme or base styles, use utility-only mode with separate
				imports:
			</p>
			<Code
				lang="ts"
				content={`// utility-only mode - full package CSS, only used utilities
import '@fuzdev/fuz_css/style.css'; // all base styles
import '@fuzdev/fuz_css/theme.css'; // all variables
import 'virtual:fuz.css'; // used utilities, \`base_css: null, variables: null\``}
			/>
			<p>
				See the <TomeLink slug="classes" /> reference for setup details and configuration options.
			</p>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Details" />
			<ul>
				<li>plain CSS</li>
				<li>minimal dependencies, all optional -- none needed if you only use the stylesheets</li>
				<li>
					exports a reset stylesheet with <TomeLink slug="semantic" /> defaults that styles HTML elements,
					and also exports the underlying data, helpers, and types for open-ended usage
				</li>
				<li>
					supports <TomeLink slug="themes" /> with a basic theme stylesheet, <SourceFileLink
						path="theme.css"
					/>, that can be replaced with your own -- dark mode is a first-class concept, not a theme;
					instead, each theme can support light and/or dark <MdnLink path="Web/CSS/color-scheme"
						>color-schemes</MdnLink
					>
				</li>
				<li>
					supports optional <TomeLink slug="classes">utility classes</TomeLink> with three types (token,
					composite, CSS-literal) and modifiers for responsive, state, color-scheme, and pseudo-elements
				</li>
				<li>
					uses its own concept of style <TomeLink slug="variables" />, a specialization of CSS
					custom properties and design tokens that integrate with the other systems (e.g. the reset
					stylesheet and token classes use variables, and themes are groups of variables)
				</li>
				<li>
					the stylesheets work with any framework and plain HTML; utility class generation supports
					Svelte, JSX, and TypeScript/JS -- see the utility class
					<TomeLink slug="classes" hash="Framework-support">framework support</TomeLink>, and for
					the companion Svelte integration see
					<a href="https://ui.fuz.dev/docs/ThemeRoot"><code>ThemeRoot</code></a> in
					<a href="https://ui.fuz.dev/">fuz_ui</a>
				</li>
				<li>
					see the <TomeLink slug="classes" hash="Compared-to-alternatives"
						>comparison to alternatives</TomeLink
					> to understand fuz_css relative to TailwindCSS and UnoCSS
				</li>
			</ul>
		</TomeSection>
	</section>
</TomeContent>
