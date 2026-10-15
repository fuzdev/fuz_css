<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
</script>

<!-- the 62.5% root font size note, shared by the setup and typography
	pages so the two stay in step -->
<aside>
	fuz_css sets the root font size to <code>62.5%</code>, so <code>1rem</code> is 10px at the
	browser's default 16px. Body text is <code>1.6rem</code>. It's a percentage, so it still follows
	the reader's browser font size setting.
</aside>
<p>
	Every <code>rem</code> length on the page is measured against that root, including ones that come
	from elsewhere: a third-party component sized for a 16px <code>rem</code> renders at 62.5% of what
	its author intended. Size your own lengths with the
	<TomeLink slug="variables">style variables</TomeLink>, and check any <code>rem</code>-based CSS
	you bring in. A <code>@media</code> query is the exception, since its <code>rem</code> is the
	browser's initial font size: the <code>sm:</code> breakpoint's <code>40rem</code> is 640px.
</p>
<p>
	Coming from Tailwind, whose spacing scale assumes a 16px <code>rem</code> (<code>p-4</code> is
	<code>1rem</code>, 16px): here 16px is <code>1.6rem</code>, and the spacing tokens like
	<code>p_lg</code> carry the scale, so pasted Tailwind lengths come out smaller.
</p>
<Code
	lang="css"
	content={`/* with fuz_css's root, 1rem is 10px */
.card { padding: 1rem; }               /* 10px, not 16px */
.card { padding: var(--space_lg); }    /* the spacing scale */`}
/>
