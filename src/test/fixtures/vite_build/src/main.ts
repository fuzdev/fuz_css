// entry for the build tests: the virtual module first, then a stylesheet
// that has to stay after it in the bundled CSS
import 'virtual:fuz.css';
import './app.css';

export { variant_class } from './variant.ts';
