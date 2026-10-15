<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import { resolve } from '$app/paths';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import SourceFileLink from '#routes/SourceFileLink.svelte';

	const LIBRARY_ITEM_NAME = 'semantic';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css styles HTML elements in its
			<SourceFileLink path="style.css">reset stylesheet</SourceFileLink>, so semantic markup gets
			themed and color-scheme-aware styling automatically - utility classes optional. The goal is to
			be accessible and attractive out of the box, minimal yet extensible.
		</p>
	</section>

	<TomeSection>
		<TomeSectionHeader text="Layers and specificity" />
		<p>
			All opinionated styles live in the <code>fuz.base</code> cascade layer, so your unlayered
			styles and the generated utility classes override them by layer order alone. Their selectors
			are also wrapped in <code>:where()</code> for zero specificity, so overrides stay easy even
			inside the fuz layers. The exceptions are the document-wide rules: <code>:root</code>,
			<code>body</code>, <code>[hidden]</code>, and <code>::selection</code>.
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
  border-radius: var(--border_radius, var(--control_radius));
}`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text=".unstyled escape hatch" />
		<p>
			Add the <code>.unstyled</code>
			<TomeLink slug="classes" hash="Builtin-classes">builtin class</TomeLink> to opt out of
			decorative styling while keeping reset normalizations. Works for both decorative containers
			and interactive elements like links, buttons, inputs, and summary.
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
  margin-bottom: var(--flow_margin, var(--space_lg));
}`}
		/>
		<p>
			The <code>--flow_margin</code> variable is unset by default, falling back to
			<code>var(--space_lg)</code>. Size composite classes like <code>.sized_sm</code> and
			<code>.sized_lg</code> set <code>--flow_margin</code> to adjust vertical rhythm for all flow
			elements and headings.
		</p>
		<p>
			Headings add a top margin too, a larger multiple of <code>--flow_margin</code>. A heading that
			opens a padded or bordered box - <code>.panel</code>, <code>.pane</code>, <code>aside</code>,
			<code>blockquote</code>, <code>fieldset</code>, <code>dialog</code>, <code>li</code>,
			<code>td</code>, or <code>th</code> - drops it, so it sits on the box's padding instead of
			stacking a gap on it.
		</p>
		<p>
			For elements not in the flow list, use the <code>.mb_flow</code> and <code>.mt_flow</code>
			composite classes to get the same size-responsive spacing. Use <code>.mb_lg</code> when you
			want a fixed value that ignores size composites.
		</p>
		<aside>
			⚠️ The <code>:not(:last-child)</code> creates unfortunate edge cases by coupling structure to
			style, including usage with Svelte's component-level CSS variables, because it adds a wrapper
			div. Perhaps the better global optimum is to omit the last child exception? This would add
			unwanted margin in many cases, but perhaps that's better overall; <code>mb_0</code> removes
			it.
		</aside>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Flex containers reset flow margins" />
		<p>
			The <code>.row</code> layout composite resets margins on its direct children. Flow margins
			make less sense in horizontal flex layout - for spacing prefer gap utilities like
			<code>.gap_md</code> and <code>gap: var(--space_sm)</code> instead.
		</p>
		<Code
			lang="css"
			content={`:where(.row > *) {
  margin: 0;
}`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Interaction and ARIA states" />
		<p>
			Links and form controls show focus as an outline ring, and only the ring - focus adds no fill.
			The ring follows <code>:focus-visible</code>, so keyboard focus and a click into a text field
			or select show it, while a mouse click on a link, button, or checkbox doesn't leave it behind.
		</p>
		<p>The base styles read ARIA state attributes on the elements they apply to:</p>
		<ul>
			<li>
				<code>aria-pressed="true"</code> on a <code>button</code>, or on any
				<code>.selectable</code> or <code>.menuitem</code>, takes the <code>.selected</code> look,
				and stays clickable like <code>.deselectable</code>
			</li>
			<li>
				<code>aria-current</code> on a link (any value but <code>false</code>) takes the selected
				link look
			</li>
			<li>
				<code>aria-disabled="true"</code> on a button or form control takes the disabled look with
				no hover or active states, but keeps its focus ring and pointer events, so it stays
				reachable by keyboard and can explain why it's disabled; on a <code>.deselectable</code>
				<code>.menuitem</code> or <code>.selectable</code>, it drops the pointer cursor
			</li>
			<li>
				<code>aria-invalid="true"</code> on an <code>input</code>, <code>textarea</code>, or
				<code>select</code> turns its border and focus ring negative
			</li>
		</ul>
		<p>
			Under forced colors (Windows High Contrast), the states painted only by a background are
			restated in system colors: a checked radio, a range, and the edges of <code>.panel</code> and
			<code>.pane</code> in the text color, and selection - selected and pressed buttons,
			<code>.menuitem</code>, <code>.selectable</code> - as a <code>Highlight</code> border and
			inner band that becomes a double <code>Highlight</code> ring when focused, while a focus ring
			alone stays the text color. Labels keep the system's colors, and so do icons drawn in
			<code>currentColor</code>. Selects get their native arrow back.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Element-specific docs" />
		<p>See the related docs for specifics:</p>
		<ul>
			<li><TomeLink slug="buttons" /> - button states, colors, variants</li>
			<li><TomeLink slug="elements" /> - links, lists, tables, code, details</li>
			<li><TomeLink slug="forms" /> - inputs, labels, checkboxes, selects</li>
			<li><TomeLink slug="typography" /> - headings, fonts, text styles</li>
		</ul>
	</TomeSection>
</TomeContent>
