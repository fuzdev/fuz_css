import {useState} from 'react';

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
		<main className="box p_xl min-height:100vh">
			<div className="column gap_lg width:100% max-width:600px">
				<header className="column gap_md text-align:center">
					<h1 className="font_size_xl3">fuz_css + React</h1>
					<p className="text_color_5">
						Utility classes generated on-demand via Vite plugin
					</p>
				</header>

				{/* Responsive layout: column on mobile, row on desktop */}
				<section className="column gap_md md:row md:gap_lg p_lg bg_1 border_radius_md">
					<div className="flex:1 column gap_sm">
						<h2 className="font_size_lg">Responsive</h2>
						<p className="text_color_6">
							This layout stacks on mobile and becomes a row on medium screens.
						</p>
					</div>
					<div className="flex:1 column gap_sm">
						<h2 className="font_size_lg">On-demand</h2>
						<p className="text_color_6">
							Only the classes you use are included in the bundle.
						</p>
					</div>
				</section>

				{/* Interactive button with hover states */}
				<section className="column gap_md p_lg bg_1 border_radius_md">
					<h2 className="font_size_lg">Interactive</h2>
					<div className="row gap_md justify-content:center">
						<button
							className="p_md px_lg hover:bg_a_5 hover:color:white border_radius_sm"
							onClick={() => setCount((c) => c + 1)}
						>
							Count: {count}
						</button>
						<button
							className="p_md px_lg hover:bg_b_5 hover:color:white border_radius_sm"
							onClick={() => setCount(0)}
						>
							Reset
						</button>
					</div>
				</section>

				{/* Dark mode demo */}
				<section className="column gap_md p_lg bg_1 border_radius_md">
					<h2 className="font_size_lg">Color Scheme</h2>
					<div className="row gap_md flex-wrap:wrap">
						<div className="p_md bg_a_5 dark:bg_a_3 color:white border_radius_sm">
							Adapts to dark mode
						</div>
						<div className="p_md bg_b_5 dark:bg_b_3 color:white border_radius_sm">
							Different in each scheme
						</div>
					</div>
				</section>

				{/* Token classes showcase */}
				<section className="column gap_md p_lg bg_1 border_radius_md">
					<h2 className="font_size_lg">Design Tokens</h2>
					<div className="row gap_sm flex-wrap:wrap">
						{['a', 'b', 'c', 'd', 'e'].map((hue) => (
							<div
								key={hue}
								className={`p_md bg_${hue}_5 color:white border_radius_sm font_size_sm`}
							>
								{hue.toUpperCase()}
							</div>
						))}
					</div>
				</section>

				{/* Classes from node_modules dependency - all unique, verifies extraction */}
				<section className="column gap_md p_lg bg_1 border_radius_md">
					<h2 className="font_size_lg">From Dependencies</h2>
					<p className="text_color_6">
						Classes imported from <code>@fuzdev/fuz_css/example_class_utilities</code>:
					</p>

					{/* Token classes */}
					<div className={`${demoRowClass} ${demoGapClass} flex-wrap:wrap`}>
						<div className={`${demoBoxClass} ${demoPaddingClass} ${demoShadowClass} bg_1`}>
							{demoPaddingClass} + {demoShadowClass}
						</div>
						<div className={`${demoBoxClass} ${demoColorClass} color:white`}>
							{demoColorClass}
						</div>
					</div>

					{/* Composite + Literal classes */}
					<div className={`${demoJustifyClass} ${demoTextTransformClass} ${demoGapClass}`}>
						<div className={`${demoBoxClass} ${demoPaddingClass}`}>
							<span className={demoEllipsisClass} style={{maxWidth: '80px'}}>
								{demoEllipsisClass} truncates long text
							</span>
						</div>
					</div>

					{/* Naming patterns - all CLASS_NAME_PATTERN suffix variants */}
					<div className="column gap_xs">
						<div className={`${demoClass} bg_2 border_radius_xs`}>demoClass: {demoClass}</div>
						<div className={`${demo_class} bg_2 border_radius_xs`}>demo_class: {demo_class}</div>
						<div className={`${demoClasses} bg_2 border_radius_xs`}>demoClasses: {demoClasses}</div>
						<div className={`${demo_classes} bg_2 border_radius_xs`}>demo_classes: {demo_classes}</div>
						<div className={`${demoClassName} bg_2 border_radius_xs`}>demoClassName: {demoClassName}</div>
						<div className={`${demo_class_name} bg_2 border_radius_xs`}>demo_class_name: {demo_class_name}</div>
						<div className={`${demoClassNames} bg_2 border_radius_xs`}>demoClassNames: {demoClassNames}</div>
						<div className={`${demo_class_names} bg_2 border_radius_xs`}>demo_class_names: {demo_class_names}</div>
						<div className={`${demoClassList} bg_2 border_radius_xs`}>demoClassList: {demoClassList}</div>
						<div className={`${demo_class_list} bg_2 border_radius_xs`}>demo_class_list: {demo_class_list}</div>
						<div className={`${demoClassLists} bg_2 border_radius_xs`}>demoClassLists: {demoClassLists}</div>
						<div className={`${demo_class_lists} bg_2 border_radius_xs`}>demo_class_lists: {demo_class_lists}</div>
						<div className={`${DEMO_CLASS} bg_2 border_radius_xs`}>DEMO_CLASS: {DEMO_CLASS}</div>
					</div>

					{/* Expression patterns */}
					<div className="column gap_xs">
						<div className={`${ternaryClass} bg_2 border_radius_xs`}>ternaryClass: {ternaryClass}</div>
						<div className={`${logicalClass} bg_2 border_radius_xs`}>logicalClass: {logicalClass}</div>
						<div className={`${arrayClasses[0]} ${arrayClasses[1]} bg_2 border_radius_xs`}>
							arrayClasses: [{arrayClasses.join(', ')}]
						</div>
					</div>

					{/* Comment hints */}
					<div className="column gap_xs">
						<div className={`${fromComment} bg_2 border_radius_xs`}>fromComment: {fromComment}</div>
						<div className={`${arbitraryLiteral} bg_2 border_radius_xs`}>arbitraryLiteral: {arbitraryLiteral}</div>
					</div>
				</section>
			</div>
		</main>
	);
};
