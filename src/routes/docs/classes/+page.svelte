<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
	import ModuleLink from '$routes/ModuleLink.svelte';

	const LIBRARY_ITEM_NAME = 'classes';

	const GLYPH_IDEA = '⌆'; // TODO from Belt, upstreamed from Zzz?

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	// TODO show these with `Details` hiding their expanded set of values or something better (interpolated using this shorthand as the source of truth? isn't that complex)

	// TODO generate these from `$lib/css_classes.ts`
	const style_utility_groups: Array<{group: string; items: Array<string>}> = [
		{
			group: 'Position and display',
			items: [
				`position_static|relative|absolute|fixed|sticky|$globals`,
				// TODO think about making `display_` bold, and making this more systematic in general
				`display_none|contents|block|flow_root|inline|inline_block|run_in|list_item|inline_list_item|flex|inline_flex|grid|inline_grid|ruby|block_ruby|table|inline_table|$globals`,
				`visibility_visible|hidden|collapse|$globals`,
				`float_left|right|none|inline_start|inline_end|$globals`,
				'opacity_0-100',
				'overflow_auto|hidden|scroll|clip|visible',
				'overflow_x|y_auto|hidden|scroll|clip|visible',
				`overflow_wrap_normal|anywhere|break_word|$globals`,
				`scrollbar_width_auto|thin|none|$globals`,
				`scrollbar_gutter_auto|stable|stable_both_edges|$globals`,
			],
		},
		{
			group: 'Flexbox and grid',
			items: [
				'flex_1',
				'flex_wrap_wrap|wrap_reverse|nowrap|$globals',
				'flex_direction_row|column|row_reverse|column_reverse|$globals',
				'flex_grow|shrink_1|0',
				'align_items_center|start|end|baseline|stretch',
				'align_content_center|start|end|baseline|space_between|space_around|space_evenly|stretch',
				'align_self_center|start|end|baseline|stretch',
				'justify_content_center|start|end|left|right|space_between|space_around|space_evenly|stretch',
				'justify_items_center|start|end|left|right|baseline|stretch',
				'justify_self_center|start|end|left|right|baseline|stretch',
			],
		},
		{
			group: 'Sizing and spacing',
			items: [
				'width|height_0|100|1px-3px|auto|max_content|min_content|fit_content|stretch',
				'width|height_xs5-xl15',
				'top|bottom|left|right_0|100|1px-3px|auto',
				'top|bottom|left|right_xs5-xl15',
				'inset_0|1px-3px|xs5-xl15',
				'p|pt|pr|pb|pl|px|py_xs5-xl15',
				'p|pt|pr|pb|pl|px|py_0|1px-3px',
				'pt|pr|pb|pl_100',
				'm|mt|mr|mb|ml|mx|my_xs5-xl15',
				'm|mt|mr|mb|ml|mx|my_0|1px-3px|auto',
				'mt|mr|mb|ml_100',
				'gap_xs5-xl15',
				'column|row_gap_xs5-xl15',
				'width_upto_xs-xl', // TODO rename? min/max? minned/maxxed? atmost/atleast?
				'width_atleast_xs-xl',
				'height_upto_xs-xl',
				'height_atleast_xs-xl',
			],
		},
		{
			group: 'Typography',
			items: [
				'font_family_sans|serif|mono',
				'line_height_xs-xl|0|1',
				'font_size_xs-xl9',
				'icon_size_xs-xl3',
				'text_align_start|end|left|right|center|justify|justify_all|match_parent',
				'vertical_align_baseline|sub|super|text_top|text_bottom|middle|top|bottom',
				`word_break_normal|break_all|keep_all|$globals`,
				'white_space_normal|nowrap|pre|pre_wrap|pre_line|break_spaces',
				`white_space_collapse_collapse|preserve|preserve_breaks|preserve_spaces|break_spaces|$globals`,
				'text_wrap_wrap|nowrap|balance|pretty|stable',
				`user_select_none|auto|text|all|$globals`,
				'font_weight_100-900',
				'ellipsis',
			],
		},
		{
			group: 'Colors',
			items: [
				'text_color_0-10',
				'darken|lighten_1-9',
				'bg|fg',
				'bg|fg_1-9',
				'color_darken|lighten_1-9',
				'color_bg|fg',
				'color_bg|fg_1-9',
				'hue_a-j',
				'color_a-j_1-9',
				'bg_a-j_1-9',
			],
		},
		{
			group: 'Borders and outlines',
			items: [
				'border_color_1-5', // TODO change this
				'border_color_a-j',
				'border_color_transparent',
				'border_width_0-9',
				'outline_width_0|focused|active',
				`border_style_none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|$globals`,
				'border_radius_xs3-xl',
				'border_radius_0-100',
				'border_top|bottom_left|right_radius_xs3-xl',
				'border_top|bottom_left|right_radius_0-100',
			],
		},
		{
			group: 'Shadows',
			items: [
				'shadow_xs-xl',
				'shadow_top|bottom_xs-xl',
				'shadow_inset_xs-xl',
				'shadow_inset_top|bottom_xs-xl',
				'shadow_color_highlight|glow|shroud',
				'shadow_color_a-j',
				'shadow_alpha_1-5',
				'shadow_inherit|none',
			],
		},
		{
			group: 'Transforms and visual effects',
			items: ['flip_x|y|xy', 'pixelated'],
		},
		{
			group: 'Composite classes',
			items: [
				'box',
				'column',
				'row',
				'formatted',
				'selected',
				'selectable',
				'clickable',
				'pane',
				'panel',
				'icon_button',
				'plain',
				'menu_item',
				'chevron',
				'chip',
			],
		},
	];

	// TODO extract a `GithubLink` like `MdnLink`
