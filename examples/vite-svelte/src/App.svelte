<script lang="ts">
	// Import from node_modules to verify extraction works for dependencies
	import {
		// Naming patterns (all CLASS_NAME_PATTERN suffix variants)
		demoClass,
		demo_class,
		demoClasses,
		demo_classes,
		demoClassName,
		demo_class_name,
		demoClassNames,
		demo_class_names,
		demoClassList,
		demo_class_list,
		demoClassLists,
		demo_class_lists,
		DEMO_CLASS,
		// Expression patterns
		ternaryClass,
		logicalClass,
		arrayClasses,
		objectClasses,
		// Comment hint examples
		fromComment,
	} from '@fuzdev/fuz_css/example_class_utilities.js';

	let count = $state(0);
</script>

<main class="mx_auto max-width:1000px px_md py_xl7 md:px_xl">
	<div class="column gap_lg">
		<header class="text-align:center">
			<h1>fuz_css + Svelte</h1>
			<p>
				Utility classes generated on-demand via Vite plugin (<a
					href="https://css.fuz.dev/docs/classes">docs</a
				>, <a href="https://github.com/fuzdev/fuz_css/tree/main/examples/vite-svelte">source</a>)
			</p>
		</header>

		<!-- Class types -->
		<section>
			<h2>Class types</h2>

			<div>
				<h3>Token classes</h3>
				<div class="p_md bg_d_20">.p_md .bg_d_20</div>
				<div class="pl_xl5 font_size_lg">.pl_xl5 .font_size_lg</div>
				<div class="shadow_sm">.shadow_sm</div>
			</div>

			<div>
				<h3>Composite classes</h3>
				<div class="box">.box</div>
				<div class="ellipsis" style:max-width="365px">
					.ellipsis -- this text truncates with ellipsis when it overflows
				</div>
			</div>

			<div>
				<h3>Literal classes</h3>
				<div class="opacity:60%">.opacity:60%</div>
				<div class="color:var(--color_j_50)">.color:var(--color_j_50)</div>
				<div class="box-shadow:0~4px~8px~rgb(0,0,0,0.2)">
					.box-shadow:0~4px~8px~rgb(0,0,0,0.2) (~ encodes spaces)
				</div>
			</div>
		</section>

		<!-- Modifiers -->
		<section>
			<h2>Modifiers</h2>

			<div>
				<h3>Responsive</h3>
				<div class="mb_xl3 column gap_md md:flex-direction:row md:gap_lg">
					<div class="flex:1">
						<p>.column .gap_md on mobile, .md:flex-direction:row .md:gap_lg on medium+ screens</p>
					</div>
					<div class="flex:1">
						<p>Resize the window to see the layout switch from column to row</p>
					</div>
				</div>
				<p class="min-width(543px):font_size_lg">
					.min-width(543px):font_size_lg -- arbitrary breakpoint
				</p>
			</div>

			<div>
				<h3>Interactive</h3>
				<div class="row gap_md mb_lg">
					<button
						class="hover:border_color_b hover:outline_color_b active:border_color_d active:outline_color_d"
						onclick={() => count++}
					>
						count: {count}
					</button>
					<span
						>.hover:border_color_b .hover:outline_color_b .active:border_color_d
						.active:outline_color_d</span
					>
				</div>
				<div class="row gap_md mb_lg">
					<button
						class="hover:border_color_g hover:outline_color_g active:border_color_h active:outline_color_h"
						onclick={() => (count = 0)}
					>
						reset
					</button>
					<span
						>.hover:border_color_g .hover:outline_color_g .active:border_color_h
						.active:outline_color_h</span
					>
				</div>
			</div>
		</section>

		<!-- Extraction -->
		<section>
			<h2>Extraction</h2>
			<p>
				Classes detected via naming conventions, expressions, and comments (examples imported from <code
					>node_modules</code
				> to verify dependency scanning)
			</p>

			<div>
				<h3>Naming patterns</h3>
				<div class={demoClass}>demoClass: .{demoClass}</div>
				<div class={demo_class}>demo_class: .{demo_class}</div>
				<div class={DEMO_CLASS}>DEMO_CLASS: .{DEMO_CLASS}</div>
				<div class={demoClasses}>demoClasses: .mb_xs2 .ml_xs</div>
				<div class={demo_classes}>demo_classes: .mb_xs .ml_sm</div>
				<div class={demoClassName}>demoClassName: .{demoClassName}</div>
				<div class={demo_class_name}>demo_class_name: .{demo_class_name}</div>
				<div class={demoClassNames}>demoClassNames: .mb_lg .ml_md</div>
				<div class={demo_class_names}>demo_class_names: .mb_xl .ml_lg</div>
				<div class={demoClassList}>demoClassList: .{demoClassList}</div>
				<div class={demo_class_list}>demo_class_list: .{demo_class_list}</div>
				<div class={demoClassLists}>demoClassLists: .mb_xl4 .ml_xl</div>
				<div class={demo_class_lists}>demo_class_lists: .mb_xl5 .ml_xl2</div>
			</div>

			<div>
				<h3>Expression patterns</h3>
				<div class={ternaryClass}>
					<code>{"true ? 'mt_xs' : 'mt_sm'"}</code> → .{ternaryClass} (both branches extracted)
				</div>
				<div class={logicalClass}>
					<code>{"true && 'mt_md'"}</code> → .{logicalClass}
				</div>
				<div class="{arrayClasses[0]} {arrayClasses[1]}">
					<code>{"['mt_lg', 'mt_xl']"}</code> → .{arrayClasses.join(', .')}
				</div>
				<div class={objectClasses.mt_xl2}>
					<code>{`{ mt_xl2: 'mt_xl2', mt_xl3: 'mt_xl3' }`}</code> → keys extracted from object
				</div>
			</div>

			<div>
				<h3>Comment hints</h3>
				<div class={fromComment}>
					<code>// @fuz-classes {fromComment}</code> → .{fromComment}
				</div>
			</div>
		</section>

		<footer class="text-align:center">
			<p>
				This demos a subset of features.<br />See the
				<a href="https://css.fuz.dev/docs/classes">docs</a>
				and
				<a href="https://github.com/fuzdev/fuz_css/tree/main/examples/vite-svelte">source code</a> for
				more.
			</p>
		</footer>
	</div>
</main>
