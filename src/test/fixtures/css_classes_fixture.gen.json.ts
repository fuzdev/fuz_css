import type {Gen} from '@fuzdev/gro';

import {css_class_definitions} from '$lib/css_class_definitions.ts';

export const gen: Gen = {
	dependencies: 'all',
	generate: () => {
		return JSON.stringify(css_class_definitions);
	},
};
