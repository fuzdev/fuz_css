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
} from '@fuzdev/fuz_css/example_class_utilities.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<main className="mx_auto max-width:1000px px_md py_xl7 md:px_xl">
			<div className="column gap_lg">
				<header className="text-align:center">
					<h1>fuz_css + React</h1>
					<p>Utility classes generated on-demand via Vite plugin (<a href="https://css.fuz.dev/docs/classes">docs</a>, <a href="https://github.com/fuzdev/fuz_css/tree/main/examples/vite-react">source</a>)</p>
				</header>

				{/* Class types */}
				<section>
					<h2>Class types</h2>

					<div>
						<h3>Token classes</h3>
						<div className="p_md bg_d_20">.p_md .bg_d_20</div>
						<div className="pl_xl5 font_size_lg">.pl_xl5 .font_size_lg</div>
						<div className="shadow_sm">.shadow_sm</div>
					</div>

					<div>
						<h3>Composite classes</h3>
						<div className="box">.box</div>
						<div className="ellipsis" style={{maxWidth: '365px'}}>
							.ellipsis -- this text truncates with ellipsis when it overflows
						</div>
					</div>

					<div>
						<h3>Literal classes</h3>
						<div className="opacity:60%">.opacity:60%</div>
						<div className="color:var(--color_j_50)">.color:var(--color_j_50)</div>
						<div className="box-shadow:0~4px~8px~rgb(0,0,0,0.2)">.box-shadow:0~4px~8px~rgb(0,0,0,0.2) (~ encodes spaces)</div>
					</div>
				</section>

				{/* Modifiers */}
				<section>
					<h2>Modifiers</h2>

					<div>
						<h3>Responsive</h3>
						<div className="mb_xl3 column gap_md md:flex-direction:row md:gap_lg">
							<div className="flex:1">
								<p>.column .gap_md on mobile, .md:flex-direction:row .md:gap_lg on medium+ screens</p>
							</div>
							<div className="flex:1">
								<p>Resize the window to see the layout switch from column to row</p>
							</div>
						</div>
						<p className="min-width(543px):font_size_lg">.min-width(543px):font_size_lg -- arbitrary breakpoint</p>
					</div>

					<div>
						<h3>Interactive</h3>
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
					</div>
				</section>

				{/* Extraction */}
				<section>
					<h2>Extraction</h2>
					<p>Classes detected via naming conventions, expressions, and comments (examples imported from <code>node_modules</code> to verify dependency scanning)</p>

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
					</div>
				</section>

				<footer className="text-align:center">
					<p>This demos a subset of features.<br />See the <a href="https://css.fuz.dev/docs/classes">docs</a> and <a href="https://github.com/fuzdev/fuz_css/tree/main/examples/vite-react">source code</a> for more.</p>
				</footer>
			</div>
		</main>
	);
};
