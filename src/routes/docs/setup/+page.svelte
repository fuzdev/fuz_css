<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';
	import DeclarationLink from '@fuzdev/fuz_ui/DeclarationLink.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import pkg_json from 'virtual:pkg.json';

	import RootFontSize from '#routes/docs/RootFontSize.svelte';

	const LIBRARY_ITEM_NAME = 'setup';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const cdn_url = `https://cdn.jsdelivr.net/npm/@fuzdev/fuz_css@${pkg_json.version}/dist`;
</script>

<TomeContent {tome}>
	<section>
		<p>
			The <ModuleLink module_path="vite_plugin_fuz_css.ts">Vite plugin</ModuleLink> is the
			recommended setup. It generates one stylesheet holding the theme variables, the base styles
			for the elements you use, and the <TomeLink slug="classes">utility classes</TomeLink> you use,
			and it updates with HMR as you edit. It works with SvelteKit, Svelte, React, Preact, Solid,
			and plain HTML/TS/JS. Without a build step, link the package's two plain stylesheets instead.
		</p>
		<Code lang={null} content="npm i -D @fuzdev/fuz_css" />
		<p>
			Working setups for each framework live in the repo's
			<a href="https://github.com/fuzdev/fuz_css/tree/main/examples">examples</a>.
		</p>
	</section>

	<TomeSection>
		<TomeSectionHeader text="SvelteKit" />
		<Code
			lang="ts"
			content={`// vite.config.ts
import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';

export default defineConfig({
	plugins: [sveltekit(), vite_plugin_fuz_css()],
});`}
		/>
		<p>Import the virtual module once, from the root layout:</p>
		<Code
			lang="ts"
			content={`// src/routes/+layout.svelte
import 'virtual:fuz.css';`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Vite with React, Preact, or Solid" />
		<p>
			JSX needs a parser plugin, which you install yourself:
			<a href="https://github.com/acornjs/acorn-jsx"><code>acorn-jsx</code></a>, passed through the
			<DeclarationLink name="CssExtractionOptions">acorn_plugins</DeclarationLink> option.
		</p>
		<Code lang={null} content="npm i -D @fuzdev/fuz_css acorn-jsx" />
		<Code
			lang="ts"
			content={`// vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';

export default defineConfig({
	plugins: [react(), vite_plugin_fuz_css({acorn_plugins: [jsx()]})],
});`}
		/>
		<p>
			Preact is the same with <code>@preact/preset-vite</code>. For Solid, list the fuz_css plugin
			before <code>solid()</code>, as the Solid example does:
		</p>
		<Code
			lang="ts"
			content={`plugins: [vite_plugin_fuz_css({acorn_plugins: [jsx()]}), solid()],`}
		/>
		<p>Then import the virtual module in your entry file:</p>
		<Code
			lang="ts"
			content={`// src/main.tsx
import 'virtual:fuz.css';`}
		/>
		<p>Supported JSX patterns:</p>
		<ul>
			<li>
				<code>className="..."</code> and <code>class="..."</code> - static strings
			</li>
			<li>
				<code>{'className={clsx(...)}'}</code> - utility function calls
			</li>
			<li>
				<code>{'className={cond ? "a" : "b"}'}</code> - ternary and logical expressions
			</li>
			<li>
				<code>{'classList={{active: cond}}'}</code> - Solid's classList
			</li>
			<li>
				usage tracking: variables in <code>className</code>, <code>class</code>, and
				<code>classList</code> are tracked back to their definitions, within one file
			</li>
		</ul>
		<Code
			lang="ts"
			content={`// variable tracking works in JSX too
const styles = 'box hover:shadow_lg';
const Component = () => <div className={styles} />;`}
		/>
		<p>
			The <code>acorn_plugins</code> option accepts any Acorn-compatible plugin, so other syntax
			extensions can be supported the same way.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Vite with Svelte or plain HTML" />
		<p>
			Svelte and plain HTML/TS/JS need no parser plugin. With the Svelte plugin outside SvelteKit,
			list the fuz_css plugin first, as the Svelte example does:
		</p>
		<Code
			lang="ts"
			content={`// vite.config.ts
import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';

export default defineConfig({
	plugins: [vite_plugin_fuz_css(), svelte()],
});`}
		/>
		<Code
			lang="ts"
			content={`// src/main.ts
import 'virtual:fuz.css';`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Without a build step" />
		<p>
			The package ships two plain stylesheets, the base <ModuleLink module_path="style.css" /> and
			<ModuleLink module_path="theme.css" /> with every variable, which work in any page, and
			<a href="https://www.jsdelivr.com/">jsDelivr</a> serves them from npm:
		</p>
		<Code
			lang="html"
			content={`<link rel="stylesheet" href="${cdn_url}/theme.css" />
<link rel="stylesheet" href="${cdn_url}/style.css" />`}
		/>
		<p>
			That's the full semantic styling and every style variable, including the
			<TomeLink slug="classes" hash="Builtin-classes">builtin classes</TomeLink> like
			<code>selected</code> and <code>palette_a</code>. Utility classes need the plugin, since
			they're generated from your source, and so does baking a
			<TomeLink slug="themes">theme</TomeLink> in; without it, write the variables into your own
			CSS. Pin a version in the URL so a release can't change your page.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="TypeScript" />
		<p>
			Declare the virtual module once, in a dedicated declaration file like
			<code>src/fuz_css.d.ts</code> (not a SvelteKit <code>app.d.ts</code>, which is a module):
		</p>
		<Code
			lang="ts"
			content={`// src/fuz_css.d.ts
declare module 'virtual:fuz.css';`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Utility-only mode" />
		<p>
			The <code>virtual:fuz.css</code> import alone is all most projects need. Projects managing
			their own theme or base styles can turn the generated ones off and import the full
			stylesheets, so neither layer ships twice:
		</p>
		<Code
			lang="ts"
			content={`// vite.config.ts
vite_plugin_fuz_css({
	base_css: null,
	variables: null,
}),

// entry file - full package CSS, only used utilities
import '@fuzdev/fuz_css/style.css'; // all base styles
import '@fuzdev/fuz_css/theme.css'; // all variables
import 'virtual:fuz.css';`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Root font size" />
		<RootFontSize />
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Plugin options" />
		<p>
			The plugin needs Vite 6 or later. It extracts classes from files as Vite processes them,
			including from <code>node_modules</code> dependencies, and in dev it pre-scans your sources
			and the root <code>index.html</code> at startup so the first page load is fully styled. List
			it after any plugin that rewrites CSS in its <code>transform</code> hook.
		</p>
		<ul>
			<li>
				<code>acorn_plugins</code> - required for JSX frameworks, e.g. <code>acorn-jsx</code>
			</li>
			<li>
				<code>additional_classes</code> - classes to always include (for dynamic patterns that can't
				be statically extracted)
			</li>
			<li>
				<code>exclude_classes</code> - classes to exclude from output
			</li>
			<li>
				<code>class_definitions</code> - custom class definitions to merge with defaults; can define
				new classes or override existing ones (see
				<TomeLink slug="classes" hash="Composite-classes">composite classes</TomeLink>). A callback
				receives the defaults and returns the whole set, so <code>() =&gt; my_definitions</code>
				uses only your own
			</li>
			<li>
				<code>class_interpreters</code> -
				<TomeLink slug="classes" hash="Custom-interpreters">custom interpreters</TomeLink> for
				dynamic class generation; an array replaces the default interpreters, and a callback
				receives them and returns the ones to use (most users don't need this)
			</li>
			<li>
				<code>filter_file</code> - custom filter for which files to process. Receives
				<code>(id: string, root: string)</code> and returns <code>boolean</code>, e.g.
				<Code inline lang="ts" content="(id) => !id.includes('/fixtures/')" />
			</li>
			<li>
				<code>on_error</code> - <code>'log'</code> or <code>'throw'</code>; defaults to
				<code>'throw'</code> in CI (<code>CI</code> set to anything but empty, <code>false</code>,
				or <code>0</code>), <code>'log'</code> otherwise
			</li>
			<li>
				<code>on_warning</code> - <code>'log'</code>, <code>'throw'</code>, or
				<code>'ignore'</code>; defaults to <code>'log'</code>
			</li>
			<li>
				<code>cache_dir</code> - cache location; defaults to <code>.fuz/cache/css</code>
			</li>
			<li>
				<code>cache_salt</code> - a string folded into the cache key; change it when only an acorn
				plugin's options change, since the key already covers file content, the plugins, and the
				installed versions of fuz_css and its parsers
			</li>
			<li>
				<code>prescan</code> - dev-only scan of sources at server startup; <code>true</code>
				(default) scans <code>src</code> under the Vite root, <code>false</code> disables, or pass
				an array of directories
			</li>
			<li>
				<code>base_css</code> - customize or disable base styles; set to <code>null</code> for
				utility-only mode, or provide a string to replace the defaults or a callback to modify them
				(see <TomeLink slug="classes" hash="What-gets-included">what gets included</TomeLink>)
			</li>
			<li>
				<code>variables</code> - customize or disable theme variables; set to <code>null</code> for
				utility-only mode, or provide an array to replace the defaults or a callback to modify them
			</li>
			<li>
				<code>theme</code> - a <TomeLink slug="themes" hash="Applying-a-theme">theme</TomeLink> to
				bake into the generated CSS, overlaid onto <code>variables</code> last-wins by name
			</li>
			<li>
				<code>additional_elements</code> - elements to always include styles for (for
				runtime-created elements), or <code>'all'</code> to include all base styles
			</li>
			<li>
				<code>additional_variables</code> - variables to always include in theme output, or
				<code>'all'</code> to include all theme variables
			</li>
		</ul>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Framework support" />
		<p>
			The stylesheets work with any framework and plain HTML. The utility class generator's
			<TomeLink slug="classes" hash="Class-detection">detection</TomeLink> support varies by
			framework:
		</p>
		<table>
			<thead>
				<tr>
					<th>framework</th>
					<th>detection</th>
					<th>notes</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>plain HTML</td>
					<td>full</td>
					<td>static <code>class="..."</code> attributes, script variables</td>
				</tr>
				<tr>
					<td>Svelte</td>
					<td>full</td>
					<td>all patterns including <code>class:</code> directives and array/object syntax</td>
				</tr>
				<tr>
					<td>React / JSX</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>className</code></td>
				</tr>
				<tr>
					<td>Preact</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code></td>
				</tr>
				<tr>
					<td>Solid</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code>, <code>classList</code></td>
				</tr>
				<tr>
					<td>Vue JSX</td>
					<td>full</td>
					<td>with <code>acorn-jsx</code> plugin - <code>class</code></td>
				</tr>
				<tr>
					<td>Vue SFC, Angular, etc.</td>
					<td>none</td>
					<td>
						template syntax not parsed; use <code>clsx</code>/<code>cx</code>/<code>cn</code> in
						JS/TS
					</td>
				</tr>
			</tbody>
		</table>
		<p>
			The <DeclarationLink name="CssOutputOptions">additional_classes</DeclarationLink> option is an
			escape hatch for classes that can't be statically detected. Angular and Vue's single-file
			components aren't supported; we could revisit this if there's demand.
		</p>

		<TomeSection>
			<TomeSectionHeader text="Svelte-first" tag="h3" />
			<p>
				The <ModuleLink module_path="css_class_extractor.ts">extractor</ModuleLink> parses and
				analyzes the AST to understand
				<a href="https://svelte.dev/docs/svelte/class">Svelte's class syntax</a>. Supported
				constructs:
			</p>
			<ul>
				<li>
					<strong>attributes:</strong> <code>class="..."</code>, <code>{'class={[...]}'}</code>,
					<code>{'class={{...}}'}</code> (identifier and string-literal keys),
					<code>class:name</code>
				</li>
				<li>
					<strong>expressions:</strong> logical (<code>&&</code>, <code>||</code>, <code>??</code>),
					ternaries, template literals (complete tokens only -
					<code>`color_a_50 $&#123;base&#125;`</code> extracts <code>color_a_50</code>, but
					<code>`color_$&#123;hue&#125;_50`</code> cannot be extracted; use
					<code>@fuz-classes</code> or <code>additional_classes</code>)
				</li>
				<li>
					<strong>Svelte 5 runes:</strong> <code>$derived()</code> and <code>$derived.by()</code>
					for class variables
				</li>
				<li>
					<strong>utility calls:</strong> <code>clsx()</code>, <code>cn()</code>, <code>cx()</code>,
					<code>classNames()</code> with nested arrays, objects, and utility calls
				</li>
				<li>
					<strong>scripts:</strong> both <code>&lt;script&gt;</code> and
					<code>&lt;script module&gt;</code>, with naming convention and usage tracking
				</li>
			</ul>
		</TomeSection>
	</TomeSection>
</TomeContent>