</script>

<TomeContent {tome}>
	<UnfinishedImplementationWarning>
		Both the docs and implementation of these need a lot more work.
	</UnfinishedImplementationWarning>
	<TomeSection>
		<TomeSectionHeader text="Optional CSS classes" />
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
			The <code>fuz.css</code> file is created on demand with the utility classes that your code
			uses, if any. For now it requires <a href="https://github.com/ryanatkn/gro">Gro</a> to
			generate it, but it isn't hard to make your own integration using the helpers
			<ModuleLink path="gen_fuz_css.ts">gen_fuz_css.ts</ModuleLink>. I can add a Vite plugin if
			there's demand.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Utility classes" />
		<p>
			Fuz CSS supports utility classes that cost nothing until you opt-in. The main stylesheet and
			theme are required and build around CSS custom properties - utility classes offer an
			orthogonal API that some developers prefer some of the time. They leverage Fuz CSS's base
			frameworky parts, and are well-integrated with the other APIs and tools.
		</p>
		<p>
			Fuz CSS exports <ModuleLink path="css_class_helpers.ts">helpers</ModuleLink> to generate styles
			on demand based on class usage in your source files, so you can ship the minimal code needed. Some
			values are interpreted to efficiently support large value ranges, e.g. <code>opacity_0</code>
			through <code>opacity_100</code> and <code>font_weight_1</code> to
			<code>font_weight_1000</code>.
		</p>
		<aside>
			The API has been drifting to be more consistently match CSS at the cost of verbosity. I think
			I like this direction but is <code>margin_x_xl</code> absurd? I don't think supporting both versions
			by default is good but the APIs should make this easy to customize.
		</aside>
		<aside>
			⚠️ Fuz CSS does not fully support <a
				href="https://svelte.dev/docs/svelte/class#Attributes-Objects-and-arrays"
				>Svelte's object+array class syntax</a
			>, added in 5.16. For now see
			<ModuleLink path="css_class_helpers.test.ts">the tests</ModuleLink> for the supported forms. The
			current strategy uses a regexp for TS and Svelte files, but we'll probably need to more robustly
			scan the parsed AST.
		</aside>
		<p>
			<code>$globals</code> include <code>inherit|initial|revert|revert_layer|unset</code>.
		</p>
		<div class="utility_classes">
			{#each style_utility_groups as group (group.group)}
				<h4>{group.group}</h4>
				<ul class="unstyled">
					{#each group.items as c (c)}
						<li class="overflow_wrap_break_word">.{c}</li>
					{/each}
				</ul>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Builtin classes" />
		<p>
			Fuz CSS's <ModuleLink path="style.css">main stylesheet</ModuleLink>
			provides styles for the base HTML elements using the framework's <TomeLink
				name="variables"
			/>, acting as a modern CSS reset with sensible defaults and integrated theming. It includes
			Fuz CSS-specific CSS classes - not utility classes in the strict sense - that provide common
			generic functionality.
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
			and generic opt-out:
		</p>
		<Code
			lang="css"
			content={`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--space_xl4);
}`}
		/>
		<p>
			Respecting <code>.unstyled</code> isn't a straightforward choice in all cases. Help is
			appreciated to refine the internals. For example, should <code>input</code> respect it? Maybe? All
			styles or a subset?
		</p>
		<aside>
			<p class="row">
				{GLYPH_IDEA} Note this strategy supports semantic hooks for theming. A hypothetical change:
			</p>
			<Code
				lang="css"
				content={`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--list_padding_left, var(--space_xl4));
}`}
			/>
			<p>
				Fuz CSS uses this pattern in some places, and maybe more in the future. One nice aspect is
				that
				<code>--list_padding_left</code> need not exist anywhere else but this declaration and maybe your
				code, and in practice it's backwards compatible.
			</p>
			<aside>
				Note the <code>:where()</code> is used for Fuz CSS's default styles, so its specificity is as
				low as possible to minimize interference with your styles.
			</aside>
		</aside>
	</TomeSection>
</TomeContent>

<style>
	.utility_classes {
		font-family: var(--font_family_mono);
	}
	.utility_classes li {
		padding: var(--space_xs3);
	}
	.utility_classes li:nth-child(odd) {
		background-color: var(--fg_1);
		padding: var(--space_xs3);
	}
</style>
