import {useState} from 'preact/hooks';

// Import from node_modules to verify extraction works for dependencies
import {
	// Token classes
	demoPaddingClass,
	demoShadowClass,
	demoColorClass,
	// Composite classes
	demoBoxClass,
	demoRowClass,
	demoEllipsisClass,
	// Literal classes
	demoJustifyClass,
	demoTextTransformClass,
	demoGapClass,
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
	arbitraryLiteral,
} from '@fuzdev/fuz_css/example_class_utilities.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<main class="box p_xl min-height:100vh">
			<div class="column gap_lg width:100% max-width:600px">
				<header class="column gap_md text-align:center">
					<h1 class="font_size_xl3">fuz_css + Preact</h1>
					<p class="text_color_5">
						Utility classes generated on-demand via Vite plugin
					</p>
				</header>

				{/* Responsive layout: column on mobile, row on desktop */}
				<section class="column gap_md md:row md:gap_lg p_lg bg_1 border_radius_md">
					<div class="flex:1 column gap_sm">
						<h2 class="font_size_lg">Responsive</h2>
						<p class="text_color_6">
							This layout stacks on mobile and becomes a row on medium screens.
						</p>
					</div>
					<div class="flex:1 column gap_sm">
						<h2 class="font_size_lg">On-demand</h2>
						<p class="text_color_6">
							Only the classes you use are included in the bundle.
						</p>
					</div>
				</section>

				{/* Interactive button with hover states */}
				<section class="column gap_md p_lg bg_1 border_radius_md">
					<h2 class="font_size_lg">Interactive</h2>
					<div class="row gap_md justify-content:center">
						<button
							class="p_md px_lg hover:bg_a_5 hover:color:white border_radius_sm"
							onClick={() => setCount((c) => c + 1)}
						>
							Count: {count}
						</button>
						<button
							class="p_md px_lg hover:bg_b_5 hover:color:white border_radius_sm"
							onClick={() => setCount(0)}
						>
							Reset
						</button>
					</div>
				</section>

				{/* Dark mode demo */}
				<section class="column gap_md p_lg bg_1 border_radius_md">
					<h2 class="font_size_lg">Color Scheme</h2>
					<div class="row gap_md flex-wrap:wrap">
						<div class="p_md bg_a_5 dark:bg_a_3 color:white border_radius_sm">
							Adapts to dark mode
						</div>
						<div class="p_md bg_b_5 dark:bg_b_3 color:white border_radius_sm">
							Different in each scheme
						</div>
					</div>
				</section>

				{/* Token classes showcase */}
				<section class="column gap_md p_lg bg_1 border_radius_md">
					<h2 class="font_size_lg">Design Tokens</h2>
					<div class="row gap_sm flex-wrap:wrap">
						{['a', 'b', 'c', 'd', 'e'].map((hue) => (
							<div
								key={hue}
								class={`p_md bg_${hue}_5 color:white border_radius_sm font_size_sm`}
							>
								{hue.toUpperCase()}
							</div>
						))}
					</div>
				</section>

				{/* Classes from node_modules dependency - all unique, verifies extraction */}
				<section class="column gap_md p_lg bg_1 border_radius_md">
					<h2 class="font_size_lg">From Dependencies</h2>
					<p class="text_color_6">
						Classes imported from <code>@fuzdev/fuz_css/example_class_utilities</code>:
					</p>

					{/* Token classes */}
					<div class={`${demoRowClass} ${demoGapClass} flex-wrap:wrap`}>
						<div class={`${demoBoxClass} ${demoPaddingClass} ${demoShadowClass} bg_1`}>
							{demoPaddingClass} + {demoShadowClass}
						</div>
						<div class={`${demoBoxClass} ${demoColorClass} color:white`}>
							{demoColorClass}
						</div>
					</div>

					{/* Composite + Literal classes */}
					<div class={`${demoJustifyClass} ${demoTextTransformClass} ${demoGapClass}`}>
						<div class={`${demoBoxClass} ${demoPaddingClass}`}>
							<span class={demoEllipsisClass} style={{maxWidth: '80px'}}>
								{demoEllipsisClass} truncates long text
							</span>
						</div>
					</div>

					{/* Naming patterns - all CLASS_NAME_PATTERN suffix variants */}
					<div class="column gap_xs">
						<div class={`${demoClass} bg_2 border_radius_xs`}>demoClass: {demoClass}</div>
						<div class={`${demo_class} bg_2 border_radius_xs`}>demo_class: {demo_class}</div>
						<div class={`${demoClasses} bg_2 border_radius_xs`}>demoClasses: {demoClasses}</div>
						<div class={`${demo_classes} bg_2 border_radius_xs`}>demo_classes: {demo_classes}</div>
						<div class={`${demoClassName} bg_2 border_radius_xs`}>demoClassName: {demoClassName}</div>
						<div class={`${demo_class_name} bg_2 border_radius_xs`}>demo_class_name: {demo_class_name}</div>
						<div class={`${demoClassNames} bg_2 border_radius_xs`}>demoClassNames: {demoClassNames}</div>
						<div class={`${demo_class_names} bg_2 border_radius_xs`}>demo_class_names: {demo_class_names}</div>
						<div class={`${demoClassList} bg_2 border_radius_xs`}>demoClassList: {demoClassList}</div>
						<div class={`${demo_class_list} bg_2 border_radius_xs`}>demo_class_list: {demo_class_list}</div>
						<div class={`${demoClassLists} bg_2 border_radius_xs`}>demoClassLists: {demoClassLists}</div>
						<div class={`${demo_class_lists} bg_2 border_radius_xs`}>demo_class_lists: {demo_class_lists}</div>
						<div class={`${DEMO_CLASS} bg_2 border_radius_xs`}>DEMO_CLASS: {DEMO_CLASS}</div>
					</div>

					{/* Expression patterns */}
					<div class="column gap_xs">
						<div class={`${ternaryClass} bg_2 border_radius_xs`}>ternaryClass: {ternaryClass}</div>
						<div class={`${logicalClass} bg_2 border_radius_xs`}>logicalClass: {logicalClass}</div>
						<div class={`${arrayClasses[0]} ${arrayClasses[1]} bg_2 border_radius_xs`}>
							arrayClasses: [{arrayClasses.join(', ')}]
						</div>
					</div>

					{/* Comment hints */}
					<div class="column gap_xs">
						<div class={`${fromComment} bg_2 border_radius_xs`}>fromComment: {fromComment}</div>
						<div class={`${arbitraryLiteral} bg_2 border_radius_xs`}>arbitraryLiteral: {arbitraryLiteral}</div>
					</div>
				</section>
			</div>
		</main>
	);
};
