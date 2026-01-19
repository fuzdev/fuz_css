<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import DeclarationLink from '@fuzdev/fuz_ui/DeclarationLink.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';

	const LIBRARY_ITEM_NAME = 'classes';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<p>
		fuz_css has two categories of CSS classes: utilities and builtins. Builtins are baked into the
		main stylesheet; utility classes have three types, are optional, and require build tool
		integration.
	</p>
	<TomeSection>
		<TomeSectionHeader text="Utility class types" />
		<p>
			Utility classes complement <TomeLink name="semantic">semantic styles</TomeLink> and
			<TomeLink name="variables">style variables</TomeLink>. Use them to compose styles across
			component boundaries, or when you prefer classes to the <code>&lt;style&gt;</code> tag and
			<code>style</code> attribute. They're generated on-demand to include only what you use, and they're
			totally optional.
		</p>
		<p>
			Compared to TailwindCSS and UnoCSS, fuz_css utility classes follow the grain of semantic HTML
			rather than being foundational to the design, and the DSL is currently more limited, with
			interpreters providing a programmatic escape hatch -- see the
			<a href="#Compared-to-alternatives">comparison</a> below.
		</p>
		<p>Compared to the <code>&lt;style&gt;</code> tag, classes:</p>
		<ul>
			<li>
				offer shorthand for style variables (<code>p_lg</code> vs
				<code>padding: var(--space_lg)</code>)
			</li>
			<li>
				compose across component boundaries, avoiding fragile <code>:global()</code> selectors
			</li>
			<li>avoid noisy class names like <code>foo-wrapper</code> and <code>bar-inner</code></li>
		</ul>
		<p>Compared to the <code>style</code> attribute, classes:</p>
		<ul>
			<li>
				support powerful modifiers for responsive widths, interaction states (like hover), and dark
				mode
			</li>
			<li>provide more control over specificity</li>
			<li>
				compose ergonomically with libraries like <a href="https://github.com/lukeed/clsx">clsx</a>,
				which Svelte supports <a href="https://svelte.dev/docs/svelte/class">natively</a>
			</li>
		</ul>
		<p>
			For cases where classes lack clear advantages, <code>style</code> and
			<code>&lt;style&gt;</code>
			are simpler and avoid generating class definitions, which can bloat your builds when overused.
		</p>

		<TomeSection>
			<TomeSectionHeader text="Token classes" tag="h3" />
			<p>
				Token classes map to <TomeLink name="variables">style variables</TomeLink> (design tokens). For
				raw CSS values, use <a href="#Literal-classes">literal classes</a> instead.
			</p>
			<Code content="<div class=&quot;p_md gap_lg color_a_5&quot;>" />
			<p>
				Token classes use <code>snake_case</code> because style variables are designed for optional
				use in JS -- imported from <ModuleLink module_path="variables.ts" />, but costing nothing
				otherwise -- so each name is consistent across both JS and CSS, instead of converting
				between
				<code>kebab-case</code>
				and <code>camelCase</code>. This also makes token classes visually distinct from
				<a href="#Literal-classes">literal classes</a>; we find this improves readability.
			</p>
			<h4>Spacing</h4>
			<ul class="unstyled">
				<li><code>.p|pt|pr|pb|pl|px|py_xs5-xl15|0</code></li>
				<li><code>.m|mt|mr|mb|ml|mx|my_xs5-xl15|0|auto</code></li>
				<li><code>.gap|column_gap|row_gap_xs5-xl15</code></li>
				<li><code>.top|bottom|left|right_xs5-xl15</code></li>
				<li><code>.inset_xs5-xl15</code></li>
			</ul>
			<aside class="mt_lg">
				Padding and margin shorthands include <code>_0</code> (and <code>_auto</code> for margin)
				for ergonomics: <code>px_0</code> is much shorter than
				<code>padding-inline:0</code>. Other properties use literals for raw values.
			</aside>
			<h4>Sizing</h4>
			<ul class="unstyled">
				<li><code>.width|height_xs5-xl15</code></li>
			</ul>
			<h4>Colors</h4>
			<ul class="unstyled">
				<li><code>.color_a-j_1-9</code></li>
				<li><code>.bg</code>, <code>.fg</code>, <code>.bg|fg_1-9</code></li>
				<li><code>.bg_a-j_1-9</code></li>
				<li><code>.text_color_0-10</code></li>
				<li><code>.color_bg|fg_1-9</code> - text color using bg/fg</li>
				<li><code>.darken|lighten_1-9</code> - background shading</li>
				<li><code>.color_darken|lighten_1-9</code> - text shading</li>
				<li><code>.hue_a-j</code></li>
			</ul>
			<h4>Typography</h4>
			<ul class="unstyled">
				<li><code>.font_family_sans|serif|mono</code></li>
				<li><code>.font_size_xs-xl9</code></li>
				<li><code>.line_height_xs-xl</code></li>
				<li><code>.icon_size_xs-xl3</code></li>
			</ul>
			<h4>Borders</h4>
			<ul class="unstyled">
				<li><code>.border_color_1-5</code></li>
				<li><code>.border_color_a-j</code></li>
				<li><code>.border_width_1-9</code></li>
				<li><code>.border_radius_xs3-xl</code></li>
				<li><code>.border_top|bottom_left|right_radius_xs3-xl</code></li>
				<li><code>.outline_width_1-9|focus|active</code></li>
				<li><code>.outline_color_1-5</code></li>
				<li><code>.outline_color_a-j</code></li>
			</ul>
			<h4>Shadows</h4>
			<ul class="unstyled">
				<li><code>.shadow_xs-xl</code></li>
				<li><code>.shadow_top|bottom_xs-xl</code></li>
				<li><code>.shadow_inset_xs-xl</code></li>
				<li><code>.shadow_inset_top|bottom_xs-xl</code></li>
				<li><code>.shadow_color_a-j</code></li>
				<li><code>.shadow_color_highlight|glow|shroud</code></li>
				<li><code>.shadow_alpha_1-5</code></li>
			</ul>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Composite classes" tag="h3" />
			<p>
				Composites let you name and reuse patterns, extending the class system with your own
				vocabulary. They have four forms: raw CSS declarations, composition of other classes, a
				combination of both, or full rulesets as an escape hatch for multi-selector patterns (child
				selectors, sibling combinators, etc.).
			</p>

			<h4>Four definition forms</h4>
			<p>
				All four of these produce the same CSS output for <code>.centered</code>, with the ruleset
				form additionally demonstrating child selectors -- <code>&gt; * + *</code> -- which can't be expressed
				with the other forms.
			</p>
			<Code
				lang="typescript"
				content={`import type {CssClassDefinition} from '@fuzdev/fuz_css/css_class_generation.js';

export const custom_composites: Record<string, CssClassDefinition> = {
	// 1. declaration only - custom CSS properties
	centered: {
		declaration: \`
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			text-align: center;
		\`,
	},

	// 2. composes only - compose existing token/composite classes
	centered: {
		composes: ['box', 'text-align:center'],
	},

	// 3. composes + declaration - compose then extend
	centered: {
		composes: ['box'],
		declaration: 'text-align: center;',
	},

	// 4. ruleset - full CSS with multiple selectors (not composable)
	centered: {
		ruleset: \`
			.centered {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				text-align: center;
			}
			/* child selectors, pseudo-classes on children, etc */
			.centered > * + * {
				margin-top: var(--space_md);
			}
		\`,
	},
};`}
			/>
			<p>Generated CSS:</p>
			<Code
				lang="css"
				content={`.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}`}
			/>
			<p>And the ruleset form (4) includes the additional selector:</p>
			<Code
				lang="css"
				content={`.centered > * + * {
  margin-top: var(--space_md);
}`}
			/>

			<h4>Nesting</h4>
			<p>
				Composites can compose other composites, enabling layered abstractions. Resolution is
				depth-first: nested composes are fully resolved before the parent's
				<code>declaration</code> is appended. Circular references are detected and produce an error.
			</p>

			<h4>What <code>composes</code> can reference</h4>
			<p>
				The <code>composes</code> property resolves referenced classes and combines their
				declarations. When both <code>composes</code> and <code>declaration</code> are present, the explicit
				declaration comes last (winning in the cascade for duplicate properties).
			</p>
			<ul>
				<li>
					token classes (<code>p_lg</code>, <code>color_a_5</code>) - resolved to their declarations
				</li>
				<li>
					composites with <code>declaration</code> - the declaration is included
				</li>
				<li>
					composites with <code>composes</code> - recursively resolved
				</li>
				<li>
					unmodified CSS literals (<code>text-align:center</code>, <code>margin:0~auto</code>,
					<code>--my-var:value</code>) - parsed and included as declarations
				</li>
			</ul>
			<p>
				<strong>Not allowed:</strong> Composites with <code>ruleset</code> cannot be referenced in
				<code>composes</code> because they define their own selectors. Modified classes (like
				<code>hover:opacity:80%</code> or <code>md:p_lg</code>) cannot be used in
				<code>composes</code> arrays because they require wrapper selectors -- apply them directly
				in markup instead. The <code>composes</code> property merges declarations into a single
				rule, but multi-selector patterns like <code>.clickable:hover {'{ ... }'}</code> cannot be
				inlined. These limitations may be revisited in the future, feedback is welcome in the
				<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.
			</p>
			<aside>
				<p>The system tries to give helpful errors:</p>
				<ul>
					<li>
						property typos like <code>disply:flex</code> suggest <code>display</code>
					</li>
					<li>modifier typos like <code>hovr:box</code> suggest <code>hover:box</code></li>
					<li>
						ruleset classes in <code>composes</code> produce:
						<code>Cannot reference ruleset class "clickable" in composes array</code>
					</li>
					<li>
						circular references produce:
						<code>Circular reference detected: a → b → a</code>
					</li>
				</ul>
			</aside>

			<h4>Modifiers</h4>
			<p>
				Composites support <a href="#Modifiers">modifiers</a> like any other class. For
				<code>composes</code> and
				<code>declaration</code>
				composites, declarations are combined and wrapped. For <code>ruleset</code> composites, modifiers
				are applied to each selector (with smart conflict detection):
			</p>
			<Code
				content={`<!-- hover:foo resolves foo's \`composes\`, applies :hover -->
<div class="hover:foo md:dark:foo md:clickable">`}
			/>

			<h4>Registering composites</h4>
			<p>Register custom composites with the Vite plugin or Gro generator:</p>
			<h5>Vite plugin</h5>
			<Code
				lang="typescript"
				content={`// vite.config.ts
import {custom_composites} from './src/lib/composites.js';

vite_plugin_fuz_css({
	class_definitions: custom_composites,
}),`}
			/>
			<h5>Gro generator</h5>
			<Code
				lang="typescript"
				content={`// fuz.gen.css.ts
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';
import {custom_composites} from '$lib/composites.js';

export const gen = gen_fuz_css({
	class_definitions: custom_composites,
});`}
			/>

			<h4>Builtin composites</h4>
			<p>
				<strong>Composable</strong> (can be used in <code>composes</code> arrays):
			</p>
			<ul>
				<li><code>.box</code> - centered flex container</li>
				<li><code>.row</code> - horizontal flex row</li>
				<li><code>.column</code> - vertical flex column</li>
				<li><code>.ellipsis</code> - text overflow ellipsis</li>
				<li><code>.pane</code> - pane container</li>
				<li><code>.panel</code> - panel container</li>
				<li><code>.icon_button</code> - icon button styling</li>
				<li><code>.pixelated</code> - crisp pixel-art rendering</li>
				<li><code>.circular</code> - 50% border-radius</li>
				<li>
					<code>.width_upto_xs-xl</code> / <code>.width_atleast_xs-xl</code> - width constraints
				</li>
				<li>
					<code>.height_upto_xs-xl</code> / <code>.height_atleast_xs-xl</code> - height constraints
				</li>
			</ul>
			<p>
				<strong>Ruleset-based</strong> (multi-selector, apply directly in markup):
			</p>
			<ul>
				<li><code>.selectable</code> - selectable element styling</li>
				<li><code>.clickable</code> - clickable element styling</li>
				<li><code>.plain</code> - plain/reset styling</li>
				<li><code>.menu_item</code> - menu item styling</li>
				<li><code>.chevron</code> - chevron indicator</li>
				<li><code>.chip</code> - chip/tag styling</li>
			</ul>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Literal classes" tag="h3" />
			<p>
				Fuz supports an open-ended CSS-literal syntax: <code>property:value</code>. Any CSS property
				and value works, offering arbitrary styles without a DSL.
			</p>
			<Code
				content={`<!-- basic syntax: property:value -->
<div class="display:flex justify-content:center">

<!-- multi-value properties use ~ for spaces -->
<div class="margin:1px~3rem">

<!-- numeric values -->
<div class="opacity:50% font-weight:700 z-index:100">

<!-- arbitrary CSS values -->
<div class="width:calc(100%~-~20px)">

<!-- custom properties -->
<div class="--foo-bg:#abc">`}
			/>
			<p>
				The <code>~</code> character represents a space in class names (since CSS classes can't
				contain spaces). Use it for multi-value properties like <code>margin:1px~auto</code>.
			</p>
			<p>
				Custom properties work directly: <code>--my-var:value</code> sets the property on the element.
				This is useful for scoped variables or passing values to child components.
			</p>
		</TomeSection>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Modifiers" />
		<p>
			Modifiers prefix any class type -- token, composite, or literal -- to apply styles
			conditionally based on viewport, state, or color scheme. This is what makes utility classes
			more powerful than inline styles.
		</p>

		<h4>Responsive modifiers</h4>
		<p>Mobile-first breakpoints:</p>
		<table>
			<thead>
				<tr>
					<th>Prefix</th>
					<th>Width</th>
					<th>CSS</th>
				</tr>
			</thead>
			<tbody>
				<tr
					><td><code>sm:</code></td><td>40rem (640px)</td><td
						><code>@media (width >= 40rem)</code></td
					></tr
				>
				<tr
					><td><code>md:</code></td><td>48rem (768px)</td><td
						><code>@media (width >= 48rem)</code></td
					></tr
				>
				<tr
					><td><code>lg:</code></td><td>64rem (1024px)</td><td
						><code>@media (width >= 64rem)</code></td
					></tr
				>
				<tr
					><td><code>xl:</code></td><td>80rem (1280px)</td><td
						><code>@media (width >= 80rem)</code></td
					></tr
				>
				<tr
					><td><code>2xl:</code></td><td>96rem (1536px)</td><td
						><code>@media (width >= 96rem)</code></td
					></tr
				>
			</tbody>
		</table>
		<Code
			content={`<!-- stack on mobile, row on medium screens and up -->
<div class="display:flex flex-direction:column md:flex-direction:row">

<!-- hide on mobile -->
<nav class="display:none md:display:flex">`}
		/>
		<p>
			Max-width variants (<code>max-sm:</code>, <code>max-md:</code>, etc.) and arbitrary
			breakpoints (<code>min-width(800px):</code>,
			<code>max-width(600px):</code>) are also available.
		</p>

		<h4>State modifiers</h4>
		<p>Pseudo-class modifiers for interaction and form states:</p>
		<Code
			content={`<!-- hover and focus effects -->
<button class="hover:background-color:var(--color_a_6) focus:outline:2px~solid~var(--color_a_5)">

<!-- form validation states -->
<input class="invalid:border-color:var(--color_c_5) disabled:opacity:50%">

<!-- structural selectors -->
<li class="first:border-top:none last:border-bottom:none odd:background-color:var(--fg_1)">`}
		/>
		<p>Available state modifiers include:</p>
		<ul>
			<li>
				<strong>interaction:</strong> <code>hover:</code>, <code>focus:</code>,
				<code>focus-visible:</code>, <code>focus-within:</code>, <code>active:</code>,
				<code>visited:</code>, <code>target:</code>
			</li>
			<li>
				<strong>form:</strong> <code>disabled:</code>, <code>enabled:</code>, <code>checked:</code>,
				<code>indeterminate:</code>, <code>required:</code>, <code>optional:</code>,
				<code>valid:</code>, <code>invalid:</code>, <code>user-valid:</code>,
				<code>user-invalid:</code>, <code>in-range:</code>, <code>out-of-range:</code>,
				<code>placeholder-shown:</code>, <code>read-only:</code>, <code>read-write:</code>,
				<code>default:</code>
			</li>
			<li>
				<strong>structural:</strong> <code>first:</code>, <code>last:</code>, <code>only:</code>,
				<code>odd:</code>, <code>even:</code>, <code>empty:</code>, <code>nth-child(N):</code>,
				<code>nth-of-type(N):</code>
			</li>
			<li>
				<strong>UI states:</strong> <code>fullscreen:</code>, <code>modal:</code>,
				<code>popover-open:</code>
			</li>
		</ul>

		<h4>Color-scheme modifiers</h4>
		<p>Apply styles in dark or light mode:</p>
		<Code
			content={`<!-- reduce shadow intensity in dark mode -->
<div class="shadow_lg dark:shadow_sm">

<!-- different border in light mode -->
<div class="border:1px~solid~var(--fg_2) light:border:1px~solid~var(--fg_5)">`}
		/>
		<p>
			<code>dark:</code> and <code>light:</code> use <code>:root.dark</code> and
			<code>:root.light</code>
			selectors, matching fuz_css's color scheme mechanism.
		</p>

		<h4>Pseudo-element modifiers</h4>
		<p>Style generated content and element parts:</p>
		<Code
			content={`<!-- decorative element (explicit content required) -->
<div class="before:content:'' before:display:block before:width:2rem before:height:2rem before:background:var(--color_a_5)">

<!-- placeholder styling -->
<input class="placeholder:color:var(--text_color_3) placeholder:font-style:italic">`}
		/>
		<p>
			Available: <code>before:</code>, <code>after:</code>, <code>placeholder:</code>,
			<code>selection:</code>,
			<code>marker:</code>, <code>file:</code>, <code>backdrop:</code>
		</p>
		<aside>
			Note: <code>before:</code> and <code>after:</code> require explicit
			<code>content</code>
			- there's no auto-injection. This maintains the 1:1 CSS mapping principle.
		</aside>

		<h4>Media feature modifiers</h4>
		<p>Accessibility and context-aware styles:</p>
		<Code
			content={`<!-- respect motion preferences -->
<div class="motion-safe:transition:transform~0.3s~ease-out motion-reduce:transition:none">

<!-- print-specific styles -->
<nav class="print:display:none">`}
		/>
		<p>
			Available: <code>print:</code>, <code>motion-safe:</code>, <code>motion-reduce:</code>,
			<code>contrast-more:</code>, <code>contrast-less:</code>, <code>portrait:</code>,
			<code>landscape:</code>, <code>forced-colors:</code>
		</p>

		<TomeSection>
			<TomeSectionHeader text="Combining modifiers" tag="h3" />
			<p>
				Combined modifiers follow a canonical order enforced with errors that guide you. Multiple
				states must be alphabetical (<code>focus:hover:</code> not <code>hover:focus:</code>)
				because both generate equivalent CSS -- canonical ordering prevents duplicates.
			</p>
			<Code content="[media:][ancestor:][...state:][pseudo-element:]class" />
			<ol>
				<li>
					<strong>media</strong> - one of <code>md:</code>, <code>lg:</code>, <code>print:</code>,
					etc
				</li>
				<li>
					<strong>ancestor</strong> - one of <code>dark:</code> or <code>light:</code> (likely
					<code>rtl:</code>/<code>ltr:</code> in the future)
				</li>
				<li>
					<strong>state</strong> - any of <code>hover:</code>, <code>focus:</code>,
					<code>disabled:</code>, etc, sorted alphabetically
				</li>
				<li>
					<strong>pseudo-element</strong> - one of <code>before:</code>, <code>after:</code>,
					<code>placeholder:</code>, etc
				</li>
			</ol>
			<Code
				content={`<!-- media + ancestor + state -->
<div class="md:dark:hover:opacity:83%">

<!-- media + state + pseudo-element -->
<div class="md:hover:before:opacity:100%">

<!-- multiple states must be alphabetical -->
<button class="focus:hover:outline:2px~solid~blue">`}
			/>
			<p>Generated CSS for <code>md:dark:hover:opacity:83%</code>:</p>
			<Code
				lang="css"
				content={`@media (width >= 48rem) {
  :root.dark .md\\:dark\\:hover\\:opacity\\:83\\%:hover {
    opacity: 83%;
  }
}`}
			/>
		</TomeSection>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Usage" />
		<Code lang={null} content="npm i -D @fuzdev/fuz_css" />
		<p>Import the two required stylesheets:</p>
		<Code
			lang="ts"
			content={`import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css'; // or bring your own`}
		/>
		<p>
			Utility classes are generated on-demand, including only the classes your code uses. Use the
			<strong>Vite plugin</strong> for a virtual module, or the alternative
			<strong>Gro generator</strong> for a static file.
		</p>

		<TomeSection>
			<TomeSectionHeader text="Vite plugin" tag="h3" />
			<p>
				The Vite plugin extracts classes and generates CSS on-demand. It works with Svelte and plain
				HTML/TS/JS out of the box. JSX frameworks (React, Preact, Solid) require the
				<code>acorn-jsx</code> plugin -- see <a href="#React-and-JSX">React and JSX</a> below.
			</p>
			<Code
				lang="ts"
				content={`// vite.config.ts
import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
  plugins: [sveltekit(), vite_plugin_fuz_css()],
});`}
			/>
			<p>
				Import the virtual module in your entry file, <code>src/routes/+layout.svelte</code> for SvelteKit:
			</p>
			<Code
				lang="ts"
				content={`import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css'; // or bring your own
import 'virtual:fuz.css'; // generated on-demand`}
			/>
			<p>
				The plugin extracts classes from files as Vite processes them, including from
				<code>node_modules</code> dependencies. It supports HMR -- changes to classes trigger automatic
				CSS updates.
			</p>
			<h4>Plugin options</h4>
			<ul>
				<li>
					<code>acorn_plugins</code> - required for JSX frameworks. Use <code>acorn-jsx</code>.
				</li>
				<li>
					<code>include_classes</code> - classes to always include (for dynamic patterns that can't be
					statically extracted)
				</li>
				<li>
					<code>exclude_classes</code> - classes to exclude from output
				</li>
				<li>
					<code>class_definitions</code> - custom class definitions to merge with defaults; can
					define new classes or override existing ones (see
					<a href="#Composite-classes">composite classes</a>)
				</li>
				<li>
					<code>class_interpreters</code> - custom interpreters for dynamic class generation. Replaces
					the default interpreters entirely if provided; most users don't need this.
				</li>
				<li>
					<code>include_default_definitions</code> - set to <code>false</code> to use only your own
					<code>class_definitions</code>, excluding all default token and composite classes
				</li>
				<li>
					<code>filter_file</code> - custom filter for which files to process. Receives
					<code>(id: string)</code> and returns <code>boolean</code>:
					<Code
						lang="ts"
						content="filter_file: (id) => id.endsWith('.svelte') && !id.includes('/legacy/'),"
					/>
				</li>
				<li>
					<code>on_error</code> - <code>'log'</code> or <code>'throw'</code>. Defaults to
					<code>'throw'</code> in CI, <code>'log'</code> otherwise.
				</li>
				<li>
					<code>on_warning</code> - <code>'log'</code>, <code>'throw'</code>, or
					<code>'ignore'</code>. Defaults to <code>'log'</code>.
				</li>
				<li>
					<code>cache_dir</code> - cache location (default: <code>.fuz/cache/css</code>)
				</li>
			</ul>
			<h4>TypeScript setup</h4>
			<p>Add the virtual module declaration to your <code>vite-env.d.ts</code>:</p>
			<Code
				lang="ts"
				content={`/// <reference types="vite/client" />

declare module 'virtual:fuz.css' {
  const css: string;
  export default css;
}`}
			/>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Gro generator" tag="h3" />
			<p>
				For projects using <a href="https://github.com/ryanatkn/gro">Gro</a>, create a
				<code>*.gen.css.ts</code> file anywhere in <code>src/</code>:
			</p>
			<Code
				lang="ts"
				content={`// src/routes/fuz.gen.css.ts for SvelteKit,
// or src/fuz.gen.css.ts, src/fuzClasses.gen.css.ts, etc
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';

export const gen = gen_fuz_css();`}
			/>
			<p>
				Then import the generated file, in <code>src/routes/+layout.svelte</code> for SvelteKit:
			</p>
			<Code
				lang="ts"
				content={`import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css'; // or bring your own
import './fuz.css'; // generated by Gro`}
			/>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Class detection" tag="h3" />
			<p>
				The extractor scans your source files and extracts class names using three automatic
				mechanisms, plus manual hints for edge cases:
			</p>

			<h4>1. Direct extraction from class attributes</h4>
			<p>String literals and expressions in class contexts are extracted directly:</p>
			<ul>
				<li><code>class="..."</code> - static strings</li>
				<li>
					<code>{'class={[...]}'}</code> - array syntax (for clsx-compatible frameworks like Svelte)
				</li>
				<li>
					<code>{'class={{...}}'}</code> - object syntax (for clsx-compatible frameworks like Svelte)
				</li>
				<li><code>{"class={cond ? 'a' : 'b'}"}</code> - ternary expressions</li>
				<li><code>{"class={(cond && 'a') || 'b'}"}</code> - logical expressions</li>
				<li><code>class:name</code> - class directives (Svelte)</li>
				<li>
					<code>clsx()</code>, <code>cn()</code>, <code>cx()</code>, <code>classNames()</code> - utility
					function calls
				</li>
			</ul>

			<h4>2. Naming convention</h4>
			<p>
				Variables ending with <code>class</code>, <code>classes</code>, <code>className</code>,
				<code>classNames</code>, <code>class_name</code>, or <code>class_names</code> (case-insensitive)
				are always extracted, regardless of where they're used:
			</p>
			<Code
				lang="typescript"
				content={`// extracted because of naming convention
const buttonClasses = 'color_d font_size_lg';
const buttonClass = active ? 'active' : null;
const snake_class = 'snake';
const turtle_class_name = 'turtle';`}
			/>

			<h4>3. Usage tracking</h4>
			<p>
				Variables used in class attributes are tracked back to their definitions, even if they don't
				follow the naming convention:
			</p>
			<!-- eslint-disable-next-line no-useless-concat -->
			<Code
				lang="svelte"
				content={'<' +
					`script>
	const styles = 'some-class';   // tracked from class={styles}
	const variant = 'other-class'; // tracked from clsx()
</script>

<div class={styles}></div>
<button class={clsx('color_d', variant)}></button>`}
			/>
			<p>
				Usage tracking works for variables inside <code>clsx()</code>, arrays, ternaries, and
				logical expressions within class attributes. Note that standalone <code>clsx()</code> calls outside
				class attributes don't trigger tracking -- use the naming convention for those cases.
			</p>
			<aside>
				Currently, tracking is single-file only. Cross-module analysis and more sophisticated
				inference are potential future improvements.
			</aside>

			<h4>4. Manual hints</h4>
			<p>
				For dynamically constructed classes that can't be statically analyzed, use the <code
					>@fuz-classes</code
				> comment:
			</p>
			<Code
				lang="typescript"
				content={`// @fuz-classes opacity:50% opacity:75% opacity:100%
const opacity_classes = [50, 75, 100].map((n) => \`opacity:\${n}%\`);

/* @fuz-classes color_a_5 color_b_5 color_c_5 */
const color = get_dynamic_color();`}
			/>
			<p>
				Alternatively, use the <DeclarationLink name="GenFuzCssOptions"
					>include_classes</DeclarationLink
				> option in your generator config:
			</p>
			<Code
				lang="ts"
				content={`import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';

export const gen = gen_fuz_css({
	include_classes: ['opacity:50%', 'opacity:75%', 'opacity:100%'],
});`}
			/>
			<p>
				Use <DeclarationLink name="GenFuzCssOptions">exclude_classes</DeclarationLink> to filter out false
				positives from extraction:
			</p>
			<Code
				lang="ts"
				content={`export const gen = gen_fuz_css({
	exclude_classes: ['some:false:positive'],
});`}
			/>
		</TomeSection>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Builtin classes" />
		<p>
			fuz_css's <ModuleLink module_path="style.css">main stylesheet</ModuleLink> provides styles for base
			HTML elements using <TomeLink name="variables">style variables</TomeLink>, acting as a modern
			CSS reset that adapts to dark mode. It includes CSS classes that provide common generic
			functionality -- these are called builtin classes.
		</p>
		<h4><code>.unstyled</code></h4>
		<p>Default list (styled):</p>
		<Code
			content={`<ul>
	<li>1</li>
	<li>2</li>
</ul>`}
		/>
		<ul>
			<li>1</li>
			<li>2</li>
		</ul>
		<p>With <code>.unstyled</code>:</p>
		<Code
			content={`<ul class="unstyled">
	<li>a</li>
	<li>b</li>
</ul>`}
		/>
		<ul class="unstyled">
			<li>a</li>
			<li>b</li>
		</ul>
		<p>
			The <code>.unstyled</code> class lets fuz_css provide solid default element styles with a simple
			opt-out:
		</p>
		<Code
			lang="css"
			content={`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--space_xl4);
}`}
		/>
		<p>This strategy supports semantic hooks for theming:</p>
		<Code
			lang="css"
			content={`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--list_padding_left, var(--space_xl4));
}`}
		/>
		<aside>
			The <code>:where()</code> selector keeps specificity as low as possible to minimize interference
			with your styles.
		</aside>
		<p>See the specific docs sections for more about <code>.unstyled</code>.</p>

		<h4>Other builtin classes</h4>
		<ul>
			<li><code>.selected</code> - see <TomeLink name="buttons" />, <TomeLink name="forms" /></li>
			<li><code>.disabled</code> - see <TomeLink name="forms" /></li>
			<li><code>.deselectable</code> - see <TomeLink name="buttons" /></li>
			<li><code>.inline</code> - see <TomeLink name="buttons" />, <TomeLink name="forms" /></li>
			<li><code>.heading</code> - see <TomeLink name="typography" /></li>
			<li><code>.title</code> - see <TomeLink name="forms" /></li>
			<li><code>.row</code> - see <TomeLink name="layout" />, <TomeLink name="forms" /></li>
			<li>
				<code>.color_a</code> through <code>.color_j</code> - see <TomeLink name="buttons" />,
				<TomeLink name="colors" />
			</li>
			<li>
				<code>.dark</code>, <code>.light</code> on <code>:root</code> - see <TomeLink
					name="themes"
				/>
			</li>
		</ul>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Framework support" />
		<p>
			fuz_css is Svelte-first, but the base styles (<code>style.css</code>, <code>theme.css</code>)
			work with any framework and plain HTML. The utility class generator has varying
			<a href="#Class-detection">detection</a> support:
		</p>
		<table>
			<thead>
				<tr>
					<th>framework</th>
					<th>detection</th>
					<th>notes</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Svelte</td>
					<td>full</td>
					<td>all patterns including <code>class:</code> directives and array/object syntax</td>
				</tr>
				<tr>
					<td>Plain HTML</td>
					<td>full</td>
					<td>static <code>class="..."</code> attributes</td>
				</tr>
				<tr>
					<td>React / JSX</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>className</code></td>
				</tr>
				<tr>
					<td>Preact</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code></td>
				</tr>
				<tr>
					<td>Solid</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code>, <code>classList</code></td>
				</tr>
				<tr>
					<td>Vue JSX</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code></td>
				</tr>
				<tr>
					<td>Vue SFC, Angular, etc.</td>
					<td>none</td>
					<td
						>template syntax not parsed; use <code>clsx</code>/<code>cx</code>/<code>cn</code> in JS/TS</td
					>
				</tr>
			</tbody>
		</table>
		<p>
			The <DeclarationLink name="GenFuzCssOptions">include_classes</DeclarationLink> plugin config option
			is an escape hatch for classes that can't be statically detected. Other acorn plugins can be added
			via
			<DeclarationLink name="GenFuzCssOptions">acorn_plugins</DeclarationLink> for additional syntax support
			like <a href="#React-and-JSX">JSX</a>.
		</p>
		<p>
			In summary, class generation works only with TypeScript/JS, Svelte, and JSX. Angular is not
			supported; Vue JSX is supported but the recommended SFC format is not. We could revisit this
			if there's demand.
		</p>

		<TomeSection>
			<TomeSectionHeader text="Svelte-first" tag="h3" />
			<p>
				The extractor parses and analyzes the AST to understand <a
					href="https://svelte.dev/docs/svelte/class">Svelte's class syntax</a
				>. Supported constructs:
			</p>
			<ul>
				<li>
					<strong>attributes:</strong> <code>class="..."</code>, <code>{'class={[...]}'}</code>,
					<code>{'class={{...}}'}</code> (identifier and string-literal keys),
					<code>class:name</code>
				</li>
				<li>
					<strong>expressions:</strong> logical (<code>&&</code>,
					<code>||</code>, <code>??</code>), ternaries, template literals (complete tokens only --
					<code>`color_a_5 $&#123;base&#125;`</code> extracts <code>color_a_5</code>, but
					<code>`color_$&#123;hue&#125;_5`</code> cannot be extracted; use <code>@fuz-classes</code>
					or
					<code>include_classes</code>)
				</li>
				<li>
					<strong>Svelte 5 runes:</strong> <code>$derived()</code> and <code>$derived.by()</code> for
					class variables
				</li>
				<li>
					<strong>utility calls:</strong> <code>clsx()</code>, <code>cn()</code>, <code>cx()</code>,
					<code>classNames()</code> with nested arrays, objects, and utility calls
				</li>
				<li>
					<strong>control flow:</strong> classes inside <code>{'{#each}'}</code>,
					<code>{'{#if}'}</code>, <code>{'{#snippet}'}</code>, <code>{'{#await}'}</code>
				</li>
				<li>
					<strong>scripts:</strong> both <code>&lt;script&gt;</code> and
					<code>&lt;script module&gt;</code>, with naming convention and usage tracking
				</li>
			</ul>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="React and JSX" tag="h3" />
			<p>
				To enable JSX support for React, Preact, Solid, etc, install <code>acorn-jsx</code> and pass it
				to the plugin or generator:
			</p>
			<Code lang={null} content="npm i -D acorn-jsx" />
			<h4>Vite plugin</h4>
			<Code
				lang="ts"
				content={`// vite.config.ts
import {defineConfig} from 'vite';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
  plugins: [
    vite_plugin_fuz_css({
      acorn_plugins: [jsx()],
    }),
  ],
});`}
			/>
			<h4>Gro generator</h4>
			<Code
				lang="ts"
				content={`// fuz.gen.css.ts
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';
import jsx from 'acorn-jsx';

export const gen = gen_fuz_css({
	acorn_plugins: [jsx()],
});`}
			/>
			<p>Supported JSX patterns:</p>
			<ul>
				<li>
					<code>className="..."</code> and <code>class="..."</code> - static strings
				</li>
				<li>
					<code>{'className={clsx(...)}'}</code> - utility function calls
				</li>
				<li>
					<code>{'className={cond ? "a" : "b"}'}</code> - ternary and logical expressions
				</li>
				<li>
					<code>{'classList={{active: cond}}'}</code> - Solid's classList
				</li>
				<li>
					usage tracking: variables in <code>className</code>, <code>class</code>, and
					<code>classList</code> are tracked back to their definitions (has limitations, room for improvement)
				</li>
			</ul>
			<Code
				lang="ts"
				content={`// variable tracking works in JSX too
const styles = 'box hover:shadow_lg';
const Component = () => <div className={styles} />;`}
			/>
			<p>
				The <DeclarationLink name="GenFuzCssOptions">acorn_plugins</DeclarationLink> option accepts any
				Acorn-compatible plugin, so other syntax extensions can be supported the same way.
			</p>
		</TomeSection>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Custom interpreters" />
		<p>
			Interpreters dynamically generate CSS for class names that aren't in the static definitions
			(which can be extended via <code>class_definitions</code> or replaced with
			<code>include_default_definitions: false</code>). The default
			<a href="#Literal-classes">CSS-literal syntax</a> and
			<a href="#Modifiers">modifier support</a> are both implemented as interpreters, which you can extend
			or replace.
		</p>
		<p>
			For advanced use cases, you can define custom interpreters that generate CSS from arbitrary
			class name patterns. This is similar to UnoCSS's dynamic rules, which also use regex +
			function patterns. An interpreter has a regex <code>pattern</code> and an
			<code>interpret</code> function that returns CSS (or <code>null</code> to pass):
		</p>
		<Code
			lang="typescript"
			content={`import type {CssClassDefinitionInterpreter} from '@fuzdev/fuz_css/css_class_generation.js';

// Example: grid-cols-N classes like "grid-cols-4"
// Unlike composites, interpreters can parameterize values
const grid_cols_interpreter: CssClassDefinitionInterpreter = {
  pattern: /^grid-cols-(\\d+)$/,
  interpret: (matched) => {
    const n = parseInt(matched[1]!, 10);
    if (n < 1 || n > 24) return null;
    return \`.grid-cols-\${n} { grid-template-columns: repeat(\${n}, minmax(0, 1fr)); }\`;
  },
};`}
		/>
		<p>
			This generates <code>grid-cols-1</code> through <code>grid-cols-24</code> on-demand -- something
			that would require 24 separate composite definitions. Register with the Vite plugin or Gro generator:
		</p>
		<Code
			lang="typescript"
			content={`import {css_class_interpreters} from '@fuzdev/fuz_css/css_class_interpreters.js';

vite_plugin_fuz_css({
  class_interpreters: [grid_cols_interpreter, ...css_class_interpreters],
})`}
		/>
		<p>
			The interpreter context provides access to <code>class_definitions</code>,
			<code>css_properties</code> (for validation), and <code>diagnostics</code> (for errors/warnings).
			This enables full programmatic control over class-to-CSS generation.
		</p>
		<aside>
			Custom interpreters replace the defaults entirely, so include <code
				>...css_class_interpreters</code
			>
			to preserve CSS-literal and modified-class support. This area is experimental and the API may change.
		</aside>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Compared to alternatives" />
		<p>
			TailwindCSS and UnoCSS are utility-first frameworks where classes have primacy. fuz_css is
			semantic-first: utilities complement HTML defaults rather than being the primary styling
			mechanism.
		</p>
		<table>
			<thead>
				<tr>
					<th></th>
					<th>TailwindCSS</th>
					<th>UnoCSS</th>
					<th>fuz_css</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>primary syntax</td>
					<td>DSL-first</td>
					<td>config-first</td>
					<td
						><a href="#Token-classes">token DSL</a> +
						<a href="#Literal-classes">CSS literals</a></td
					>
				</tr>
				<tr>
					<td>multi-property</td>
					<td><code>@apply</code>, plugins</td>
					<td>shortcuts</td>
					<td><a href="#Composite-classes">composites</a></td>
				</tr>
				<tr>
					<td>arbitrary values</td>
					<td>DSL (<code>bg-[#abc]</code>)</td>
					<td>any (presets)</td>
					<td>CSS syntax (<code>background:#abc</code>)</td>
				</tr>
				<tr>
					<td>detection</td>
					<td>regex</td>
					<td>regex</td>
					<td>AST (more capable, slower)</td>
				</tr>
				<tr>
					<td>token source</td>
					<td>CSS (<code>@theme</code>)</td>
					<td>JS/TS config</td>
					<td>TS variables (importable)</td>
				</tr>
				<tr>
					<td>extensibility</td>
					<td>plugins (JS)</td>
					<td>rules, variants, presets</td>
					<td><a href="#Custom-interpreters">interpreters</a> (TS)</td>
				</tr>
			</tbody>
		</table>
		<p>
			fuz_css's modifier system is less expressive than TailwindCSS's variants. Missing:
			parent/sibling/descendant state (<code>group-hover:</code>, <code>peer-invalid:</code>,
			<code>has-checked:</code>), arbitrary variants (<code>[&.is-dragging]:</code>), child
			selectors (<code>*:</code>), container queries (<code>@md:</code>), data/ARIA variants, and
			more. When you need these patterns, fuz_css currently expects you to use rulesets or
			<code>&lt;style&gt;</code> tags, but the API is still a work in progress, and a more powerful and
			potentially more TailwindCSS-aligned system is on the table.
		</p>
		<p>
			For extensibility, all three frameworks allow custom class-to-CSS mappings. UnoCSS's dynamic
			rules use regex + function patterns similar to fuz_css interpreters, plus separate variants
			for modifiers. TailwindCSS uses JS plugins and UnoCSS has the more mature extensibility story;
			fuz_css offers comparable power with interpreters but it's still evolving --
			<a href="https://github.com/fuzdev/fuz_css/discussions">feedback</a> is welcome!
		</p>
		<p>
			fuz_css fits best when you prefer semantic HTML with styled defaults. Design tokens are
			defined in TypeScript, naturally adapt to dark mode, and can be imported in TS for typesafe
			runtime access. The tradeoffs include a more limited DSL and more verbose literal syntax,
			which nudges you toward <code>&lt;style&gt;</code> tags, tokens when appropriate, or composites
			for repeated patterns.
		</p>
	</TomeSection>
	<hr />
	<section>
		<p>
			<code>fuz_css</code> is still early in development. Your input is welcome in the
			<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>!
		</p>
	</section>
</TomeContent>
