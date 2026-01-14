import {createSignal, For} from 'solid-js';

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
	// Comment hint examples
	fromComment,
	unknownExtracted,
	arbitraryLiteral,
} from '@fuzdev/fuz_css/example_class_utilities.js';

export const App = () => {
	const [count, setCount] = createSignal(0);

	return (
		<main class="p_xl width:100% max-width:800px">
			<div class="column gap_lg">
				<header class="text-align:center">
					<h1>fuz_css + Solid</h1>
					<p>Utility classes generated on-demand via Vite plugin</p>
				</header>

				{/* Responsive layout: column on mobile, row on desktop */}
				<section class="display:flex gap_md md:flex-direction:row md:gap_lg">
					<div class="flex:1">
						<h2>Responsive</h2>
						<p>.display:flex .gap_md on mobile, .md:flex-direction:row .md:gap_lg on medium+ screens</p>
					</div>
					<div class="flex:1">
						<h2>On-demand</h2>
						<p>Only classes used are bundled</p>
					</div>
				</section>

				{/* Interactive button with hover states */}
				<section>
					<h2>Interactive</h2>
					<p>Hover modifiers like .hover:border_color_b change styles on hover</p>
					<button class="hover:border_color_b hover:outline_color_b active:border_color_d active:outline_color_d" onClick={() => setCount((c) => c + 1)}>
						Count: {count()}
					</button>
					<button class="hover:border_color_g hover:outline_color_g active:border_color_h active:outline_color_h" onClick={() => setCount(0)}>
						Reset
					</button>
				</section>

				{/* Token classes showcase */}
				<section>
					<h2>Design tokens</h2>
					<p>.p_md for padding, .color_bg_5 for text color</p>
					<div class="row gap_sm">
						<For each={['a', 'b', 'c', 'd', 'e']}>
							{(hue) => (
								<div class={`p_md bg_${hue}_5 color_bg_5`}>
									.bg_{hue}_5
								</div>
							)}
						</For>
					</div>
				</section>

				{/* Class types */}
				<section>
					<h2>Class types</h2>

					<div>
						<h3>Token classes</h3>
						<div class="pl_xl5 font_size_lg">.pl_xl5 .font_size_lg</div>
						<div class="shadow_sm">.shadow_sm</div>
						<div class="color_a_5 color:white">.color_a_5</div>
					</div>

					<div>
						<h3>Composite classes</h3>
						<div class="box">.box</div>
						<div class="ellipsis" style={{'max-width': '365px'}}>
							.ellipsis — this text truncates with ellipsis when it overflows
						</div>
					</div>

					<div>
						<h3>Literal classes</h3>
						<div class="opacity:60%">.opacity:60%</div>
						<div class="color:var(--color_j_5)">.color:var(--color_j_5)</div>
						<div class="box-shadow:0~4px~8px~rgb(0,0,0,0.2)">.box-shadow:0~4px~8px~rgb(0,0,0,0.2) (~ encodes spaces)</div>
						<div class="display:flex justify-content:space-between gap:1rem">
							<span>left</span>
							<span>.display:flex .justify-content:space-between</span>
							<span>right</span>
						</div>
					</div>
				</section>

				{/* Classes from node_modules dependency - verifies extraction */}
				<section>
					<h2>From dependencies</h2>
					<p>Classes imported from <code>@fuzdev/fuz_css/example_class_utilities.js</code></p>

					<div>
						<h3>Naming patterns</h3>
						<div class={demoClass}>demoClass: .{demoClass}</div>
						<div class={demo_class}>demo_class: .{demo_class}</div>
						<div class={demoClasses}>demoClasses: .mb_xs3 .ml_xs</div>
						<div class={demo_classes}>demo_classes: .mb_xs2 .ml_sm</div>
						<div class={demoClassName}>demoClassName: .{demoClassName}</div>
						<div class={demo_class_name}>demo_class_name: .{demo_class_name}</div>
						<div class={demoClassNames}>demoClassNames: .mb_md .ml_md</div>
						<div class={demo_class_names}>demo_class_names: .mb_lg .ml_lg</div>
						<div class={demoClassList}>demoClassList: .{demoClassList}</div>
						<div class={demo_class_list}>demo_class_list: .{demo_class_list}</div>
						<div class={demoClassLists}>demoClassLists: .mb_xl3 .ml_xl</div>
						<div class={demo_class_lists}>demo_class_lists: .mb_xl4 .ml_xl2</div>
						<div class={DEMO_CLASS}>DEMO_CLASS: .{DEMO_CLASS}</div>
					</div>

					<div>
						<h3>Expression patterns</h3>
						<div class={ternaryClass}>
							<code>{`true ? 'mt_xs' : 'mt_sm'`}</code> → .{ternaryClass} (both branches extracted)
						</div>
						<div class={logicalClass}>
							<code>{`true && 'mt_md'`}</code> → .{logicalClass}
						</div>
						<div class={`${arrayClasses[0]} ${arrayClasses[1]}`}>
							<code>{`['mt_lg', 'mt_xl']`}</code> → .{arrayClasses.join(', .')}
						</div>
					</div>

					<div>
						<h3>Comment hints</h3>
						<div class={fromComment}>
							<code>// @fuz-classes {fromComment}</code> → .{fromComment}
						</div>
						<div>
							<code>// @fuz-classes {unknownExtracted}</code> → extracted but excluded (no matching definition)
						</div>
						<div>
							<code>// @fuz-classes {arbitraryLiteral}</code> → extracted but excluded (invalid property, not in @webref/css)
						</div>
					</div>
				</section>
			</div>
		</main>
	);
};
