<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {resolve} from '$app/paths';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'elements';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	// TODO consider a generated table that shows all of the computed styles like `block` and `inline`

	// TODO think about the best way to show the raw code (and how to get it, how much structure to apply to library authors)
</script>

<!-- eslint-disable svelte/no-useless-mustaches -->

<TomeContent {tome}>
	<UnfinishedImplementationWarning
		>Element styles are incomplete. Any <a href="https://github.com/fuzdev/fuz_css">requests</a
		>?</UnfinishedImplementationWarning
	>
	<blockquote>
		Styles for plain <MdnLink path="Web/HTML/Element">HTML elements</MdnLink>. See also <TomeLink
			name="typography"
		/> and <TomeLink name="forms" />.
	</blockquote>
	<TomeSection>
		<TomeSectionHeader text="blockquote">
			<span class="font_size_xl3">👆</span>
			<MdnLink path="Web/HTML/Element/blockquote" />
		</TomeSectionHeader>
		<TomeSectionHeader text="hr">
			<span class="font_size_xl3">👇</span>
			<MdnLink path="Web/HTML/Element/hr" />
		</TomeSectionHeader>
		<hr />
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="a">
			<MdnLink path="Web/HTML/Element/a" />
		</TomeSectionHeader>
		<p><a href={resolve('/')}>a link</a> in a <code>p</code></p>
		<div><a href={resolve('/')}>a link</a> in a <code>div</code></div>
		<p><a class="selected" href={resolve('/')}>a link</a> with <code>.selected</code></p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="code">
			<MdnLink path="Web/HTML/Element/code" />
		</TomeSectionHeader>
		<p><code>code</code> in a <code>p</code></p>
		<div><code>code</code> in a <code>div</code></div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="pre">
			<MdnLink path="Web/HTML/Element/pre" />
		</TomeSectionHeader>
		<pre>a <code class="display_inline">pre</code> is
  preformatted
					text</pre>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="details and summary">
			<MdnLink path="Web/HTML/Element/details" />
			and
			<MdnLink path="Web/HTML/Element/summary" />
		</TomeSectionHeader>
		<details>
			<summary>Click this <code>summary</code> to see the rest of the <code>details</code></summary>
			<p>The children of the <code>details</code> excluding the <code>summary</code>.</p>
			<Code
				content={`<details>
	<summary>
		Click this <code>summary</code>
		to see the rest of the <code>details</code>
	</summary>
	<p>The children of the <code>details</code> excluding the <code>summary</code>.</p>
	<Code code={'...'} />
</details>`}
			/>
		</details>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="aside">
			<MdnLink path="Web/HTML/Element/aside" />
		</TomeSectionHeader>
		<aside>
			the <code>aside</code> looks like this
		</aside>
		<aside>
			<Code
				content={`<aside>
	<aside>
		<aside>nested asides</aside>
	</aside>
</aside>`}
			/>
			<aside>
				<aside>
					<aside>nested asides</aside>
				</aside>
			</aside>
		</aside>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="header">
			<MdnLink path="Web/HTML/Element/header" />
		</TomeSectionHeader>
		<Code content={`<header>header</header>`} />
		<header>header</header>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="footer">
			<MdnLink path="Web/HTML/Element/footer" />
		</TomeSectionHeader>
		<Code content={`<footer>footer</footer>`} />
		<footer>footer</footer>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="section">
			<MdnLink path="Web/HTML/Element/section" />
		</TomeSectionHeader>
		<Code content={`<section>section</section>`} />
		<section>section</section>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="ul"><code>ul</code></TomeSectionHeader>
		<ul>
			<li>a</li>
			<li>b</li>
			<li>see</li>
		</ul>
		<h4><code>ul</code> with <code>.unstyled</code></h4>
		<ul class="unstyled">
			<li>a</li>
			<li>b</li>
			<li>see</li>
		</ul>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="ol"><code>ol</code></TomeSectionHeader>
		<ol>
			<li>one</li>
			<li>two</li>
			<li>etc</li>
		</ol>
		<h4><code>ol</code> with <code>.unstyled</code></h4>
		<ol class="unstyled">
			<li>one</li>
			<li>two</li>
			<li>etc</li>
		</ol>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="menu"><code>menu</code></TomeSectionHeader>
		<menu>
			<li>1</li>
			<li>2</li>
			<li>3</li>
		</menu>
		<h4><code>menu</code> with <code>.unstyled</code></h4>
		<menu class="unstyled">
			<li>1</li>
			<li>2</li>
			<li>3</li>
		</menu>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="table">
			<MdnLink path="Web/HTML/Element/table" />
		</TomeSectionHeader>
		<UnfinishedImplementationWarning />
		<Code
			content={`<table>
	<thead>
		<tr>
			<th>th</th>
			<th>th</th>
			<th>th</th>
		</tr>
	</thead>
	<tbody>
		<tr><td>td</td><td>td</td><td>td</td></tr>
		<tr><td>td</td><td>td</td><td>td</td></tr>
		<tr><td>td</td><td>td</td><td>td</td></tr>
	</tbody>
</table>`}
		/>
		<table>
			<thead>
				<tr>
					<th>th</th>
					<th>th</th>
					<th>th</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>td</td><td>td</td><td>td</td></tr>
				<tr><td>td</td><td>td</td><td>td</td></tr>
				<tr><td>td</td><td>td</td><td>td</td></tr>
			</tbody>
		</table>
		<Code content={`<table class="width_100">\n\t...\n</table>`} />
		<table class="width_100">
			<thead>
				<tr>
					<th>th</th>
					<th>th</th>
					<th>th</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>td</td><td>td</td><td>td</td></tr>
				<tr><td>td</td><td>td</td><td>td</td></tr>
				<tr><td>td</td><td>td</td><td>td</td></tr>
			</tbody>
		</table>
	</TomeSection>
	<p>TODO more!</p>
</TomeContent>
