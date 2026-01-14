import {useState} from 'react';

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
	unknownExtracted,
	arbitraryLiteral,
} from '@fuzdev/fuz_css/example_class_utilities.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<main className="p_md md:p_xl">
			<div className="column gap_lg">
				<header className="text-align:center">
					<h1>fuz_css + React</h1>
					<p>Utility classes generated on-demand via Vite plugin</p>
				</header>

				{/* Responsive layout: column on mobile, row on desktop */}
				<section className="column gap_md md:flex-direction:row md:gap_lg">
					<div className="flex:1">
						<h2>Responsive</h2>
						<p>.column .gap_md on mobile, .md:flex-direction:row .md:gap_lg on medium+ screens</p>
					</div>
					<div className="flex:1">
						<h2>Try it</h2>
						<p>Resize the window to see the layout switch from column to row</p>
					</div>
				</section>

				{/* Interactive button with hover states */}
				<section>
					<h2>Interactive</h2>
					<div className="row gap_md mb_lg">
						<button className="hover:border_color_b hover:outline_color_b active:border_color_d active:outline_color_d" onClick={() => setCount((c) => c + 1)}>
							count: {count}
						</button>
						<span>.hover:border_color_b .hover:outline_color_b .active:border_color_d .active:outline_color_d</span>
					</div>
					<div className="row gap_md mb_lg">
						<button className="hover:border_color_g hover:outline_color_g active:border_color_h active:outline_color_h" onClick={() => setCount(0)}>
							reset
						</button>
						<span>.hover:border_color_g .hover:outline_color_g .active:border_color_h .active:outline_color_h</span>
					</div>
				</section>

				{/* Class types */}
				<section>
					<h2>Class types</h2>

					<div>
						<h3>Token classes</h3>
						<div className="p_md bg_d_2">.p_md .bg_d_2</div>
						<div className="pl_xl5 font_size_lg">.pl_xl5 .font_size_lg</div>
						<div className="shadow_sm">.shadow_sm</div>
					</div>

					<div>
						<h3>Composite classes</h3>
						<div className="box">.box</div>
						<div className="ellipsis" style={{maxWidth: '365px'}}>
							.ellipsis — this text truncates with ellipsis when it overflows
						</div>
					</div>

					<div>
						<h3>Literal classes</h3>
						<div className="opacity:60%">.opacity:60%</div>
						<div className="color:var(--color_j_5)">.color:var(--color_j_5)</div>
						<div className="box-shadow:0~4px~8px~rgb(0,0,0,0.2)">.box-shadow:0~4px~8px~rgb(0,0,0,0.2) (~ encodes spaces)</div>
					</div>
				</section>

				{/* Classes from node_modules dependency - verifies extraction */}
				<section>
					<h2>From dependencies</h2>
					<p>Classes imported from <code>@fuzdev/fuz_css/example_class_utilities.js</code></p>

					<div>
						<h3>Naming patterns</h3>
						<div className={demoClass}>demoClass: .{demoClass}</div>
						<div className={demo_class}>demo_class: .{demo_class}</div>
						<div className={DEMO_CLASS}>DEMO_CLASS: .{DEMO_CLASS}</div>
						<div className={demoClasses}>demoClasses: .mb_xs2 .ml_xs</div>
						<div className={demo_classes}>demo_classes: .mb_xs .ml_sm</div>
						<div className={demoClassName}>demoClassName: .{demoClassName}</div>
						<div className={demo_class_name}>demo_class_name: .{demo_class_name}</div>
						<div className={demoClassNames}>demoClassNames: .mb_lg .ml_md</div>
						<div className={demo_class_names}>demo_class_names: .mb_xl .ml_lg</div>
						<div className={demoClassList}>demoClassList: .{demoClassList}</div>
						<div className={demo_class_list}>demo_class_list: .{demo_class_list}</div>
						<div className={demoClassLists}>demoClassLists: .mb_xl4 .ml_xl</div>
						<div className={demo_class_lists}>demo_class_lists: .mb_xl5 .ml_xl2</div>
					</div>

					<div>
						<h3>Expression patterns</h3>
						<div className={ternaryClass}>
							<code>{`true ? 'mt_xs' : 'mt_sm'`}</code> → .{ternaryClass} (both branches extracted)
						</div>
						<div className={logicalClass}>
							<code>{`true && 'mt_md'`}</code> → .{logicalClass}
						</div>
						<div className={`${arrayClasses[0]} ${arrayClasses[1]}`}>
							<code>{`['mt_lg', 'mt_xl']`}</code> → .{arrayClasses.join(', .')}
						</div>
						<div className={objectClasses.mt_xl2}>
							<code>{`{ mt_xl2: 'mt_xl2', mt_xl3: 'mt_xl3' }`}</code> → keys extracted from object
						</div>
					</div>

					<div>
						<h3>Comment hints</h3>
						<div className={fromComment}>
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
