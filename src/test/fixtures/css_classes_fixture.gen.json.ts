import type {Gen} from '@ryanatkn/gro';

import {token_classes} from '$lib/css_classes.js';

export const gen: Gen = {
	dependencies: 'all',
	generate: () => {
		return JSON.stringify(token_classes);
	},
};
