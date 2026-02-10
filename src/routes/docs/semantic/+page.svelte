<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {resolve} from '$app/paths';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import SourceFileLink from '$routes/SourceFileLink.svelte';

	const LIBRARY_ITEM_NAME = 'semantic';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css styles HTML elements in its <SourceFileLink path="style.css"
				>reset stylesheet</SourceFileLink
			>, so semantic markup gets themed and color-scheme-aware styling automatically -- utility
			classes optional. The goal is to be accessible and attractive out of the box, minimal yet
			extensible.
		</p>
	</section>

	<TomeSection>
		<TomeSectionHeader text="Low specificity" />
		<p>
			All opinionated styles use <code>:where()</code> selectors, giving them zero specificity beyond
			the element itself. Your styles and utility classes override defaults without specificity battles.
		</p>
		<Code
			lang="css"
			content={`/* any styles you apply will override these */
:where(a:not(.unstyled)) {
  color: var(--link_color);
  font-weight: 700;
}

:where(button:not(.unstyled)) {
  background-color: var(--button_fill);
  border-radius: var(--border_radius_sm);
}`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text=".unstyled escape hatch" />
		<p>
			Add <code>.unstyled</code> to opt out of decorative styling while keeping reset normalizations.
			Works for both decorative containers and interactive elements like links, buttons, inputs, and summary.
		</p>
		<Code
			lang="svelte"
			content={`<a href="/home">styled link</a>
<a href="/home" class="unstyled">unstyled link</a>`}
		/>
		<p>
			<a href={resolve('/')}>styled link</a> vs
			<a href={resolve('/')} class="unstyled">unstyled link</a>
		</p>
		<Code
			lang="svelte"
			content={`<button>styled button</button>
<button class="unstyled">unstyled button</button>`}
		/>
		<p>
			<button type="button">styled button</button>
			<button type="button" class="unstyled">unstyled button</button>
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Document flow by default" />
		<p>
			Block elements get <code>margin-bottom</code> via <code>:not(:last-child)</code>, creating
			natural vertical rhythm without trailing margins.
		</p>
		<Code
			lang="css"
			content={`:where(
  :is(p, ul, ...[many others])
    :not(:last-child):not(.unstyled)
) {
  margin-bottom: var(--space_lg);
}`}
		/>
		<p>
			This eliminates bottom margins on terminal elements. Edge cases can be fixed with <code
				>.mb_lg</code
			> or similar utility classes.
		</p>
		<aside>
			⚠️ The <code>:not(:last-child)</code> creates unfortunate edge cases by coupling structure to
			style, including usage with Svelte's component-level CSS variables, because it adds a wrapper
			div. Perhaps the better global optimum is to omit the last child exception? This would add
			unwanted margin in many cases, but perhaps that's better overall; <code>mb_0</code> removes it.
		</aside>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Flex containers reset flow margins" />
		<p>
			The layout composites <code>.row</code>, <code>.box</code>, and <code>.column</code>
			reset margins on their direct children. Flow margins make less sense in flex layout — for spacing
			prefer gap utilities like <code>.gap_md</code> and <code>var(--gap_sm)</code> instead.
		</p>
		<Code
			lang="css"
			content={`:where(.row, .box, .column) > * {
  margin: 0;
}`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Element-specific docs" />
		<p>See the related docs for specifics:</p>
		<ul>
			<li><TomeLink name="buttons" /> - button states, colors, variants</li>
			<li><TomeLink name="elements" /> - links, lists, tables, code, details</li>
			<li><TomeLink name="forms" /> - inputs, labels, checkboxes, selects</li>
			<li><TomeLink name="typography" /> - headings, fonts, text styles</li>
		</ul>
	</TomeSection>
</TomeContent>
