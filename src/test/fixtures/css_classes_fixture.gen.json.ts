import type {Gen} from '@ryanatkn/gro';

import {css_class_definitions} from '$lib/css_class_definitions.js';

export const gen: Gen = {
	dependencies: 'all',
	generate: () => {
		return JSON.stringify(css_class_definitions);
	},
};
