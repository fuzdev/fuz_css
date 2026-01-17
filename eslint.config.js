import {configs, ts_config} from '@ryanatkn/eslint-config';

ts_config.rules['no-console'] = 1;

// Ignore examples directory - each example has its own tsconfig
export default [{ignores: ['examples/**']}, ...configs];
