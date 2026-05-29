import type {Tome} from '@fuzdev/fuz_ui/tome.js';

import introduction from '$routes/docs/introduction/+page.svelte';
import api from '$routes/docs/api/+page.svelte';
import examples from '$routes/docs/examples/+page.svelte';
import semantic from '$routes/docs/semantic/+page.svelte';
import themes from '$routes/docs/themes/+page.svelte';
import colors from '$routes/docs/colors/+page.svelte';
import buttons from '$routes/docs/buttons/+page.svelte';
import chips from '$routes/docs/chips/+page.svelte';
import forms from '$routes/docs/forms/+page.svelte';
import elements from '$routes/docs/elements/+page.svelte';
import classes from '$routes/docs/classes/+page.svelte';
import typography from '$routes/docs/typography/+page.svelte';
import variables from '$routes/docs/variables/+page.svelte';
import layout from '$routes/docs/layout/+page.svelte';
import shading from '$routes/docs/shading/+page.svelte';
import shadows from '$routes/docs/shadows/+page.svelte';
import borders from '$routes/docs/borders/+page.svelte';
// import menuitem from '$routes/docs/menuitem/+page.svelte';

// TODO maybe decouple `related` from `Tome` to get bidirectionality for free

export const tomes: Array<Tome> = [
	{
		slug: 'introduction',
		category: 'guide',
		Component: introduction,
		related_tomes: ['api'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'api',
		category: 'guide',
		Component: api,
		related_tomes: [],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'examples',
		category: 'guide',
		Component: examples,
		related_tomes: ['classes'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'semantic',
		category: 'systems',
		Component: semantic,
		related_tomes: ['buttons', 'elements', 'forms', 'typography'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'themes',
		category: 'systems',
		Component: themes,
		related_tomes: ['variables', 'colors', 'typography'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'variables',
		category: 'systems',
		Component: variables,
		related_tomes: ['themes'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'classes',
		category: 'systems',
		Component: classes,
		related_tomes: ['chips', 'elements'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'colors',
		category: 'styles',
		Component: colors,
		related_tomes: ['themes', 'buttons', 'chips', 'borders', 'shading', 'shadows'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'shading',
		category: 'styles',
		Component: shading,
		related_tomes: ['colors', 'borders', 'shadows', 'typography'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'buttons',
		category: 'styles',
		Component: buttons,
		related_tomes: ['colors', 'chips', 'elements', 'forms', 'borders'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'chips',
		category: 'styles',
		Component: chips,
		related_tomes: ['colors', 'buttons', 'classes'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'elements',
		category: 'styles',
		Component: elements,
		related_tomes: ['buttons', 'forms', 'classes', 'typography', 'borders', 'layout'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'forms',
		category: 'styles',
		Component: forms,
		related_tomes: ['buttons', 'elements', 'borders'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'typography',
		category: 'styles',
		Component: typography,
		related_tomes: ['themes', 'shading', 'elements'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'borders',
		category: 'styles',
		Component: borders,
		related_tomes: ['colors', 'shading', 'buttons', 'elements', 'forms', 'shadows'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'shadows',
		category: 'styles',
		Component: shadows,
		related_tomes: ['colors', 'shading', 'borders'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'layout',
		category: 'styles',
		Component: layout,
		related_tomes: ['elements'],
		related_modules: [],
		related_declarations: [],
	},
	// TODO maybe? or do styles like this belong elsewhere? classes? problem is we'll have a classes page for the variables
	// {
	// 	slug: 'menuitem',
	// 	category: 'styles',
	// Component: menuitem,
	// 	related_tomes: [],
	// related_modules: [],
	// related_declarations: [],
	// },
];
