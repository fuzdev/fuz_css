import"../chunks/DsnmJJEf.js";import{p as Wa,c as Ka,f as y,s as e,a as C,N as P,b as d,d as o,ak as Ya,t as we,x as t,r as s}from"../chunks/DtM-i9bb.js";import{s as ve}from"../chunks/BKI5iZRW.js";import{e as js}from"../chunks/DDj0E4NJ.js";import{C as c}from"../chunks/B7HLvWYg.js";import{T as Qa}from"../chunks/BtNb02pj.js";import{g as Za}from"../chunks/CgwFB2So.js";import{T as A,a as N}from"../chunks/ngQN1hBV.js";import{T as _}from"../chunks/DITWDnbk.js";import{D as de}from"../chunks/Bi-yxRku.js";import{M as X}from"../chunks/DyrB7Jei.js";import{s as v,f as xe,c as re,a as _e,t as ec,g as Ps,h as qt,j as sc,k as oc,l as tc,m as ac,d as Ht,e as ue,o as cc,n as le,p as dc,q as rc}from"../chunks/rGWiY20K.js";const a=(Se,me=Ya)=>{var $e=lc(),he=C($e);he.textContent="{";var fe=e(he,1,!0),Ls=e(fe,2,!0);t(),we(ge=>{ve(fe,me()[0]),ve(Ls,ge)},[()=>me().at(-1)]),d(Se,$e)};var lc=y('<span class="text_50"></span> <span class="text_50">-</span> <span class="text_50">}</span>',1),ic=y(`<!> <p>The <!> extracts classes
				and generates CSS on-demand. It works with Svelte and plain HTML/TS/JS out of the box. JSX frameworks
				(React, Preact, Solid) require the <a href="https://github.com/acornjs/acorn-jsx"><code>acorn-jsx</code></a> plugin -- see <a href="#React-and-JSX">React and JSX</a> below.</p> <!> <p>Import the virtual module in your entry file, <code>src/routes/+layout.svelte</code> for SvelteKit:</p> <!> <p>For projects managing their own theme or base styles, disable them and import separately:</p> <!> <p>The plugin extracts classes from files as Vite processes them, including from <code>node_modules</code> dependencies. It supports HMR -- changes to classes in your code trigger
				automatic CSS updates.</p> <h4>Plugin options</h4> <ul><li><code>acorn_plugins</code> - required for JSX frameworks, e.g. <code>acorn-jsx</code></li> <li><code>additional_classes</code> - classes to always include (for dynamic patterns that can't
					be statically extracted)</li> <li><code>exclude_classes</code> - classes to exclude from output</li> <li><code>class_definitions</code> - custom class definitions to merge with defaults; can
					define new classes or override existing ones (see <a href="#Composite-classes">composite classes</a>)</li> <li><code>include_default_classes</code> - set to <code>false</code> to use only your own <code>class_definitions</code>, excluding all default token and composite classes</li> <li><code>class_interpreters</code> - <a href="#Custom-interpreters">custom interpreters</a> for
					dynamic class generation; replaces the default interpreters entirely if provided (most users
					don't need this)</li> <li><code>filter_file</code> - custom filter for which files to process. Receives <code>(id: string)</code> and returns <code>boolean</code>, e.g. <!></li> <li><code>on_error</code> - <code>'log'</code> or <code>'throw'</code>; defaults to <code>'throw'</code> in CI, <code>'log'</code> otherwise</li> <li><code>on_warning</code> - <code>'log'</code>, <code>'throw'</code>, or <code>'ignore'</code>; defaults to <code>'log'</code></li> <li><code>cache_dir</code> - cache location; defaults to <code>.fuz/cache/css</code></li> <li><code>base_css</code> - customize or disable base styles; set to <code>null</code> for utility-only
					mode, or provide a callback to modify defaults</li> <li><code>variables</code> - customize or disable theme variables; set to <code>null</code> for
					utility-only mode, or provide a callback to modify defaults</li> <li><code>additional_elements</code> - elements to always include styles for (for
					runtime-created elements), or <code>'all'</code> to include all base styles</li> <li><code>additional_variables</code> - variables to always include in theme output, or <code>'all'</code> to include all theme variables</li></ul> <h4>TypeScript setup</h4> <p>Add the virtual module declaration, like to <code>vite-env.d.ts</code>:</p> <!>`,1),nc=y(`<!> <p>For projects using <a href="https://github.com/ryanatkn/gro">Gro</a>, the <!> generator creates a <code>*.gen.css.ts</code> file anywhere in <code>src/</code>:</p> <!> <p>Then import the generated file, in <code>src/routes/+layout.svelte</code> for SvelteKit:</p> <!> <p>For projects managing their own theme or base styles, disable them and import separately:</p> <!> <h4>Generator options</h4> <p>The Gro generator accepts the same options as the <a href="#Vite-plugin">Vite plugin</a>,
				plus additional options for batch processing:</p> <ul><li><code>include_stats</code> - include file statistics in output (file counts, cache hits/misses,
					class counts)</li> <li><code>project_root</code> - project root directory; defaults to <code>process.cwd()</code></li> <li><code>concurrency</code> - max concurrent file processing for cache reads and extraction; defaults
					to 8</li> <li><code>cache_io_concurrency</code> - max concurrent cache writes and deletes; defaults to 50</li></ul>`,1),pc=y(`<!> <p>The <!> scans your source
				files and extracts class names using three automatic mechanisms, plus manual hints for edge cases:</p> <h4>1. Direct extraction from class attributes</h4> <p>String literals and expressions in class contexts are extracted directly:</p> <ul><li><code>class="..."</code> - static strings</li> <li><code></code> - array syntax (for clsx-compatible frameworks like Svelte)</li> <li><code></code> - object syntax (for clsx-compatible frameworks like Svelte)</li> <li><code></code> - ternary expressions</li> <li><code></code> - logical expressions</li> <li><code>class:name</code> - class directives (Svelte)</li> <li><code>clsx()</code>, <code>cn()</code>, <code>cx()</code>, <code>classNames()</code> - utility
					function calls</li></ul> <h4>2. Naming convention</h4> <p>Variables ending with <code>class</code>, <code>classes</code>, <code>className</code>, <code>classNames</code>, <code>class_name</code>, or <code>class_names</code> (case-insensitive)
				are always extracted, regardless of where they're used:</p> <!> <h4>3. Usage tracking</h4> <p>Variables used in class attributes are tracked back to their definitions, even if they don't
				follow the naming convention:</p> <!> <p>Usage tracking works for variables inside <code>clsx()</code>, arrays, ternaries, and
				logical expressions within class attributes. Note that standalone <code>clsx()</code> calls outside
				class attributes don't trigger tracking -- use the naming convention for those cases.</p> <aside>Currently, tracking is single-file only. Cross-module analysis and more sophisticated
				inference are potential future improvements. <a href="https://github.com/fuzdev/fuz_css/discussions">Discussion</a> is appreciated here.</aside> <h4>4. Manual hints</h4> <p>For dynamically constructed classes that can't be statically analyzed, use the <code>@fuz-classes</code> comment:</p> <!> <p>A common case is iterating over variant arrays to generate demos or UI. The extractor sees <code></code> but can't resolve what <code>variant</code> will be at runtime:</p> <!> <aside>Edge values like <code>_00</code> and <code>_100</code> are especially easy to miss -- they're
				generally not used directly in your code (they exist mainly for programmatic usage ergonomics),
				so the class won't be generated unless you hint it.</aside> <aside>Classes annotated with <code>@fuz-classes</code> and configured with <code>additional_classes</code> produce errors if they can't be resolved. This helps catch typos like <code>@fuz-classes color_a_55</code> instead of <code>color_a_50</code>.</aside> <p>Alternatively, use the <!> option in your config to the Vite plugin or Gro generator:</p> <!> <p>Use <!> to filter out false
				positives from extraction. This also suppresses warnings for these classes, even if they were
				explicitly annotated:</p> <!> <h4>Element hints</h4> <p>Similar to <code>@fuz-classes</code>, use <code>@fuz-elements</code> to declare elements that
				should be included even when they can't be statically detected:</p> <!> <aside>Like <code>@fuz-classes</code>, explicit declarations via <code>@fuz-elements</code> produce <strong>errors</strong> if they can't be resolved, helping catch typos early.</aside> <h4>CSS variable detection</h4> <p>CSS variables are detected via simple regex scan of <code>var(--name</code> patterns in all
				source files. Only theme variables are included; unknown variables are silently ignored.
				This approach catches usage in component props like <code></code> that AST-based extraction would miss.</p> <h4>5. Build-time limitations</h4> <p>Class and element detection happens at build time via static analysis. Content created
				dynamically at runtime (<code>document.createElement()</code>, <code>innerHTML</code>,
				framework hydration) won't be detected.</p> <p>Use <!> to force-include
				element styles for runtime-created elements:</p> <!>`,1),_c=y(`<!> <!> <p>Use the <!> or <!> to generate bundled CSS that
			includes theme variables, base styles, and utility classes:</p> <!> <!> <!>`,1),uc=y("<code> </code>"),vc=y("<code> </code>"),mc=y("<code> </code>"),hc=y(`<!> <p>Token classes are technically <a href="#Composite-classes">composite classes</a> with a
				close relationship to <!> -- each maps design
				tokens to CSS properties. They're generated programmatically from variant data, making them predictable
				and systematic. The composites documented <a href="#Composite-classes">below</a> are hand-written and typically represent higher-level semantic concepts. For raw CSS values, use <a href="#Literal-classes">literal classes</a> instead.</p> <!> <p class="pl_xl3 color_g_50">some token classes</p> <p>Token classes use <code>snake_case</code> because style variables are designed for optional
				use in JS (imported from <!>, but costing nothing
				otherwise), so each name is consistent across both JS and CSS, instead of converting between <code>kebab-case</code> and <code>camelCase</code>. This also makes token classes visually distinct from <a href="#Literal-classes">literal classes</a>; we find this improves readability.</p> <h4>Spacing</h4> <p>See <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.p_<!></code> <code>.p_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.pt_<!></code> <code>.pt_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.pr_<!></code> <code>.pr_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.pb_<!></code> <code>.pb_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.pl_<!></code> <code>.pl_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.px_<!></code> <code>.px_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.py_<!></code> <code>.py_0</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.m_<!></code> <code>.m_0</code> <code>.m_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.mt_<!></code> <code>.mt_0</code> <code>.mt_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.mr_<!></code> <code>.mr_0</code> <code>.mr_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.mb_<!></code> <code>.mb_0</code> <code>.mb_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.ml_<!></code> <code>.ml_0</code> <code>.ml_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.mx_<!></code> <code>.mx_0</code> <code>.mx_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.my_<!></code> <code>.my_0</code> <code>.my_auto</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.gap_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.column_gap_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.row_gap_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.top_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.right_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.bottom_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.left_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.inset_<!></code></span></li></ul> <aside class="mt_lg">Padding and margin include <code>_0</code> (and <code>_auto</code> for margin) for
				ergonomics: <code>pb_0</code> is much shorter than <code>padding-bottom:0</code>. Other properties use <a href="#Literal-classes">literals</a> for
				raw values.</aside> <h4>Sizing</h4> <p>See <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.width_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.height_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.width_atmost_<!></code> <code>.width_atleast_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.height_atmost_<!></code> <code>.height_atleast_<!></code></span></li></ul> <h4>Colors</h4> <p>See <!>, <!>, and <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.color_<!>_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.bg_<!>_<!></code></span></li></ul> <aside>Color and text classes (<code>.color_a_50</code>, <code>.text_70</code>, etc.) also set <code>--text_color</code>, so nested elements like <code>&lt;code&gt;</code> that use <code>color: var(--text_color)</code> inherit the color properly.</aside> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.text_min</code> <code>.text_max</code> <code>.text_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shade_min</code> <code>.shade_max</code> <code>.shade_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.hue_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.darken_<!></code> <code>.lighten_<!></code></span></li></ul> <aside>The <code>text_*</code> and <code>shade_*</code> scales are separate because text and
				backgrounds have different contrast requirements. Use <code>text_*</code> for text colors
				and <code>shade_*</code> for backgrounds. Both follow "prominence" semantics for light and dark
				modes: low numbers are subtle, high numbers are strong.</aside> <h4>Typography</h4> <p>See <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.font_size_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.line_height_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.icon_size_<!></code></span></li></ul> <h4>Borders</h4> <p>See <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_color_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_color_<!>_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_width_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_radius_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_top_left_radius_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_top_right_radius_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_bottom_left_radius_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.border_bottom_right_radius_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.outline_width_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.outline_color_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.outline_color_<!>_<!></code></span></li></ul> <h4>Shadows</h4> <p>See <!>.</p> <ul class="unstyled"><li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_top_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_bottom_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_inset_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_inset_top_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_inset_bottom_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_color_<!>_<!></code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><code>.shadow_alpha_<!></code></span></li></ul>`,1),fc=y(`<!> <p>Composites let you name and reuse patterns, extending the class system with your own
				vocabulary. They have four forms: raw CSS declarations, compositions of other classes, a
				combination of both, or full rulesets as an escape hatch for multi-selector patterns (child
				selectors, sibling combinators, etc.).</p> <h4>Four definition forms</h4> <p>All four of these produce the same CSS output for <code>.centered</code>, with the ruleset
				form additionally demonstrating child selectors (<code>&gt; * + *</code>) which can't be
				expressed with the other forms.</p> <!> <p>Generated CSS:</p> <!> <p>And the ruleset form (4) includes the additional selector:</p> <!> <h4>Nesting</h4> <p>Composites can compose other composites, enabling layered abstractions. Resolution is
				depth-first: nested composes are fully resolved before the parent's <code>declaration</code> is appended. Circular references are detected and produce an error.</p> <h4>What <code>composes</code> can reference</h4> <p>The <code>composes</code> property resolves referenced classes and combines their
				declarations. When both <code>composes</code> and <code>declaration</code> are present, the explicit
				declaration comes last (winning in the cascade for duplicate properties).</p> <ul><li>token classes (<code>p_lg</code>, <code>color_a_50</code>) - resolved to their
					declarations</li> <li>composites with <code>declaration</code> - the declaration is included</li> <li>composites with <code>composes</code> - recursively resolved</li> <li>unmodified CSS literals (<code>text-align:center</code>, <code>margin:0~auto</code>, <code>--my-var:value</code>) - parsed and included as declarations</li></ul> <p><strong>Not allowed:</strong> Composites with <code>ruleset</code> cannot be referenced in <code>composes</code> because they define their own selectors. Modified classes (like <code>hover:opacity:80%</code> or <code>md:p_lg</code>) cannot be used in <code>composes</code> arrays because they require wrapper selectors (apply them directly in
				markup instead). The <code>composes</code> property merges declarations into a single rule,
				but multi-selector patterns like <code></code> cannot be
				inlined. These limitations may be revisited in the future; feedback is welcome in the <a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.</p> <aside><p>The system tries to give helpful errors:</p> <ul><li>property typos like <code>disply:flex</code> suggest <code>display</code></li> <li>modifier typos like <code>hovr:box</code> suggest <code>hover:box</code></li> <li>ruleset classes in <code>composes</code> produce: <code>Cannot reference ruleset class "clickable" in composes array</code></li> <li>circular references produce: <code>Circular reference detected: a → b → a</code></li></ul></aside> <h4>Modifiers</h4> <p>Composites support <a href="#Modifiers">modifiers</a> like any other class. For <code>composes</code> and <code>declaration</code> composites, declarations are combined and wrapped. For <code>ruleset</code> composites, modifiers
				are applied to each selector (with smart conflict detection):</p> <!> <h4>Registering composites</h4> <p>Register custom composites with the Vite plugin or Gro generator:</p> <h5>Vite plugin</h5> <!> <h5>Gro generator</h5> <!> See <a href="#Usage">Usage</a> for more details. <h4>Builtin composites</h4> <p><strong>Composable</strong> (can be used in <code>composes</code> arrays):</p> <ul><li><code>.box</code> - centered flex container</li> <li><code>.row</code> - horizontal flex row</li> <li><code>.column</code> - vertical flex column</li> <li><code>.ellipsis</code> - text overflow ellipsis</li> <li><code>.pane</code> - pane container</li> <li><code>.panel</code> - panel container</li> <li><code>.icon_button</code> - icon button styling</li> <li><code>.pixelated</code> - crisp pixel-art rendering</li> <li><code>.circular</code> - 50% border-radius</li></ul> <p><strong>Ruleset-based</strong> (multi-selector, apply directly in markup):</p> <ul><li><code>.selectable</code> - selectable element styling</li> <li><code>.clickable</code> - clickable element styling</li> <li><code>.plain</code> - plain/reset styling</li> <li><code>.menu_item</code> - menu item styling</li> <li><code>.chevron</code> - chevron indicator</li> <li><code>.chip</code> - chip/tag styling</li></ul>`,1),gc=y(`<!> <p>Fuz supports an open-ended CSS-literal syntax: <code>property:value</code>. Any CSS property
				and value works, offering arbitrary styles without a DSL.</p> <!> <p>The <code>~</code> character represents a space in class names (since CSS classes can't
				contain spaces). Use it for multi-value properties like <code>margin:1px~auto</code>.</p> <p>Custom properties work directly: <code>--my-var:value</code> sets the property on the element.
				This is useful for scoped variables or passing values to child components.</p>`,1),bc=y("<!> <!> <!> <!>",1),yc=y(`<!> <p>Combined modifiers follow a canonical order enforced with errors that guide you. Multiple
				states must be alphabetical (<code>focus:hover:</code> not <code>hover:focus:</code>)
				because both generate equivalent CSS -- canonical ordering prevents duplicates.</p> <!> <ol><li><strong>media</strong> - one of <code>md:</code>, <code>lg:</code>, <code>print:</code>,
					etc</li> <li><strong>ancestor</strong> - one of <code>dark:</code> or <code>light:</code> (likely <code>rtl:</code>/<code>ltr:</code> in the future)</li> <li><strong>state</strong> - any of <code>hover:</code>, <code>focus:</code>, <code>disabled:</code>, etc, sorted alphabetically</li> <li><strong>pseudo-element</strong> - one of <code>before:</code>, <code>after:</code>, <code>placeholder:</code>, etc</li></ol> <!> <p>Generated CSS for <code>md:dark:hover:opacity:83%</code>:</p> <!>`,1),xc=y(`<!> <p>Modifiers prefix any class type -- token, composite, or literal -- to apply styles
			conditionally based on viewport, state, or color scheme. This is what makes utility classes
			more powerful than inline styles.</p> <h4>Responsive modifiers</h4> <p>Mobile-first breakpoints:</p> <table><thead><tr><th>Prefix</th><th>Width</th><th>CSS</th></tr></thead><tbody><tr><td><code>sm:</code></td><td>40rem (640px)</td><td><code>@media (width >= 40rem)</code></td></tr><tr><td><code>md:</code></td><td>48rem (768px)</td><td><code>@media (width >= 48rem)</code></td></tr><tr><td><code>lg:</code></td><td>64rem (1024px)</td><td><code>@media (width >= 64rem)</code></td></tr><tr><td><code>xl:</code></td><td>80rem (1280px)</td><td><code>@media (width >= 80rem)</code></td></tr><tr><td><code>2xl:</code></td><td>96rem (1536px)</td><td><code>@media (width >= 96rem)</code></td></tr></tbody></table> <!> <h4>State modifiers</h4> <p>Pseudo-class modifiers for interaction and form states:</p> <!> <p>Available state modifiers include:</p> <ul><li class="mb_md"><span class="code_chips svelte-16b1nul"><strong>interaction:</strong> <code>hover:</code> <code>focus:</code> <code>focus-visible:</code> <code>focus-within:</code> <code>active:</code> <code>link:</code> <code>visited:</code> <code>any-link:</code> <code>target:</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><strong>form:</strong> <code>autofill:</code> <code>blank:</code> <code>disabled:</code> <code>enabled:</code> <code>checked:</code> <code>indeterminate:</code> <code>required:</code> <code>optional:</code> <code>valid:</code> <code>invalid:</code> <code>user-valid:</code> <code>user-invalid:</code> <code>in-range:</code> <code>out-of-range:</code> <code>placeholder-shown:</code> <code>read-only:</code> <code>read-write:</code> <code>default:</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><strong>structural:</strong> <code>first:</code> <code>last:</code> <code>only:</code> <code>first-of-type:</code> <code>last-of-type:</code> <code>only-of-type:</code> <code>odd:</code> <code>even:</code> <code>empty:</code> <code>nth-child(N):</code> <code>nth-last-child(N):</code> <code>nth-of-type(N):</code> <code>nth-last-of-type(N):</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul"><strong>UI states:</strong> <code>fullscreen:</code> <code>modal:</code> <code>open:</code> <code>popover-open:</code></span></li> <li class="mb_md"><span class="code_chips svelte-16b1nul">media: <code>playing:</code> <code>paused:</code></span></li></ul> <h4>Color-scheme modifiers</h4> <p>Apply styles in dark or light mode:</p> <!> <p><code>dark:</code> and <code>light:</code> use <code>:root.dark</code> and <code>:root.light</code> selectors, matching fuz_css's color scheme mechanism.</p> <h4>Pseudo-element modifiers</h4> <p>Style generated content and element parts:</p> <!> <p class="code_chips svelte-16b1nul"><strong>available:</strong> <code>before:</code> <code>after:</code> <code>cue:</code> <code>first-letter:</code> <code>first-line:</code> <code>placeholder:</code> <code>selection:</code> <code>marker:</code> <code>file:</code> <code>backdrop:</code></p> <aside>Note: <code>before:</code> and <code>after:</code> require explicit <code>content</code> - there's no auto-injection. This maintains the 1:1 CSS mapping principle.</aside> <h4>Media feature modifiers</h4> <p>Accessibility and context-aware styles:</p> <!> <p class="code_chips svelte-16b1nul"><strong>available:</strong> <code>print:</code> <code>motion-safe:</code> <code>motion-reduce:</code> <code>contrast-more:</code> <code>contrast-less:</code> <code>portrait:</code> <code>landscape:</code> <code>forced-colors:</code></p> <!>`,1),wc=y(`<!> <p>fuz_css's <!> provides styles for base
			HTML elements using <!>, acting as a modern
			CSS reset that adapts to dark mode. It includes CSS classes that provide common generic
			functionality -- these are called builtin classes.</p> <h4><code>.unstyled</code></h4> <p>Default list (styled):</p> <!> <ul><li>1</li> <li>2</li></ul> <p>With <code>.unstyled</code>:</p> <!> <ul class="unstyled"><li>a</li> <li>b</li></ul> <p>The <code>.unstyled</code> class lets fuz_css provide solid default element styles with a simple
			opt-out:</p> <!> <p>This strategy supports semantic hooks for theming:</p> <!> <aside>The <code>:where()</code> selector keeps specificity as low as possible to minimize interference
			with your styles. It's used throughout the reset stylesheet.</aside> <p>See the specific docs sections for more about <code>.unstyled</code>.</p> <h4>Other builtin classes</h4> <ul><li><code>.selected</code> - see <!>, <!></li> <li><code>.disabled</code> - see <!></li> <li><code>.deselectable</code> - see <!></li> <li><code>.inline</code> - see <!>, <!></li> <li><code>.heading</code> - see <!></li> <li><code>.title</code> - see <!></li> <li><code>.row</code> - see <!>, <!></li> <li><code>.color_a</code> through <code>.color_j</code> - see <!>, <!></li> <li><code>.dark</code>, <code>.light</code> on <code>:root</code> - see <!></li></ul>`,1),Sc=y('<!> <p>The <!> parses and analyzes\n				the AST to understand <a href="https://svelte.dev/docs/svelte/class">Svelte\'s class syntax</a>. Supported\n				constructs:</p> <ul><li><strong>attributes:</strong> <code>class="..."</code>, <code></code>, <code></code> (identifier and string-literal keys), <code>class:name</code></li> <li><strong>expressions:</strong> logical (<code>&&</code>, <code>||</code>, <code>??</code>), ternaries, template literals (complete tokens only -- <code>`color_a_50 $&#123;base&#125;`</code> extracts <code>color_a_50</code>, but <code>`color_$&#123;hue&#125;_50`</code> cannot be extracted; use <code>@fuz-classes</code> or <code>additional_classes</code>)</li> <li><strong>Svelte 5 runes:</strong> <code>$derived()</code> and <code>$derived.by()</code> for\n					class variables</li> <li><strong>utility calls:</strong> <code>clsx()</code>, <code>cn()</code>, <code>cx()</code>, <code>classNames()</code> with nested arrays, objects, and utility calls</li> <li><strong>scripts:</strong> both <code>&lt;script&gt;</code> and <code>&lt;script module&gt;</code>, with naming convention and usage tracking</li></ul>',1),$c=y(`<!> <p>To enable JSX support for React, Preact, Solid, etc, install <a href="https://github.com/acornjs/acorn-jsx"><code>acorn-jsx</code></a> and pass it to the plugin or generator:</p> <!> <h4>Vite plugin</h4> <!> <h4>Gro generator</h4> <!> <p>Supported JSX patterns:</p> <ul><li><code>className="..."</code> and <code>class="..."</code> - static strings</li> <li><code></code> - utility function calls</li> <li><code></code> - ternary and logical expressions</li> <li><code></code> - Solid's classList</li> <li>usage tracking: variables in <code>className</code>, <code>class</code>, and <code>classList</code> are tracked back to their definitions (has limitations, room for improvement)</li></ul> <!> <p>The <!> option accepts any
				Acorn-compatible plugin, so other syntax extensions can be supported the same way.</p>`,1),kc=y(`<!> <p>fuz_css is Svelte-first, but the base styles (<!>, <!>) work with any framework and plain HTML. The utility
			class generator has varying <a href="#Class-detection">detection</a> support:</p> <table><thead><tr><th>framework</th><th>detection</th><th>notes</th></tr></thead><tbody><tr><td>Svelte</td><td>full</td><td>all patterns including <code>class:</code> directives and array/object syntax</td></tr><tr><td>plain HTML</td><td>full</td><td>static <code>class="..."</code> attributes, script variables</td></tr><tr><td>React / JSX</td><td>full</td><td>with <code>acorn-jsx</code> plugin - <code>className</code></td></tr><tr><td>Preact</td><td>full</td><td>with <code>acorn-jsx</code> plugin - <code>class</code></td></tr><tr><td>Solid</td><td>full</td><td>with <code>acorn-jsx</code> plugin - <code>class</code>, <code>classList</code></td></tr><tr><td>Vue JSX</td><td>full</td><td>with <code>acorn-jsx</code> plugin - <code>class</code></td></tr><tr><td>Vue SFC, Angular, etc.</td><td>none</td><td>template syntax not parsed; use <code>clsx</code>/<code>cx</code>/<code>cn</code> in JS/TS</td></tr></tbody></table> <p>The <!> plugin config
			option is an escape hatch for classes that can't be statically detected. Acorn plugins can be added
			via <!> for additional syntax support
			like <a href="#React-and-JSX">JSX</a>.</p> <p>Out of the box, class generation works only with TypeScript/JS, Svelte, and JSX. Angular is
			not supported; Vue JSX is supported but their recommended SFC format is not. We could revisit
			this if there's demand.</p> <!> <!>`,1),Cc=y(`<!> <p><!> dynamically generate
			CSS for class names that aren't in the static definitions (which can be extended via <code>class_definitions</code> or replaced with <code>include_default_classes: false</code>). The default <a href="#Literal-classes">CSS-literal syntax</a> and <a href="#Modifiers">modifier support</a> are both implemented as interpreters, which you can extend
			or replace.</p> <p>For advanced use cases, you can define custom interpreters that generate CSS from arbitrary
			class name patterns. This is similar to UnoCSS's dynamic rules, which also use regex +
			function patterns. An interpreter has a regex <code>pattern</code> and an <code>interpret</code> function that returns CSS (or <code>null</code> to pass):</p> <!> <p>This generates <code>grid-cols-1</code> through <code>grid-cols-24</code> on-demand --
			something that would require 24 separate composite definitions. Note the classes for this
			example could also be created as composites with a helper function -- fuz_css uses this
			strategy internally to create its token classes in <!>.</p> <p>Register with the Vite plugin or Gro generator:</p> <!> <p>The interpreter context provides access to <code>class_definitions</code>, <code>css_properties</code> (for validation), and <code>diagnostics</code> (for errors/warnings).
			This enables full programmatic control over class-to-CSS generation.</p> <aside>Custom interpreters replace the defaults entirely, so include <code>...css_class_interpreters</code> to preserve CSS-literal and modified-class support. This area is experimental and the API may change.</aside>`,1),zc=y(`<!> <p>TailwindCSS and UnoCSS are utility-first frameworks where classes have primacy. fuz_css is
			semantic-first: utilities complement HTML defaults rather than being the primary styling
			mechanism.</p> <table><thead><tr><th></th><th>TailwindCSS</th><th>UnoCSS</th><th>fuz_css</th></tr></thead><tbody><tr><td>primary syntax</td><td>DSL-first</td><td>config-first</td><td><a href="#Token-classes">token DSL</a> + <a href="#Literal-classes">CSS literals</a></td></tr><tr><td>multi-property</td><td><code>@apply</code>, plugins</td><td>shortcuts</td><td><a href="#Composite-classes">composites</a></td></tr><tr><td>arbitrary values</td><td>DSL (<code>bg-[#abc]</code>)</td><td>any (presets)</td><td>CSS syntax (<code>background:#abc</code>)</td></tr><tr><td>detection</td><td>regex</td><td>regex</td><td>AST (more capable, slower)</td></tr><tr><td>token source</td><td>CSS (<code>@theme</code>)</td><td>JS/TS config</td><td>TS variables (importable)</td></tr><tr><td>extensibility</td><td>plugins</td><td>rules, variants, presets</td><td><a href="#Custom-interpreters">interpreters</a></td></tr></tbody></table> <p>fuz_css's modifier system is less expressive than TailwindCSS's variants. Missing:
			parent/sibling/descendant state (<code>group-hover:</code>, <code>peer-invalid:</code>, <code>has-checked:</code>), arbitrary variants (<code>[&.is-dragging]:</code>), child
			selectors (<code>*:</code>), container queries (<code>@md:</code>), data/ARIA variants, and
			more. When you need these patterns, fuz_css currently expects you to use rulesets or <code>&lt;style&gt;</code> tags, but the API is still a work in progress, and a more powerful and
			potentially more TailwindCSS-aligned system is on the table.</p> <p>For extensibility, all three frameworks allow custom class-to-CSS mappings. UnoCSS's dynamic
			rules use regex + function patterns similar to fuz_css interpreters, plus separate variants
			for modifiers. TailwindCSS uses JS plugins and UnoCSS has the more mature extensibility story;
			fuz_css offers comparable power with interpreters but it's still evolving -- <a href="https://github.com/fuzdev/fuz_css/discussions">feedback</a> is welcome!</p> <p>fuz_css fits best when you prefer semantic HTML with styled defaults. Design tokens are
			defined in TypeScript, naturally adapt to dark mode, and can be imported in TS for typesafe
			runtime access. The tradeoffs include a more limited DSL and more verbose literal syntax,
			which nudges you toward <code>&lt;style&gt;</code> tags, tokens when appropriate, or composites
			for repeated patterns.</p>`,1),Tc=y(`<p>fuz_css has two categories of CSS classes: utilities and builtins. Builtins are baked into the
		main stylesheet; utility classes have three types, are optional, and require build tool
		integration.</p> <p>Utility classes complement <!> and <!>. Use them to compose styles across
		component boundaries, or when you prefer classes to the <code>&lt;style&gt;</code> tag and <code>style</code> attribute. They're optional and generated on-demand to include only what you use.</p> <p>Compared to TailwindCSS and UnoCSS, fuz_css utility classes follow the grain of semantic HTML
		rather than being foundational to the design, and the DSL is currently more limited, with
		interpreters providing a programmatic escape hatch -- see the <a href="#Compared-to-alternatives">comparison</a> below.</p> <p>Compared to the <code>&lt;style&gt;</code> tag, classes:</p> <ul><li>offer shorthand for style variables (<code>p_lg</code> vs <code>padding: var(--space_lg)</code>)</li> <li>compose across component boundaries, avoiding fragile <code>:global()</code> selectors</li> <li>let you avoid noisy class names like <code>foo-wrapper</code> and <code>bar-inner</code></li></ul> <p>Compared to the <code>style</code> attribute, classes:</p> <ul><li>support powerful modifiers for responsive widths, interaction states (like hover), and dark
			mode</li> <li>provide more control over specificity</li> <li>compose ergonomically with libraries like <a href="https://github.com/lukeed/clsx">clsx</a>,
			which Svelte supports <a href="https://svelte.dev/docs/svelte/class">natively</a></li></ul> <p>For cases where classes lack clear advantages, <code>style</code> and <code>&lt;style&gt;</code> are simpler and avoid generating class definitions, which can bloat your builds when overused.</p> <!> <!> <!> <!> <!> <!> <!> <hr/> <section><p><code>fuz_css</code> is still early in development. Your input is welcome in the <a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>!</p></section>`,1);function Gc(Se,me){Wa(me,!0);const he=Za("classes");Qa(Se,{get tome(){return he},children:(fe,Ls)=>{var ge=Tc(),ke=e(C(ge),2),Ms=e(o(ke));_(Ms,{name:"semantic",children:(z,Y)=>{t();var u=P("semantic styles");d(z,u)},$$slots:{default:!0}});var Ot=e(Ms,2);_(Ot,{name:"variables",children:(z,Y)=>{t();var u=P("style variables");d(z,u)},$$slots:{default:!0}}),t(5),s(ke);var As=e(ke,14);A(As,{children:(z,Y)=>{var u=_c(),k=C(u);N(k,{text:"Usage"});var x=e(k,2);c(x,{lang:null,content:"npm i -D @fuzdev/fuz_css"});var T=e(x,2),U=e(o(T));X(U,{module_path:"vite_plugin_fuz_css.ts",children:(p,n)=>{t();var l=P("Vite plugin");d(p,l)},$$slots:{default:!0}});var g=e(U,2);X(g,{module_path:"gen_fuz_css.ts",children:(p,n)=>{t();var l=P("Gro generator");d(p,l)},$$slots:{default:!0}}),t(),s(T);var L=e(T,2);A(L,{children:(p,n)=>{var l=ic(),r=C(l);N(r,{text:"Vite plugin",tag:"h3"});var i=e(r,2),m=e(o(i));X(m,{module_path:"vite_plugin_fuz_css.ts",children:(M,O)=>{t();var J=P("Vite plugin");d(M,J)},$$slots:{default:!0}}),t(5),s(i);var h=e(i,2);c(h,{lang:"ts",content:`// vite.config.ts
import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
  plugins: [sveltekit(), vite_plugin_fuz_css()],
});`});var f=e(h,4);c(f,{lang:"ts",content:`// +layout.svelte - bundled mode (recommended, default config)
// includes only used base styles, variables, and utilities
import 'virtual:fuz.css';`});var b=e(f,4);c(b,{lang:"ts",content:`// vite.config.ts - utility-only mode
vite_plugin_fuz_css({
	base_css: null,
	variables: null,
}),

// +layout.svelte - full package CSS, only used utilities
import '@fuzdev/fuz_css/style.css'; // all base styles
import '@fuzdev/fuz_css/theme.css'; // all variables
import 'virtual:fuz.css';`});var $=e(b,6),F=e(o($),12),j=e(o(F),6);c(j,{inline:!0,lang:"ts",content:"(id) => !id.includes('/fixtures/')"}),s(F),t(14),s($);var D=e($,6);c(D,{lang:"ts",content:`/// <reference types="vite/client" />

declare module 'virtual:fuz.css' {
  const css: string;
  export default css;
}`}),d(p,l)},$$slots:{default:!0}});var w=e(L,2);A(w,{children:(p,n)=>{var l=nc(),r=C(l);N(r,{text:"Gro generator",tag:"h3"});var i=e(r,2),m=e(o(i),3);X(m,{module_path:"gen_fuz_css.ts"}),t(5),s(i);var h=e(i,2);c(h,{lang:"ts",content:`// src/routes/fuz.gen.css.ts for SvelteKit, or src/fuz.gen.css.ts, etc.
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';

export const gen = gen_fuz_css();`});var f=e(h,4);c(f,{lang:"ts",content:`// +layout.svelte - bundled mode (recommended, default config)
// includes only used base styles, variables, and utilities
import './fuz.css';`});var b=e(f,4);c(b,{lang:"ts",content:`// fuz.gen.css.ts - utility-only mode
export const gen = gen_fuz_css({
	base_css: null,
	variables: null,
});

// +layout.svelte - full package CSS, only used utilities
import '@fuzdev/fuz_css/style.css'; // all base styles
import '@fuzdev/fuz_css/theme.css'; // all variables
import './fuz.css';`}),t(6),d(p,l)},$$slots:{default:!0}});var S=e(w,2);A(S,{children:(p,n)=>{var l=pc(),r=C(l);N(r,{text:"Class detection",tag:"h3"});var i=e(r,2),m=e(o(i));X(m,{module_path:"css_class_extractor.ts",children:(H,ae)=>{t();var K=P("extractor");d(H,K)},$$slots:{default:!0}}),t(),s(i);var h=e(i,6),f=e(o(h),2),b=o(f);b.textContent="class={[...]}",t(),s(f);var $=e(f,2),F=o($);F.textContent="class={{...}}",t(),s($);var j=e($,2),D=o(j);D.textContent="class={cond ? 'a' : 'b'}",t(),s(j);var M=e(j,2),O=o(M);O.textContent="class={(cond && 'a') || 'b'}",t(),s(M),t(4),s(h);var J=e(h,6);c(J,{lang:"ts",content:`// extracted because of naming convention
const buttonClasses = 'color_d font_size_lg';
const buttonClass = active ? 'active' : null;
const snake_class = 'snake';
const turtle_class_name = 'turtle';`});var G=e(J,6);c(G,{lang:"svelte",content:`<script>
	const styles = 'some-class';   // tracked from class={styles}
	const variant = 'other-class'; // tracked from clsx()
<\/script>

<div class={styles}></div>
<button class={clsx('color_d', variant)}></button>`});var E=e(G,10);c(E,{lang:"ts",content:`// @fuz-classes opacity:50% opacity:75% opacity:100%
const opacity_classes = [50, 75, 100].map((n) => \`opacity:\${n}%\`);

/* @fuz-classes color_a_50 color_b_50 color_c_50 */
const color = get_dynamic_color();`});var V=e(E,2),ee=e(o(V));ee.textContent='class="shadow_alpha_{variant}"',t(3),s(V);var q=e(V,2);c(q,{lang:"svelte",content:`<script>
	import {shadow_alpha_variants} from '@fuzdev/fuz_css/variable_data.js';

	// @fuz-classes shadow_alpha_00 shadow_alpha_05 shadow_alpha_10 ... shadow_alpha_100
<\/script>

{#each shadow_alpha_variants as variant}
	<div class="shadow_alpha_{variant}">...</div>
{/each}`});var B=e(q,6),oe=e(o(B));de(oe,{name:"GenFuzCssOptions",children:(H,ae)=>{t();var K=P("additional_classes");d(H,K)},$$slots:{default:!0}}),t(),s(B);var Q=e(B,2);c(Q,{lang:"ts",content:`vite_plugin_fuz_css({
	additional_classes: ['opacity:50%', 'opacity:75%', 'opacity:100%'],
});`});var W=e(Q,2),Z=e(o(W));de(Z,{name:"GenFuzCssOptions",children:(H,ae)=>{t();var K=P("exclude_classes");d(H,K)},$$slots:{default:!0}}),t(),s(W);var ie=e(W,2);c(ie,{lang:"ts",content:`vite_plugin_fuz_css({
	exclude_classes: ['some:false:positive'],
});`});var be=e(ie,6);c(be,{lang:"ts",content:`// @fuz-elements dialog
const el = document.createElement('dialog');`});var se=e(be,6),ye=e(o(se),3);ye.textContent='size="var(--icon_size_xs)"',t(),s(se);var te=e(se,6),Ce=e(o(te));de(Ce,{name:"GenFuzCssOptions",children:(H,ae)=>{t();var K=P("additional_elements");d(H,K)},$$slots:{default:!0}}),t(),s(te);var ne=e(te,2);c(ne,{lang:"ts",content:`vite_plugin_fuz_css({
	additional_elements: ['dialog', 'details', 'datalist'],
});`}),d(p,l)},$$slots:{default:!0}}),d(z,u)},$$slots:{default:!0}});var Ns=e(As,2);A(Ns,{children:(z,Y)=>{var u=bc(),k=C(u);N(k,{text:"Utility class types"});var x=e(k,2);A(x,{children:(g,L)=>{var w=hc(),S=C(w);N(S,{text:"Token classes",tag:"h3"});var p=e(S,2),n=e(o(p),3);_(n,{name:"variables",children:(R,ce)=>{t();var I=P("style variables");d(R,I)},$$slots:{default:!0}}),t(5),s(p);var l=e(p,2);c(l,{content:'<p class="pl_xl3 color_g_50">some token classes</p>'});var r=e(l,4),i=e(o(r),3);X(i,{module_path:"variables.ts"}),t(7),s(r);var m=e(r,4),h=e(o(m));_(h,{name:"layout"}),t(),s(m);var f=e(m,2),b=o(f),$=o(b),F=o($),j=e(o(F));a(j,()=>v),s(F),t(2),s($),s(b);var D=e(b,2),M=o(D),O=o(M),J=e(o(O));a(J,()=>v),s(O),t(2),s(M),s(D);var G=e(D,2),E=o(G),V=o(E),ee=e(o(V));a(ee,()=>v),s(V),t(2),s(E),s(G);var q=e(G,2),B=o(q),oe=o(B),Q=e(o(oe));a(Q,()=>v),s(oe),t(2),s(B),s(q);var W=e(q,2),Z=o(W),ie=o(Z),be=e(o(ie));a(be,()=>v),s(ie),t(2),s(Z),s(W);var se=e(W,2),ye=o(se),te=o(ye),Ce=e(o(te));a(Ce,()=>v),s(te),t(2),s(ye),s(se);var ne=e(se,2),H=o(ne),ae=o(H),K=e(o(ae));a(K,()=>v),s(ae),t(2),s(H),s(ne);var ze=e(ne,2),Is=o(ze),Ds=o(Is),Bt=e(o(Ds));a(Bt,()=>v),s(Ds),t(4),s(Is),s(ze);var Te=e(ze,2),Gs=o(Te),Vs=o(Gs),Wt=e(o(Vs));a(Wt,()=>v),s(Vs),t(4),s(Gs),s(Te);var je=e(Te,2),Xs=o(je),qs=o(Xs),Kt=e(o(qs));a(Kt,()=>v),s(qs),t(4),s(Xs),s(je);var Pe=e(je,2),Hs=o(Pe),Os=o(Hs),Yt=e(o(Os));a(Yt,()=>v),s(Os),t(4),s(Hs),s(Pe);var Le=e(Pe,2),Es=o(Le),Bs=o(Es),Qt=e(o(Bs));a(Qt,()=>v),s(Bs),t(4),s(Es),s(Le);var Me=e(Le,2),Ws=o(Me),Ks=o(Ws),Zt=e(o(Ks));a(Zt,()=>v),s(Ks),t(4),s(Ws),s(Me);var Ae=e(Me,2),Ys=o(Ae),Qs=o(Ys),ea=e(o(Qs));a(ea,()=>v),s(Qs),t(4),s(Ys),s(Ae);var Ne=e(Ae,2),Zs=o(Ne),eo=o(Zs),sa=e(o(eo));a(sa,()=>v),s(eo),s(Zs),s(Ne);var Ue=e(Ne,2),so=o(Ue),oo=o(so),oa=e(o(oo));a(oa,()=>v),s(oo),s(so),s(Ue);var Fe=e(Ue,2),to=o(Fe),ao=o(to),ta=e(o(ao));a(ta,()=>v),s(ao),s(to),s(Fe);var Je=e(Fe,2),co=o(Je),ro=o(co),aa=e(o(ro));a(aa,()=>v),s(ro),s(co),s(Je);var Re=e(Je,2),lo=o(Re),io=o(lo),ca=e(o(io));a(ca,()=>v),s(io),s(lo),s(Re);var Ie=e(Re,2),no=o(Ie),po=o(no),da=e(o(po));a(da,()=>v),s(po),s(no),s(Ie);var De=e(Ie,2),_o=o(De),uo=o(_o),ra=e(o(uo));a(ra,()=>v),s(uo),s(_o),s(De);var vo=e(De,2),mo=o(vo),ho=o(mo),la=e(o(ho));a(la,()=>v),s(ho),s(mo),s(vo),s(f);var Ge=e(f,6),ia=e(o(Ge));_(ia,{name:"layout"}),t(),s(Ge);var Ve=e(Ge,2),Xe=o(Ve),fo=o(Xe),go=o(fo),na=e(o(go));a(na,()=>v),s(go),s(fo),s(Xe);var qe=e(Xe,2),bo=o(qe),yo=o(bo),pa=e(o(yo));a(pa,()=>v),s(yo),s(bo),s(qe);var He=e(qe,2),xo=o(He),Oe=o(xo),_a=e(o(Oe));a(_a,()=>xe),s(Oe);var wo=e(Oe,2),ua=e(o(wo));a(ua,()=>xe),s(wo),s(xo),s(He);var So=e(He,2),$o=o(So),Ee=o($o),va=e(o(Ee));a(va,()=>xe),s(Ee);var ko=e(Ee,2),ma=e(o(ko));a(ma,()=>xe),s(ko),s($o),s(So),s(Ve);var Be=e(Ve,4),Co=e(o(Be));_(Co,{name:"colors"});var zo=e(Co,2);_(zo,{name:"shading"});var ha=e(zo,2);_(ha,{name:"typography",hash:"Text-colors"}),t(),s(Be);var We=e(Be,2),Ke=o(We),To=o(Ke),jo=o(To),Po=e(o(jo));a(Po,()=>re);var fa=e(Po,2);a(fa,()=>_e),s(jo),s(To),s(Ke);var Lo=e(Ke,2),Mo=o(Lo),Ao=o(Mo),No=e(o(Ao));a(No,()=>re);var ga=e(No,2);a(ga,()=>_e),s(Ao),s(Mo),s(Lo),s(We);var Ye=e(We,4),Qe=o(Ye),Uo=o(Qe),Fo=e(o(Uo),4),ba=e(o(Fo));a(ba,()=>ec),s(Fo),s(Uo),s(Qe);var Ze=e(Qe,2),Jo=o(Ze),Ro=e(o(Jo),4),ya=e(o(Ro));a(ya,()=>Ps),s(Ro),s(Jo),s(Ze);var es=e(Ze,2),Io=o(es),Do=o(Io),xa=e(o(Do));a(xa,()=>re),s(Do),s(Io),s(es);var Go=e(es,2),Vo=o(Go),ss=o(Vo),wa=e(o(ss));a(wa,()=>qt),s(ss);var Xo=e(ss,2),Sa=e(o(Xo));a(Sa,()=>qt),s(Xo),s(Vo),s(Go),s(Ye);var os=e(Ye,6),$a=e(o(os));_($a,{name:"typography"}),t(),s(os);var ts=e(os,2),as=o(ts),qo=o(as);js(qo,20,()=>sc,R=>R,(R,ce)=>{var I=uc(),pe=o(I);s(I),we(()=>ve(pe,`.${ce??""}`)),d(R,I)}),s(qo),s(as);var cs=e(as,2),Ho=o(cs),Oo=o(Ho),ka=e(o(Oo));a(ka,()=>oc),s(Oo),s(Ho),s(cs);var ds=e(cs,2),Eo=o(ds),Bo=o(Eo),Ca=e(o(Bo));a(Ca,()=>tc),s(Bo),s(Eo),s(ds);var Wo=e(ds,2),Ko=o(Wo),Yo=o(Ko),za=e(o(Yo));a(za,()=>ac),s(Yo),s(Ko),s(Wo),s(ts);var rs=e(ts,4),Ta=e(o(rs));_(Ta,{name:"borders"}),t(),s(rs);var ls=e(rs,2),is=o(ls),Qo=o(is),Zo=o(Qo),ja=e(o(Zo));a(ja,()=>Ps),s(Zo),s(Qo),s(is);var ns=e(is,2),et=o(ns),st=o(et),ot=e(o(st));a(ot,()=>re);var Pa=e(ot,2);a(Pa,()=>_e),s(st),s(et),s(ns);var ps=e(ns,2),tt=o(ps),at=o(tt),La=e(o(at));a(La,()=>Ht),s(at),s(tt),s(ps);var _s=e(ps,2),ct=o(_s),dt=o(ct),Ma=e(o(dt));a(Ma,()=>ue),s(dt),s(ct),s(_s);var us=e(_s,2),rt=o(us),lt=o(rt),Aa=e(o(lt));a(Aa,()=>ue),s(lt),s(rt),s(us);var vs=e(us,2),it=o(vs),nt=o(it),Na=e(o(nt));a(Na,()=>ue),s(nt),s(it),s(vs);var ms=e(vs,2),pt=o(ms),_t=o(pt),Ua=e(o(_t));a(Ua,()=>ue),s(_t),s(pt),s(ms);var hs=e(ms,2),ut=o(hs),vt=o(ut),Fa=e(o(vt));a(Fa,()=>ue),s(vt),s(ut),s(hs);var fs=e(hs,2),mt=o(fs),ht=o(mt),Ja=e(o(ht));a(Ja,()=>Ht),s(ht),s(mt),s(fs);var gs=e(fs,2),ft=o(gs);js(ft,20,()=>cc,R=>R,(R,ce)=>{var I=vc(),pe=o(I);s(I),we(()=>ve(pe,`.outline_width_${ce??""}`)),d(R,I)}),s(ft),s(gs);var bs=e(gs,2),gt=o(bs),bt=o(gt),Ra=e(o(bt));a(Ra,()=>Ps),s(bt),s(gt),s(bs);var yt=e(bs,2),xt=o(yt),wt=o(xt),St=e(o(wt));a(St,()=>re);var Ia=e(St,2);a(Ia,()=>_e),s(wt),s(xt),s(yt),s(ls);var ys=e(ls,4),Da=e(o(ys));_(Da,{name:"shadows"}),t(),s(ys);var $t=e(ys,2),xs=o($t),kt=o(xs),Ct=o(kt),Ga=e(o(Ct));a(Ga,()=>le),s(Ct),s(kt),s(xs);var ws=e(xs,2),zt=o(ws),Tt=o(zt),Va=e(o(Tt));a(Va,()=>le),s(Tt),s(zt),s(ws);var Ss=e(ws,2),jt=o(Ss),Pt=o(jt),Xa=e(o(Pt));a(Xa,()=>le),s(Pt),s(jt),s(Ss);var $s=e(Ss,2),Lt=o($s),Mt=o(Lt),qa=e(o(Mt));a(qa,()=>le),s(Mt),s(Lt),s($s);var ks=e($s,2),At=o(ks),Nt=o(At),Ha=e(o(Nt));a(Ha,()=>le),s(Nt),s(At),s(ks);var Cs=e(ks,2),Ut=o(Cs),Ft=o(Ut),Oa=e(o(Ft));a(Oa,()=>le),s(Ft),s(Ut),s(Cs);var zs=e(Cs,2),Jt=o(zs);js(Jt,20,()=>dc,R=>R,(R,ce)=>{var I=mc(),pe=o(I);s(I),we(()=>ve(pe,`.shadow_color_${ce??""}`)),d(R,I)}),s(Jt),s(zs);var Ts=e(zs,2),Rt=o(Ts),It=o(Rt),Dt=e(o(It));a(Dt,()=>re);var Ea=e(Dt,2);a(Ea,()=>_e),s(It),s(Rt),s(Ts);var Gt=e(Ts,2),Vt=o(Gt),Xt=o(Vt),Ba=e(o(Xt));a(Ba,()=>rc),s(Xt),s(Vt),s(Gt),s($t),d(g,w)},$$slots:{default:!0}});var T=e(x,2);A(T,{children:(g,L)=>{var w=fc(),S=C(w);N(S,{text:"Composite classes",tag:"h3"});var p=e(S,8);c(p,{lang:"ts",content:`import type {CssClassDefinition} from '@fuzdev/fuz_css/css_class_generation.js';

export const custom_composites: Record<string, CssClassDefinition> = {
	// 1. \`declaration\` only - custom CSS properties
	centered: {
		declaration: \`
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			text-align: center;
		\`,
	},

	// 2. \`composes\` only - compose existing token/composite classes
	centered: {
		composes: ['box', 'text-align:center'],
	},

	// 3. \`composes\` + \`declaration\` - compose then extend
	centered: {
		composes: ['box'],
		declaration: 'text-align: center;',
	},

	// 4. \`ruleset\` - full CSS with multiple selectors (not composable)
	centered: {
		ruleset: \`
			.centered {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				text-align: center;
			}
			/* child selectors, pseudo-classes on children, etc */
			.centered > * + * {
				margin-top: var(--space_md);
			}
		\`,
	},
};`});var n=e(p,4);c(n,{lang:"css",content:`.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}`});var l=e(n,4);c(l,{lang:"css",content:`.centered > * + * {
  margin-top: var(--space_md);
}`});var r=e(l,12),i=e(o(r),14);i.textContent=".clickable:hover { ... }",t(3),s(r);var m=e(r,8);c(m,{content:'<!-- hover:foo resolves foo\'s `composes`, applies :hover -->\n<div class="hover:foo md:dark:foo md:clickable">'});var h=e(m,8);c(h,{lang:"ts",content:`// vite.config.ts
import {custom_composites} from './src/lib/composites.js';

vite_plugin_fuz_css({
	class_definitions: custom_composites,
}),`});var f=e(h,4);c(f,{lang:"ts",content:`// fuz.gen.css.ts
import {custom_composites} from '$lib/composites.js';

export const gen = gen_fuz_css({
	class_definitions: custom_composites,
});`}),t(12),d(g,w)},$$slots:{default:!0}});var U=e(T,2);A(U,{children:(g,L)=>{var w=gc(),S=C(w);N(S,{text:"Literal classes",tag:"h3"});var p=e(S,4);c(p,{content:`<!-- basic syntax: property:value -->
<div class="display:flex justify-content:center">

<!-- multi-value properties use ~ for spaces -->
<div class="margin:1px~3rem">

<!-- numeric values -->
<div class="opacity:50% font-weight:700 z-index:100">

<!-- arbitrary CSS values -->
<div class="width:calc(100%~-~20px)">

<!-- custom properties -->
<div class="--foo-bg:#abc">`}),t(4),d(g,w)},$$slots:{default:!0}}),d(z,u)},$$slots:{default:!0}});var Us=e(Ns,2);A(Us,{children:(z,Y)=>{var u=xc(),k=C(u);N(k,{text:"Modifiers"});var x=e(k,10);c(x,{content:`<!-- stack on mobile, row on medium screens and up -->
<div class="display:flex flex-direction:column md:flex-direction:row">

<!-- hide on mobile -->
<nav class="display:none md:display:flex">

<!-- max-width variant -->
<div class="max-md:display:none">

<!-- arbitrary breakpoints -->
<div class="min-width(800px):color:red max-width(600px):color:blue">`});var T=e(x,6);c(T,{content:`<button class="hover:opacity:80% focus:outline-color:blue">
<input class="disabled:opacity:50% invalid:border-color:red">
<li class="first:font-weight:bold odd:background-color:lightgray">`});var U=e(T,10);c(U,{content:`<div class="shadow_lg dark:shadow_sm">
<div class="color:black light:color:gray">`});var g=e(U,8);c(g,{content:`<span class="before:content:'→' before:margin-right:0.5rem">
<input class="placeholder:opacity:50%">`});var L=e(g,10);c(L,{content:`<div class="motion-reduce:animation:none">
<nav class="print:display:none">`});var w=e(L,4);A(w,{children:(S,p)=>{var n=yc(),l=C(n);N(l,{text:"Combining modifiers",tag:"h3"});var r=e(l,4);c(r,{content:"[media:][ancestor:][...state:][pseudo-element:]class"});var i=e(r,4);c(i,{content:`<!-- media + ancestor + state -->
<div class="md:dark:hover:opacity:83%">

<!-- media + state + pseudo-element -->
<div class="md:hover:before:opacity:100%">

<!-- multiple states must be alphabetical -->
<button class="focus:hover:outline:2px~solid~blue">`});var m=e(i,4);c(m,{lang:"css",content:`@media (width >= 48rem) {
  :root.dark .md\\:dark\\:hover\\:opacity\\:83\\%:hover {
    opacity: 83%;
  }
}`}),d(S,n)},$$slots:{default:!0}}),d(z,u)},$$slots:{default:!0}});var Fs=e(Us,2);A(Fs,{children:(z,Y)=>{var u=wc(),k=C(u);N(k,{text:"Builtin classes"});var x=e(k,2),T=e(o(x));X(T,{module_path:"style.css",children:(Q,W)=>{t();var Z=P("main stylesheet");d(Q,Z)},$$slots:{default:!0}});var U=e(T,2);_(U,{name:"variables",children:(Q,W)=>{t();var Z=P("style variables");d(Q,Z)},$$slots:{default:!0}}),t(),s(x);var g=e(x,6);c(g,{content:`<ul>
	<li>1</li>
	<li>2</li>
</ul>`});var L=e(g,6);c(L,{content:`<ul class="unstyled">
	<li>a</li>
	<li>b</li>
</ul>`});var w=e(L,6);c(w,{lang:"css",content:`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--space_xl4);
}`});var S=e(w,4);c(S,{lang:"css",content:`:where(:is(ul, ol, menu):not(.unstyled)) {
	padding-left: var(--list_padding_left, var(--space_xl4));
}`});var p=e(S,8),n=o(p),l=e(o(n),2);_(l,{name:"buttons"});var r=e(l,2);_(r,{name:"forms"}),s(n);var i=e(n,2),m=e(o(i),2);_(m,{name:"forms"}),s(i);var h=e(i,2),f=e(o(h),2);_(f,{name:"buttons"}),s(h);var b=e(h,2),$=e(o(b),2);_($,{name:"buttons"});var F=e($,2);_(F,{name:"forms"}),s(b);var j=e(b,2),D=e(o(j),2);_(D,{name:"typography"}),s(j);var M=e(j,2),O=e(o(M),2);_(O,{name:"forms"}),s(M);var J=e(M,2),G=e(o(J),2);_(G,{name:"layout"});var E=e(G,2);_(E,{name:"forms"}),s(J);var V=e(J,2),ee=e(o(V),4);_(ee,{name:"buttons"});var q=e(ee,2);_(q,{name:"colors"}),s(V);var B=e(V,2),oe=e(o(B),6);_(oe,{name:"themes"}),s(B),s(p),d(z,u)},$$slots:{default:!0}});var Js=e(Fs,2);A(Js,{children:(z,Y)=>{var u=kc(),k=C(u);N(k,{text:"Framework support"});var x=e(k,2),T=e(o(x));X(T,{module_path:"style.css"});var U=e(T,2);X(U,{module_path:"theme.css"}),t(3),s(x);var g=e(x,4),L=e(o(g));de(L,{name:"GenFuzCssOptions",children:(n,l)=>{t();var r=P("additional_classes");d(n,r)},$$slots:{default:!0}});var w=e(L,2);de(w,{name:"GenFuzCssOptions",children:(n,l)=>{t();var r=P("acorn_plugins");d(n,r)},$$slots:{default:!0}}),t(3),s(g);var S=e(g,4);A(S,{children:(n,l)=>{var r=Sc(),i=C(r);N(i,{text:"Svelte-first",tag:"h3"});var m=e(i,2),h=e(o(m));X(h,{module_path:"css_class_extractor.ts",children:(j,D)=>{t();var M=P("extractor");d(j,M)},$$slots:{default:!0}}),t(3),s(m);var f=e(m,2),b=o(f),$=e(o(b),4);$.textContent="class={[...]}";var F=e($,2);F.textContent="class={{...}}",t(2),s(b),t(8),s(f),d(n,r)},$$slots:{default:!0}});var p=e(S,2);A(p,{children:(n,l)=>{var r=$c(),i=C(r);N(i,{text:"React and JSX",tag:"h3"});var m=e(i,4);c(m,{lang:null,content:"npm i -D acorn-jsx"});var h=e(m,4);c(h,{lang:"ts",content:`// vite.config.ts
import {defineConfig} from 'vite';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
  plugins: [
    vite_plugin_fuz_css({
      acorn_plugins: [jsx()],
    }),
  ],
});`});var f=e(h,4);c(f,{lang:"ts",content:`// fuz.gen.css.ts
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';
import jsx from 'acorn-jsx';

export const gen = gen_fuz_css({
	acorn_plugins: [jsx()],
});`});var b=e(f,4),$=e(o(b),2),F=o($);F.textContent="className={clsx(...)}",t(),s($);var j=e($,2),D=o(j);D.textContent='className={cond ? "a" : "b"}',t(),s(j);var M=e(j,2),O=o(M);O.textContent="classList={{active: cond}}",t(),s(M),t(2),s(b);var J=e(b,2);c(J,{lang:"ts",content:`// variable tracking works in JSX too
const styles = 'box hover:shadow_lg';
const Component = () => <div className={styles} />;`});var G=e(J,2),E=e(o(G));de(E,{name:"GenFuzCssOptions",children:(V,ee)=>{t();var q=P("acorn_plugins");d(V,q)},$$slots:{default:!0}}),t(),s(G),d(n,r)},$$slots:{default:!0}}),d(z,u)},$$slots:{default:!0}});var Rs=e(Js,2);A(Rs,{children:(z,Y)=>{var u=Cc(),k=C(u);N(k,{text:"Custom interpreters"});var x=e(k,2),T=o(x);X(T,{module_path:"css_class_interpreters.ts",children:(S,p)=>{t();var n=P("Interpreters");d(S,n)},$$slots:{default:!0}}),t(9),s(x);var U=e(x,4);c(U,{lang:"ts",content:`import type {CssClassDefinitionInterpreter} from '@fuzdev/fuz_css/css_class_generation.js';

// Example: grid-cols-N classes like "grid-cols-4"
// Unlike composites, interpreters can parameterize values
const grid_cols_interpreter: CssClassDefinitionInterpreter = {
  pattern: /^grid-cols-(\\d+)$/,
  interpret: (matched) => {
    const n = parseInt(matched[1]!, 10);
    if (n < 1 || n > 24) return null;
    return \`.grid-cols-\${n} { grid-template-columns: repeat(\${n}, minmax(0, 1fr)); }\`;
  },
};`});var g=e(U,2),L=e(o(g),5);X(L,{module_path:"css_class_definitions.ts"}),t(),s(g);var w=e(g,4);c(w,{lang:"ts",content:`import {css_class_interpreters} from '@fuzdev/fuz_css/css_class_interpreters.js';

vite_plugin_fuz_css({
  class_interpreters: [grid_cols_interpreter, ...css_class_interpreters],
})`}),t(4),d(z,u)},$$slots:{default:!0}});var Et=e(Rs,2);A(Et,{children:(z,Y)=>{var u=zc(),k=C(u);N(k,{text:"Compared to alternatives"}),t(10),d(z,u)},$$slots:{default:!0}}),t(4),d(fe,ge)},$$slots:{default:!0}}),Ka()}export{Gc as component};
