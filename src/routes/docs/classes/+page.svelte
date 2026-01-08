<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import ModuleLink from '$routes/ModuleLink.svelte';

	const LIBRARY_ITEM_NAME = 'classes';

	const GLYPH_IDEA = '⌆';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Class types" />
		<p>Fuz CSS provides three types of classes:</p>
		<table>
			<thead>
				<tr>
					<th>Type</th>
					<th>Example</th>
					<th>Purpose</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><strong>token classes</strong></td>
					<td><code>.p_md</code>, <code>.color_a_5</code>, <code>.gap_lg</code></td>
					<td>map to style variables (CSS custom properties)</td>
				</tr>
				<tr>
					<td><strong>composite classes</strong></td>
					<td><code>.box</code>, <code>.row</code>, <code>.ellipsis</code></td>
					<td>multi-property shortcuts</td>
				</tr>
				<tr>
					<td><strong>literal classes</strong></td>
					<td><code>.display:flex</code>, <code>.hover:opacity:80%</code></td>
					<td>arbitrary CSS property:value pairs</td>
				</tr>
			</tbody>
		</table>
		<p>
			<strong>Token classes</strong> are the primary choice for spacing, colors, and sizes - they
			ensure consistency with the design system. <strong>Composite classes</strong> provide
			shortcuts for repeated patterns. <strong>Literal classes</strong> are an escape hatch for arbitrary
			CSS, especially useful for cross-component styling and responsive/state modifiers.
		</p>

		<TomeSection>
			<TomeSectionHeader text="Token classes" tag="h3" />
			<p>
				Token classes map to <TomeLink name="variables">style variables</TomeLink>. They use
				underscore syntax because they're shorthand for design tokens, so they have consistent
				casing in both JS and CSS:
			</p>
			<Code content="<div class=&quot;p_md gap_lg color_a_5 bg_1&quot;>" />
			<h4>Spacing</h4>
			<ul class="unstyled token_classes">
				<li><code>.p|pt|pr|pb|pl|px|py_xs5-xl15</code></li>
				<li><code>.m|mt|mr|mb|ml|mx|my_xs5-xl15</code></li>
				<li><code>.gap|column_gap|row_gap_xs5-xl15</code></li>
				<li><code>.top|bottom|left|right_xs5-xl15</code></li>
				<li><code>.inset_xs5-xl15</code></li>
			</ul>
			<h4>Sizing</h4>
			<ul class="unstyled token_classes">
				<li><code>.width|height_xs5-xl15</code></li>
				<li><code>.width_upto|atleast_xs-xl</code></li>
				<li><code>.height_upto|atleast_xs-xl</code></li>
			</ul>
			<h4>Colors</h4>
			<ul class="unstyled token_classes">
				<li><code>.color_a-j_1-9</code></li>
				<li><code>.bg|fg_1-9</code></li>
				<li><code>.bg_a-j_1-9</code></li>
				<li><code>.text_color_0-10</code></li>
				<li><code>.darken|lighten_1-9</code></li>
				<li><code>.hue_a-j</code></li>
			</ul>
			<h4>Typography</h4>
			<ul class="unstyled token_classes">
				<li><code>.font_family_sans|serif|mono</code></li>
				<li><code>.font_size_xs-xl9</code></li>
				<li><code>.line_height_xs-xl</code></li>
				<li><code>.icon_size_xs-xl3</code></li>
			</ul>
			<h4>Borders</h4>
			<ul class="unstyled token_classes">
				<li><code>.border_color_1-5</code></li>
				<li><code>.border_color_a-j</code></li>
				<li><code>.border_width_0-9</code></li>
				<li><code>.border_radius_xs3-xl</code></li>
				<li><code>.outline_width_0|focused|active</code></li>
			</ul>
			<h4>Shadows</h4>
			<ul class="unstyled token_classes">
				<li><code>.shadow_xs-xl</code></li>
				<li><code>.shadow_inset_xs-xl</code></li>
				<li><code>.shadow_color_a-j</code></li>
				<li><code>.shadow_alpha_1-5</code></li>
			</ul>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Composite classes" tag="h3" />
			<p>Multi-property shortcuts for repeated patterns. Define your own in a composites file:</p>
			<Code
				lang="typescript"
				content={`// src/lib/composites.ts
export const my_composites = {
	'flex-center': {declaration: 'display: flex; align-items: center; justify-content: center;'},
	card: {declaration: \`
		padding: var(--space_lg);
		border-radius: var(--radius_md);
		background: var(--bg_1);
	\`},
};`}
			/>
			<p>Built-in composites:</p>
			<ul>
				<li><code>.box</code> - centered flex container</li>
				<li><code>.row</code> - horizontal flex row</li>
				<li><code>.column</code> - vertical flex column</li>
				<li><code>.formatted</code> - formatted text block</li>
				<li><code>.ellipsis</code> - text overflow ellipsis</li>
				<li><code>.selected</code> - selected state styling</li>
				<li><code>.selectable</code> - selectable element styling</li>
				<li><code>.clickable</code> - clickable element styling</li>
				<li><code>.pane</code> - pane container</li>
				<li><code>.panel</code> - panel container</li>
				<li><code>.icon_button</code> - icon button styling</li>
				<li><code>.plain</code> - plain/reset styling</li>
				<li><code>.menu_item</code> - menu item styling</li>
				<li><code>.chevron</code> - chevron indicator</li>
				<li><code>.chip</code> - chip/tag styling</li>
			</ul>
		</TomeSection>

		<TomeSection>
			<TomeSectionHeader text="Literal classes" tag="h3" />
			<p>
				Fuz supports CSS-literal syntax: <code>property:value</code>.
			</p>
			<ul>
				<li>
					similar to Tailwind but more verbose, nudging you toward Svelte's <code
						>&lt;style&gt;</code
					> tags
				</li>
				<li>enables composition across component boundaries</li>
				<li>
					more power than inline <code>style</code> attributes (modifiers for hover, responsive, dark
					mode)
				</li>
			</ul>
			<Code
				content={`<!-- basic syntax: property:value -->
<div class="display:flex justify-content:center gap:var(--space_md)">

<!-- multi-value properties use ~ for spaces -->
<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)">

<!-- numeric values -->
<div class="opacity:50% font-weight:700 z-index:100 border-radius:8px">

<!-- arbitrary CSS values work natively -->
<div class="width:calc(100%~-~20px) aspect-ratio:16/9">`}
			/>
			<p>
				The <code>~</code> character represents a space in class names (since CSS classes can't
				contain spaces). Use it for multi-value properties like <code>margin:0~auto</code>.
			</p>
			<aside>
				<p>
					{GLYPH_IDEA} <strong>When to use <code>~</code> vs CSS:</strong> If you need more than 2-3
					<code>~</code> characters, consider using a <code>&lt;style&gt;</code> block instead.
				</p>
			</aside>

			<h4>Common patterns</h4>
			<p>Layout and display:</p>
			<ul class="unstyled token_classes">
				<li><code>.display:none|block|flex|grid|inline|inline-block|contents</code></li>
				<li><code>.position:static|relative|absolute|fixed|sticky</code></li>
				<li><code>.visibility:visible|hidden|collapse</code></li>
				<li><code>.overflow:auto|hidden|scroll|clip|visible</code></li>
			</ul>
			<p>Flexbox and grid:</p>
			<ul class="unstyled token_classes">
				<li><code>.flex-direction:row|column|row-reverse|column-reverse</code></li>
				<li><code>.flex-wrap:wrap|nowrap|wrap-reverse</code></li>
				<li><code>.align-items:center|start|end|baseline|stretch</code></li>
				<li>
					<code>.justify-content:center|start|end|space-between|space-around|space-evenly</code>
				</li>
				<li><code>.flex:1</code>, <code>.flex-grow:1|0</code>, <code>.flex-shrink:1|0</code></li>
			</ul>
			<p>Typography:</p>
			<ul class="unstyled token_classes">
				<li><code>.text-align:left|center|right|justify</code></li>
				<li><code>.white-space:normal|nowrap|pre|pre-wrap|pre-line</code></li>
				<li><code>.word-break:normal|break-all|keep-all</code></li>
				<li><code>.text-wrap:wrap|nowrap|balance|pretty</code></li>
				<li><code>.user-select:none|auto|text|all</code></li>
			</ul>
			<p>Borders and effects:</p>
			<ul class="unstyled token_classes">
				<li><code>.border-style:none|solid|dashed|dotted</code></li>
				<li><code>.float:left|right|none</code></li>
				<li><code>.cursor:pointer|default|grab|text|not-allowed</code></li>
				<li><code>.pointer-events:none|auto</code></li>
			</ul>
		</TomeSection>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Modifiers" />
		<p>
			Modifiers wrap CSS in conditions. This is what makes utility classes more powerful than inline
			styles - you can apply styles based on viewport, state, or color scheme.
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
			content={`<!-- Stack on mobile, row on medium screens and up -->
<div class="display:flex flex-direction:column md:flex-direction:row">

<!-- Hide on mobile -->
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
			content={`<!-- Hover and focus effects -->
<button class="hover:background-color:var(--color_a_6) focus:outline:2px~solid~var(--color_a_5)">

<!-- Form validation states -->
<input class="invalid:border-color:var(--color_c_5) disabled:opacity:50%">

<!-- Structural selectors -->
<li class="first:border-top:none last:border-bottom:none odd:background-color:var(--fg_1)">`}
		/>
		<p>Available state modifiers include:</p>
		<ul>
			<li>
				<strong>interaction:</strong> <code>hover:</code>, <code>focus:</code>,
				<code>focus-visible:</code>, <code>focus-within:</code>, <code>active:</code>,
				<code>visited:</code>
			</li>
			<li>
				<strong>form:</strong> <code>disabled:</code>, <code>checked:</code>,
				<code>required:</code>, <code>valid:</code>, <code>invalid:</code>,
				<code>placeholder-shown:</code>
			</li>
			<li>
				<strong>structural:</strong> <code>first:</code>, <code>last:</code>, <code>only:</code>,
				<code>odd:</code>, <code>even:</code>, <code>empty:</code>, <code>nth-child(N):</code>
			</li>
		</ul>

		<h4>Color-scheme modifiers</h4>
		<p>Apply styles in dark or light mode:</p>
		<Code
			content={`<!-- Reduce shadow intensity in dark mode -->
<div class="box-shadow:var(--shadow_lg) dark:box-shadow:var(--shadow_sm)">

<!-- Different border in light mode -->
<div class="border:1px~solid~var(--fg_2) light:border:1px~solid~var(--fg_5)">`}
		/>
		<p>
			<code>dark:</code> and <code>light:</code> use <code>:root.dark</code> and
			<code>:root.light</code>
			selectors, matching Fuz CSS's color scheme mechanism.
		</p>

		<h4>Pseudo-element modifiers</h4>
		<p>Style generated content and element parts:</p>
		<Code
			content={`<!-- Decorative element (explicit content required) -->
<div class="before:content:'' before:display:block before:width:2rem before:height:2rem before:background:var(--color_a_5)">

<!-- Placeholder styling -->
<input class="placeholder:color:var(--text_color_3) placeholder:font-style:italic">`}
		/>
		<p>
			Available: <code>before:</code>, <code>after:</code>, <code>placeholder:</code>,
			<code>selection:</code>,
			<code>marker:</code>, <code>file:</code>, <code>backdrop:</code>
		</p>
		<aside>
			<strong>Note:</strong> <code>before:</code> and <code>after:</code> require explicit
			<code>content</code>
			- there's no auto-injection. This maintains the 1:1 CSS mapping principle.
		</aside>

		<h4>Media feature modifiers</h4>
		<p>Accessibility and context-aware styles:</p>
		<Code
			content={`<!-- Respect motion preferences -->
<div class="motion-safe:transition:transform~0.3s~ease-out motion-reduce:transition:none">

<!-- Print-specific styles -->
<nav class="print:display:none">`}
		/>
		<p>
			Available: <code>print:</code>, <code>motion-safe:</code>, <code>motion-reduce:</code>,
			<code>contrast-more:</code>, <code>contrast-less:</code>, <code>portrait:</code>,
			<code>landscape:</code>, <code>forced-colors:</code>
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Combining modifiers" />
		<p>
			Modifiers can be combined in a specific order:
			<code>[media]:[ancestor]:[state...]:[pseudo-element]:property:value</code>
		</p>
		<Code
			content={`<!-- Media + color-scheme + state -->
<div class="md:dark:hover:opacity:80%">

<!-- Media + state + pseudo-element -->
<div class="md:hover:before:opacity:100%">

<!-- Multiple states (must be alphabetical) -->
<button class="focus:hover:outline:2px~solid~blue">`}
		/>
		<p>
			<strong>Order matters:</strong> Media modifiers come first, then ancestor (<code>dark:</code
			>/<code>light:</code>), then state modifiers (alphabetically), then pseudo-elements. Errors
			will guide you to the correct order.
		</p>
		<aside>
			<p>
				{GLYPH_IDEA} <strong>State order:</strong> Multiple state modifiers must be alphabetical.
				Write <code>focus:hover:</code> not <code>hover:focus:</code> - they generate the same CSS, so
				canonical ordering prevents duplicates.
			</p>
		</aside>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Practical patterns" />

		<h4>Child component styling</h4>
		<p>The primary use case - passing styles across component boundaries:</p>
		<Code
			content={`<!-- Parent controls hover behavior -->
<Card class="hover:box-shadow:var(--shadow_lg) hover:transform:translateY(-2px)">

<!-- Responsive layout on child -->
<ButtonGroup class="display:flex flex-direction:column md:flex-direction:row">`}
		/>

		<h4>Conditional classes with clsx</h4>
		<!-- eslint-disable-next-line no-useless-concat -->
		<Code
			lang="svelte"
			content={'<' +
				`script>
	import {clsx} from 'clsx';
	let active = $state(false);
</script>

<Card class={clsx(
	'p_md',
	active && 'border:2px~solid~var(--color_a_5)',
	variant === 'elevated' && 'box-shadow:var(--shadow_lg)'
)} />`}
		/>

		<h4>Dark mode adaptations</h4>
		<Code
			content={`<!-- Shadows look harsh in dark mode -->
<Card class="box-shadow:var(--shadow_lg) dark:box-shadow:var(--shadow_sm)">

<!-- Image brightness -->
<img class="dark:filter:brightness(0.9)" alt="Hero">`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Setup" />
		<p>Fuz CSS has three CSS files, two of which are required:</p>
		<Code
			content={`<!-- +layout.svelte -->
${'<' as string}script>
	import '@fuzdev/fuz_css/style.css'; // required
	import '@fuzdev/fuz_css/theme.css'; // required, can bring your own
	import '$routes/fuz.css'; // optional, generated by \`gen_fuz_css\`
	// ...
</script>`}
		/>
		<p>
			The <code>fuz.css</code> file is generated on demand with only the utility classes your code
			uses. It requires <a href="https://github.com/ryanatkn/gro">Gro</a> to generate, using the
			helpers in <ModuleLink path="gen_fuz_css.ts">gen_fuz_css.ts</ModuleLink>.
		</p>
		<h4>Dynamic class hints</h4>
		<p>
			The generator extracts classes from <code>class</code> attributes, <code>class:</code>
			directives, and <code>clsx</code>/<code>cn</code> calls. For dynamically constructed classes
			that can't be statically analyzed, use the <code>@fuz-classes</code> comment:
		</p>
		<Code
			lang="typescript"
			content={`// @fuz-classes opacity:50% opacity:75% opacity:100%
const opacity_classes = [50, 75, 100].map((n) => \`opacity:\${n}%\`);`}
		/>
		<p>
			This tells the generator to include these classes even though they're built dynamically. Works
			in both Svelte and TypeScript files.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Builtin classes" />
		<p>
			Fuz CSS's <ModuleLink path="style.css">main stylesheet</ModuleLink> provides styles for base HTML
			elements using <TomeLink name="variables">style variables</TomeLink>, acting as a modern CSS
			reset. It includes CSS classes that provide common generic functionality.
		</p>
		<h4><code>.unstyled</code></h4>
		<Code
			content={`<ul>
	<li>1</li>
	<li>2</li>
</ul>`}
		/>
		<ul class="unstyled mb_lg">
			<li>a</li>
			<li>b</li>
		</ul>
		<Code
			content={`<ul class="unstyled">
	<li>a</li>
	<li>b</li>
</ul>`}
		/>
		<ul>
			<li>1</li>
			<li>2</li>
		</ul>
		<p>
			The <code>.unstyled</code> class lets Fuz CSS provide solid default element styles with a simple
			opt-out:
		</p>
		<Code
			lang="css"
			content={`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--space_xl4);
}`}
		/>
		<aside>
			<p class="row">
				{GLYPH_IDEA} This strategy supports semantic hooks for theming:
			</p>
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
		</aside>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Classes vs styles" />
		<p>
			<strong>Use <code>&lt;style&gt;</code> tags</strong> for styling elements within your own component
			- you get IDE autocomplete and can use complex selectors.
		</p>
		<p>
			<strong>Use utility classes</strong> when you need to style child components (where scoped CSS can't
			reach) or when you need hover/responsive/dark-mode modifiers on children.
		</p>
		<p>
			<strong>Use inline styles</strong> for runtime dynamic values that come from JavaScript.
		</p>
		<aside>
			This is guidance, not a rule. Some developers prefer literal classes everywhere, and that's
			fine. Literal classes are especially useful when crossing component boundaries.
		</aside>
	</TomeSection>
</TomeContent>

<style>
	.token_classes {
		font-family: var(--font_family_mono);
	}
	.token_classes li {
		padding: var(--space_xs3);
	}
	.token_classes li:nth-child(odd) {
		background-color: var(--fg_1);
	}
</style>
