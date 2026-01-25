import type {StyleVariable} from './variable.js';
import {icon_sizes, color_variants, intensity_variants} from './variable_data.js';

/*

TODO lots of things here to address:

- either change colors with alpha transparency to opaque color values,
	or make sure there are opaque variants available for everything
	- by default we should avoid alpha to reduce base-case performance costs
	- maybe move all shadows out of the base theme?
- lots of inconsistencies, like the relationship between base and modified values
	- in some cases the base value is just a value, in other cases it's the "current" value


*/

/*

colors

*/
// TODO these were eyeballed and intepolated with a spreadsheet, a professional designer will have opinions
export const hue_a: StyleVariable = {name: 'hue_a', light: '210', summary: 'blue'};
export const hue_b: StyleVariable = {name: 'hue_b', light: '120', summary: 'green'};
export const hue_c: StyleVariable = {name: 'hue_c', light: '0', summary: 'red'};
export const hue_d: StyleVariable = {name: 'hue_d', light: '260', summary: 'purple'};
export const hue_e: StyleVariable = {name: 'hue_e', light: '50', summary: 'yellow'};
export const hue_f: StyleVariable = {name: 'hue_f', light: '27', summary: 'brown'};
export const hue_g: StyleVariable = {name: 'hue_g', light: '335', summary: 'pink'};
export const hue_h: StyleVariable = {name: 'hue_h', light: '17', summary: 'orange'};
export const hue_i: StyleVariable = {name: 'hue_i', light: '185', summary: 'cyan'};
export const hue_j: StyleVariable = {name: 'hue_j', light: '155', summary: 'teal'};
export const color_a_00: StyleVariable = {
	name: 'color_a_00',
	light: 'hsl(var(--hue_a) 70% 98%)',
	dark: 'hsl(var(--hue_a) 70% 4%)',
};
export const color_a_05: StyleVariable = {
	name: 'color_a_05',
	light: 'hsl(var(--hue_a) 68% 95%)',
	dark: 'hsl(var(--hue_a) 68% 8%)',
};
export const color_a_10: StyleVariable = {
	name: 'color_a_10',
	light: 'hsl(var(--hue_a) 65% 91%)',
	dark: 'hsl(var(--hue_a) 65% 12%)',
};
export const color_a_20: StyleVariable = {
	name: 'color_a_20',
	light: 'hsl(var(--hue_a) 62% 84%)',
	dark: 'hsl(var(--hue_a) 62% 18%)',
};
export const color_a_30: StyleVariable = {
	name: 'color_a_30',
	light: 'hsl(var(--hue_a) 60% 73%)',
	dark: 'hsl(var(--hue_a) 60% 28%)',
};
export const color_a_40: StyleVariable = {
	name: 'color_a_40',
	light: 'hsl(var(--hue_a) 60% 62%)',
	dark: 'hsl(var(--hue_a) 60% 40%)',
};
export const color_a_50: StyleVariable = {
	name: 'color_a_50',
	light: 'hsl(var(--hue_a) 55% 50%)',
	dark: 'hsl(var(--hue_a) 55% 52%)',
};
export const color_a_60: StyleVariable = {
	name: 'color_a_60',
	light: 'hsl(var(--hue_a) 55% 40%)',
	dark: 'hsl(var(--hue_a) 55% 62%)',
};
export const color_a_70: StyleVariable = {
	name: 'color_a_70',
	light: 'hsl(var(--hue_a) 55% 30%)',
	dark: 'hsl(var(--hue_a) 55% 72%)',
};
export const color_a_80: StyleVariable = {
	name: 'color_a_80',
	light: 'hsl(var(--hue_a) 55% 20%)',
	dark: 'hsl(var(--hue_a) 55% 82%)',
};
export const color_a_90: StyleVariable = {
	name: 'color_a_90',
	light: 'hsl(var(--hue_a) 55% 10%)',
	dark: 'hsl(var(--hue_a) 55% 88%)',
};
export const color_a_95: StyleVariable = {
	name: 'color_a_95',
	light: 'hsl(var(--hue_a) 55% 5%)',
	dark: 'hsl(var(--hue_a) 55% 92%)',
};
export const color_a_100: StyleVariable = {
	name: 'color_a_100',
	light: 'hsl(var(--hue_a) 55% 2%)',
	dark: 'hsl(var(--hue_a) 55% 96%)',
};
export const color_b_00: StyleVariable = {
	name: 'color_b_00',
	light: 'hsl(var(--hue_b) 55% 98%)',
	dark: 'hsl(var(--hue_b) 55% 4%)',
};
export const color_b_05: StyleVariable = {
	name: 'color_b_05',
	light: 'hsl(var(--hue_b) 52% 94%)',
	dark: 'hsl(var(--hue_b) 52% 8%)',
};
export const color_b_10: StyleVariable = {
	name: 'color_b_10',
	light: 'hsl(var(--hue_b) 55% 90%)',
	dark: 'hsl(var(--hue_b) 55% 12%)',
};
export const color_b_20: StyleVariable = {
	name: 'color_b_20',
	light: 'hsl(var(--hue_b) 50% 77%)',
	dark: 'hsl(var(--hue_b) 50% 20%)',
};
export const color_b_30: StyleVariable = {
	name: 'color_b_30',
	light: 'hsl(var(--hue_b) 50% 63%)',
	dark: 'hsl(var(--hue_b) 50% 32%)',
};
export const color_b_40: StyleVariable = {
	name: 'color_b_40',
	light: 'hsl(var(--hue_b) 50% 49%)',
	dark: 'hsl(var(--hue_b) 50% 44%)',
};
export const color_b_50: StyleVariable = {
	name: 'color_b_50',
	light: 'hsl(var(--hue_b) 55% 36%)',
	dark: 'hsl(var(--hue_b) 50% 54%)',
};
export const color_b_60: StyleVariable = {
	name: 'color_b_60',
	light: 'hsl(var(--hue_b) 60% 25%)',
	dark: 'hsl(var(--hue_b) 55% 66%)',
};
export const color_b_70: StyleVariable = {
	name: 'color_b_70',
	light: 'hsl(var(--hue_b) 65% 18%)',
	dark: 'hsl(var(--hue_b) 60% 76%)',
};
export const color_b_80: StyleVariable = {
	name: 'color_b_80',
	light: 'hsl(var(--hue_b) 70% 12%)',
	dark: 'hsl(var(--hue_b) 65% 84%)',
};
export const color_b_90: StyleVariable = {
	name: 'color_b_90',
	light: 'hsl(var(--hue_b) 75% 7%)',
	dark: 'hsl(var(--hue_b) 75% 88%)',
};
export const color_b_95: StyleVariable = {
	name: 'color_b_95',
	light: 'hsl(var(--hue_b) 78% 4%)',
	dark: 'hsl(var(--hue_b) 78% 92%)',
};
export const color_b_100: StyleVariable = {
	name: 'color_b_100',
	light: 'hsl(var(--hue_b) 80% 2%)',
	dark: 'hsl(var(--hue_b) 80% 96%)',
};
export const color_c_00: StyleVariable = {
	name: 'color_c_00',
	light: 'hsl(var(--hue_c) 90% 98%)',
	dark: 'hsl(var(--hue_c) 90% 4%)',
};
export const color_c_05: StyleVariable = {
	name: 'color_c_05',
	light: 'hsl(var(--hue_c) 88% 96%)',
	dark: 'hsl(var(--hue_c) 88% 8%)',
};
export const color_c_10: StyleVariable = {
	name: 'color_c_10',
	light: 'hsl(var(--hue_c) 85% 92%)',
	dark: 'hsl(var(--hue_c) 85% 12%)',
};
export const color_c_20: StyleVariable = {
	name: 'color_c_20',
	light: 'hsl(var(--hue_c) 80% 84%)',
	dark: 'hsl(var(--hue_c) 80% 18%)',
};
export const color_c_30: StyleVariable = {
	name: 'color_c_30',
	light: 'hsl(var(--hue_c) 75% 73%)',
	dark: 'hsl(var(--hue_c) 75% 28%)',
};
export const color_c_40: StyleVariable = {
	name: 'color_c_40',
	light: 'hsl(var(--hue_c) 70% 63%)',
	dark: 'hsl(var(--hue_c) 70% 40%)',
};
export const color_c_50: StyleVariable = {
	name: 'color_c_50',
	light: 'hsl(var(--hue_c) 65% 50%)',
	dark: 'hsl(var(--hue_c) 65% 52%)',
};
export const color_c_60: StyleVariable = {
	name: 'color_c_60',
	light: 'hsl(var(--hue_c) 65% 40%)',
	dark: 'hsl(var(--hue_c) 65% 62%)',
};
export const color_c_70: StyleVariable = {
	name: 'color_c_70',
	light: 'hsl(var(--hue_c) 65% 30%)',
	dark: 'hsl(var(--hue_c) 65% 72%)',
};
export const color_c_80: StyleVariable = {
	name: 'color_c_80',
	light: 'hsl(var(--hue_c) 65% 20%)',
	dark: 'hsl(var(--hue_c) 65% 82%)',
};
export const color_c_90: StyleVariable = {
	name: 'color_c_90',
	light: 'hsl(var(--hue_c) 65% 10%)',
	dark: 'hsl(var(--hue_c) 65% 88%)',
};
export const color_c_95: StyleVariable = {
	name: 'color_c_95',
	light: 'hsl(var(--hue_c) 65% 5%)',
	dark: 'hsl(var(--hue_c) 65% 92%)',
};
export const color_c_100: StyleVariable = {
	name: 'color_c_100',
	light: 'hsl(var(--hue_c) 65% 2%)',
	dark: 'hsl(var(--hue_c) 65% 96%)',
};
export const color_d_00: StyleVariable = {
	name: 'color_d_00',
	light: 'hsl(var(--hue_d) 55% 98%)',
	dark: 'hsl(var(--hue_d) 55% 4%)',
};
export const color_d_05: StyleVariable = {
	name: 'color_d_05',
	light: 'hsl(var(--hue_d) 52% 95%)',
	dark: 'hsl(var(--hue_d) 52% 8%)',
};
export const color_d_10: StyleVariable = {
	name: 'color_d_10',
	light: 'hsl(var(--hue_d) 50% 91%)',
	dark: 'hsl(var(--hue_d) 50% 12%)',
};
export const color_d_20: StyleVariable = {
	name: 'color_d_20',
	light: 'hsl(var(--hue_d) 50% 82%)',
	dark: 'hsl(var(--hue_d) 50% 20%)',
};
export const color_d_30: StyleVariable = {
	name: 'color_d_30',
	light: 'hsl(var(--hue_d) 50% 72%)',
	dark: 'hsl(var(--hue_d) 50% 30%)',
};
export const color_d_40: StyleVariable = {
	name: 'color_d_40',
	light: 'hsl(var(--hue_d) 50% 62%)',
	dark: 'hsl(var(--hue_d) 50% 40%)',
};
export const color_d_50: StyleVariable = {
	name: 'color_d_50',
	light: 'hsl(var(--hue_d) 50% 50%)',
	dark: 'hsl(var(--hue_d) 50% 52%)',
};
export const color_d_60: StyleVariable = {
	name: 'color_d_60',
	light: 'hsl(var(--hue_d) 50% 40%)',
	dark: 'hsl(var(--hue_d) 50% 62%)',
};
export const color_d_70: StyleVariable = {
	name: 'color_d_70',
	light: 'hsl(var(--hue_d) 50% 30%)',
	dark: 'hsl(var(--hue_d) 50% 72%)',
};
export const color_d_80: StyleVariable = {
	name: 'color_d_80',
	light: 'hsl(var(--hue_d) 50% 20%)',
	dark: 'hsl(var(--hue_d) 50% 82%)',
};
export const color_d_90: StyleVariable = {
	name: 'color_d_90',
	light: 'hsl(var(--hue_d) 50% 10%)',
	dark: 'hsl(var(--hue_d) 50% 88%)',
};
export const color_d_95: StyleVariable = {
	name: 'color_d_95',
	light: 'hsl(var(--hue_d) 50% 5%)',
	dark: 'hsl(var(--hue_d) 50% 92%)',
};
export const color_d_100: StyleVariable = {
	name: 'color_d_100',
	light: 'hsl(var(--hue_d) 50% 2%)',
	dark: 'hsl(var(--hue_d) 50% 96%)',
};
export const color_e_00: StyleVariable = {
	name: 'color_e_00',
	light: 'hsl(var(--hue_e) 90% 98%)',
	dark: 'hsl(var(--hue_e) 90% 4%)',
};
export const color_e_05: StyleVariable = {
	name: 'color_e_05',
	light: 'hsl(var(--hue_e) 88% 95%)',
	dark: 'hsl(var(--hue_e) 88% 8%)',
};
export const color_e_10: StyleVariable = {
	name: 'color_e_10',
	light: 'hsl(var(--hue_e) 85% 91%)',
	dark: 'hsl(var(--hue_e) 85% 12%)',
};
export const color_e_20: StyleVariable = {
	name: 'color_e_20',
	light: 'hsl(var(--hue_e) 80% 79%)',
	dark: 'hsl(var(--hue_e) 80% 20%)',
};
export const color_e_30: StyleVariable = {
	name: 'color_e_30',
	light: 'hsl(var(--hue_e) 75% 65%)',
	dark: 'hsl(var(--hue_e) 75% 32%)',
};
export const color_e_40: StyleVariable = {
	name: 'color_e_40',
	light: 'hsl(var(--hue_e) 70% 50%)',
	dark: 'hsl(var(--hue_e) 70% 44%)',
};
export const color_e_50: StyleVariable = {
	name: 'color_e_50',
	light: 'hsl(var(--hue_e) 65% 41%)',
	dark: 'hsl(var(--hue_e) 70% 54%)',
};
export const color_e_60: StyleVariable = {
	name: 'color_e_60',
	light: 'hsl(var(--hue_e) 70% 34%)',
	dark: 'hsl(var(--hue_e) 70% 66%)',
};
export const color_e_70: StyleVariable = {
	name: 'color_e_70',
	light: 'hsl(var(--hue_e) 75% 26%)',
	dark: 'hsl(var(--hue_e) 75% 76%)',
};
export const color_e_80: StyleVariable = {
	name: 'color_e_80',
	light: 'hsl(var(--hue_e) 80% 18%)',
	dark: 'hsl(var(--hue_e) 80% 84%)',
};
export const color_e_90: StyleVariable = {
	name: 'color_e_90',
	light: 'hsl(var(--hue_e) 85% 10%)',
	dark: 'hsl(var(--hue_e) 85% 88%)',
};
export const color_e_95: StyleVariable = {
	name: 'color_e_95',
	light: 'hsl(var(--hue_e) 88% 5%)',
	dark: 'hsl(var(--hue_e) 88% 92%)',
};
export const color_e_100: StyleVariable = {
	name: 'color_e_100',
	light: 'hsl(var(--hue_e) 90% 2%)',
	dark: 'hsl(var(--hue_e) 90% 96%)',
};
export const color_f_00: StyleVariable = {
	name: 'color_f_00',
	light: 'hsl(var(--hue_f) 30% 98%)',
	dark: 'hsl(var(--hue_f) 30% 4%)',
};
export const color_f_05: StyleVariable = {
	name: 'color_f_05',
	light: 'hsl(var(--hue_f) 30% 92%)',
	dark: 'hsl(var(--hue_f) 30% 8%)',
};
export const color_f_10: StyleVariable = {
	name: 'color_f_10',
	light: 'hsl(var(--hue_f) 32% 87%)',
	dark: 'hsl(var(--hue_f) 32% 12%)',
};
export const color_f_20: StyleVariable = {
	name: 'color_f_20',
	light: 'hsl(var(--hue_f) 32% 72%)',
	dark: 'hsl(var(--hue_f) 32% 22%)',
};
export const color_f_30: StyleVariable = {
	name: 'color_f_30',
	light: 'hsl(var(--hue_f) 32% 57%)',
	dark: 'hsl(var(--hue_f) 32% 34%)',
};
export const color_f_40: StyleVariable = {
	name: 'color_f_40',
	light: 'hsl(var(--hue_f) 42% 41%)',
	dark: 'hsl(var(--hue_f) 40% 46%)',
};
export const color_f_50: StyleVariable = {
	name: 'color_f_50',
	light: 'hsl(var(--hue_f) 60% 26%)',
	dark: 'hsl(var(--hue_f) 50% 56%)',
};
export const color_f_60: StyleVariable = {
	name: 'color_f_60',
	light: 'hsl(var(--hue_f) 65% 18%)',
	dark: 'hsl(var(--hue_f) 55% 68%)',
};
export const color_f_70: StyleVariable = {
	name: 'color_f_70',
	light: 'hsl(var(--hue_f) 70% 14%)',
	dark: 'hsl(var(--hue_f) 50% 78%)',
};
export const color_f_80: StyleVariable = {
	name: 'color_f_80',
	light: 'hsl(var(--hue_f) 75% 10%)',
	dark: 'hsl(var(--hue_f) 45% 86%)',
};
export const color_f_90: StyleVariable = {
	name: 'color_f_90',
	light: 'hsl(var(--hue_f) 80% 6%)',
	dark: 'hsl(var(--hue_f) 80% 88%)',
};
export const color_f_95: StyleVariable = {
	name: 'color_f_95',
	light: 'hsl(var(--hue_f) 82% 3%)',
	dark: 'hsl(var(--hue_f) 82% 92%)',
};
export const color_f_100: StyleVariable = {
	name: 'color_f_100',
	light: 'hsl(var(--hue_f) 85% 2%)',
	dark: 'hsl(var(--hue_f) 85% 96%)',
};
export const color_g_00: StyleVariable = {
	name: 'color_g_00',
	light: 'hsl(var(--hue_g) 75% 98%)',
	dark: 'hsl(var(--hue_g) 75% 4%)',
};
export const color_g_05: StyleVariable = {
	name: 'color_g_05',
	light: 'hsl(var(--hue_g) 74% 95%)',
	dark: 'hsl(var(--hue_g) 74% 8%)',
};
export const color_g_10: StyleVariable = {
	name: 'color_g_10',
	light: 'hsl(var(--hue_g) 72% 91%)',
	dark: 'hsl(var(--hue_g) 72% 12%)',
};
export const color_g_20: StyleVariable = {
	name: 'color_g_20',
	light: 'hsl(var(--hue_g) 72% 83%)',
	dark: 'hsl(var(--hue_g) 72% 18%)',
};
export const color_g_30: StyleVariable = {
	name: 'color_g_30',
	light: 'hsl(var(--hue_g) 72% 74%)',
	dark: 'hsl(var(--hue_g) 72% 28%)',
};
export const color_g_40: StyleVariable = {
	name: 'color_g_40',
	light: 'hsl(var(--hue_g) 72% 65%)',
	dark: 'hsl(var(--hue_g) 72% 38%)',
};
export const color_g_50: StyleVariable = {
	name: 'color_g_50',
	light: 'hsl(var(--hue_g) 72% 56%)',
	dark: 'hsl(var(--hue_g) 72% 50%)',
};
export const color_g_60: StyleVariable = {
	name: 'color_g_60',
	light: 'hsl(var(--hue_g) 72% 44%)',
	dark: 'hsl(var(--hue_g) 72% 60%)',
};
export const color_g_70: StyleVariable = {
	name: 'color_g_70',
	light: 'hsl(var(--hue_g) 72% 32%)',
	dark: 'hsl(var(--hue_g) 72% 70%)',
};
export const color_g_80: StyleVariable = {
	name: 'color_g_80',
	light: 'hsl(var(--hue_g) 72% 20%)',
	dark: 'hsl(var(--hue_g) 72% 82%)',
};
export const color_g_90: StyleVariable = {
	name: 'color_g_90',
	light: 'hsl(var(--hue_g) 72% 10%)',
	dark: 'hsl(var(--hue_g) 72% 88%)',
};
export const color_g_95: StyleVariable = {
	name: 'color_g_95',
	light: 'hsl(var(--hue_g) 72% 5%)',
	dark: 'hsl(var(--hue_g) 72% 92%)',
};
export const color_g_100: StyleVariable = {
	name: 'color_g_100',
	light: 'hsl(var(--hue_g) 72% 2%)',
	dark: 'hsl(var(--hue_g) 72% 96%)',
};
export const color_h_00: StyleVariable = {
	name: 'color_h_00',
	light: 'hsl(var(--hue_h) 95% 98%)',
	dark: 'hsl(var(--hue_h) 95% 4%)',
};
export const color_h_05: StyleVariable = {
	name: 'color_h_05',
	light: 'hsl(var(--hue_h) 92% 95%)',
	dark: 'hsl(var(--hue_h) 92% 8%)',
};
export const color_h_10: StyleVariable = {
	name: 'color_h_10',
	light: 'hsl(var(--hue_h) 90% 91%)',
	dark: 'hsl(var(--hue_h) 90% 12%)',
};
export const color_h_20: StyleVariable = {
	name: 'color_h_20',
	light: 'hsl(var(--hue_h) 90% 82%)',
	dark: 'hsl(var(--hue_h) 90% 18%)',
};
export const color_h_30: StyleVariable = {
	name: 'color_h_30',
	light: 'hsl(var(--hue_h) 90% 72%)',
	dark: 'hsl(var(--hue_h) 90% 28%)',
};
export const color_h_40: StyleVariable = {
	name: 'color_h_40',
	light: 'hsl(var(--hue_h) 90% 62%)',
	dark: 'hsl(var(--hue_h) 90% 40%)',
};
export const color_h_50: StyleVariable = {
	name: 'color_h_50',
	light: 'hsl(var(--hue_h) 90% 50%)',
	dark: 'hsl(var(--hue_h) 90% 52%)',
};
export const color_h_60: StyleVariable = {
	name: 'color_h_60',
	light: 'hsl(var(--hue_h) 90% 40%)',
	dark: 'hsl(var(--hue_h) 90% 62%)',
};
export const color_h_70: StyleVariable = {
	name: 'color_h_70',
	light: 'hsl(var(--hue_h) 90% 30%)',
	dark: 'hsl(var(--hue_h) 90% 72%)',
};
export const color_h_80: StyleVariable = {
	name: 'color_h_80',
	light: 'hsl(var(--hue_h) 90% 20%)',
	dark: 'hsl(var(--hue_h) 90% 82%)',
};
export const color_h_90: StyleVariable = {
	name: 'color_h_90',
	light: 'hsl(var(--hue_h) 90% 10%)',
	dark: 'hsl(var(--hue_h) 90% 88%)',
};
export const color_h_95: StyleVariable = {
	name: 'color_h_95',
	light: 'hsl(var(--hue_h) 90% 5%)',
	dark: 'hsl(var(--hue_h) 90% 92%)',
};
export const color_h_100: StyleVariable = {
	name: 'color_h_100',
	light: 'hsl(var(--hue_h) 90% 2%)',
	dark: 'hsl(var(--hue_h) 90% 96%)',
};
export const color_i_00: StyleVariable = {
	name: 'color_i_00',
	light: 'hsl(var(--hue_i) 80% 98%)',
	dark: 'hsl(var(--hue_i) 80% 4%)',
};
export const color_i_05: StyleVariable = {
	name: 'color_i_05',
	light: 'hsl(var(--hue_i) 77% 94%)',
	dark: 'hsl(var(--hue_i) 77% 8%)',
};
export const color_i_10: StyleVariable = {
	name: 'color_i_10',
	light: 'hsl(var(--hue_i) 75% 89%)',
	dark: 'hsl(var(--hue_i) 75% 12%)',
};
export const color_i_20: StyleVariable = {
	name: 'color_i_20',
	light: 'hsl(var(--hue_i) 75% 77%)',
	dark: 'hsl(var(--hue_i) 75% 20%)',
};
export const color_i_30: StyleVariable = {
	name: 'color_i_30',
	light: 'hsl(var(--hue_i) 75% 60%)',
	dark: 'hsl(var(--hue_i) 75% 34%)',
};
export const color_i_40: StyleVariable = {
	name: 'color_i_40',
	light: 'hsl(var(--hue_i) 75% 47%)',
	dark: 'hsl(var(--hue_i) 75% 46%)',
};
export const color_i_50: StyleVariable = {
	name: 'color_i_50',
	light: 'hsl(var(--hue_i) 75% 40%)',
	dark: 'hsl(var(--hue_i) 75% 54%)',
};
export const color_i_60: StyleVariable = {
	name: 'color_i_60',
	light: 'hsl(var(--hue_i) 75% 33%)',
	dark: 'hsl(var(--hue_i) 75% 66%)',
};
export const color_i_70: StyleVariable = {
	name: 'color_i_70',
	light: 'hsl(var(--hue_i) 75% 25%)',
	dark: 'hsl(var(--hue_i) 75% 76%)',
};
export const color_i_80: StyleVariable = {
	name: 'color_i_80',
	light: 'hsl(var(--hue_i) 75% 18%)',
	dark: 'hsl(var(--hue_i) 75% 84%)',
};
export const color_i_90: StyleVariable = {
	name: 'color_i_90',
	light: 'hsl(var(--hue_i) 75% 10%)',
	dark: 'hsl(var(--hue_i) 75% 88%)',
};
export const color_i_95: StyleVariable = {
	name: 'color_i_95',
	light: 'hsl(var(--hue_i) 75% 5%)',
	dark: 'hsl(var(--hue_i) 75% 92%)',
};
export const color_i_100: StyleVariable = {
	name: 'color_i_100',
	light: 'hsl(var(--hue_i) 75% 2%)',
	dark: 'hsl(var(--hue_i) 75% 96%)',
};
export const color_j_00: StyleVariable = {
	name: 'color_j_00',
	light: 'hsl(var(--hue_j) 65% 98%)',
	dark: 'hsl(var(--hue_j) 65% 4%)',
};
export const color_j_05: StyleVariable = {
	name: 'color_j_05',
	light: 'hsl(var(--hue_j) 62% 94%)',
	dark: 'hsl(var(--hue_j) 62% 8%)',
};
export const color_j_10: StyleVariable = {
	name: 'color_j_10',
	light: 'hsl(var(--hue_j) 60% 89%)',
	dark: 'hsl(var(--hue_j) 60% 12%)',
};
export const color_j_20: StyleVariable = {
	name: 'color_j_20',
	light: 'hsl(var(--hue_j) 58% 77%)',
	dark: 'hsl(var(--hue_j) 58% 20%)',
};
export const color_j_30: StyleVariable = {
	name: 'color_j_30',
	light: 'hsl(var(--hue_j) 55% 60%)',
	dark: 'hsl(var(--hue_j) 55% 34%)',
};
export const color_j_40: StyleVariable = {
	name: 'color_j_40',
	light: 'hsl(var(--hue_j) 55% 47%)',
	dark: 'hsl(var(--hue_j) 55% 46%)',
};
export const color_j_50: StyleVariable = {
	name: 'color_j_50',
	light: 'hsl(var(--hue_j) 55% 40%)',
	dark: 'hsl(var(--hue_j) 55% 54%)',
};
export const color_j_60: StyleVariable = {
	name: 'color_j_60',
	light: 'hsl(var(--hue_j) 60% 33%)',
	dark: 'hsl(var(--hue_j) 60% 66%)',
};
export const color_j_70: StyleVariable = {
	name: 'color_j_70',
	light: 'hsl(var(--hue_j) 65% 25%)',
	dark: 'hsl(var(--hue_j) 65% 76%)',
};
export const color_j_80: StyleVariable = {
	name: 'color_j_80',
	light: 'hsl(var(--hue_j) 70% 18%)',
	dark: 'hsl(var(--hue_j) 70% 84%)',
};
export const color_j_90: StyleVariable = {
	name: 'color_j_90',
	light: 'hsl(var(--hue_j) 75% 10%)',
	dark: 'hsl(var(--hue_j) 75% 88%)',
};
export const color_j_95: StyleVariable = {
	name: 'color_j_95',
	light: 'hsl(var(--hue_j) 78% 5%)',
	dark: 'hsl(var(--hue_j) 78% 92%)',
};
export const color_j_100: StyleVariable = {
	name: 'color_j_100',
	light: 'hsl(var(--hue_j) 80% 2%)',
	dark: 'hsl(var(--hue_j) 80% 96%)',
};

/*

tint colors

*/
// TODO change/delete this?
export const tint_hue: StyleVariable = {name: 'tint_hue', light: 'var(--hue_f)'};
export const tint_saturation: StyleVariable = {name: 'tint_saturation', light: '11%'};

/*

shade scale - the primary system for backgrounds and surfaces

These lightness values are derived from the old alpha-based darken/lighten system to preserve
the proven perceptual curve. The old system used alpha overlays (6%, 12%, 21%, 32%, 45%, 65%,
80%, 89%, 96%) which produced non-linear effective lightness when composited on the 96%/6%
background. These values are the computed effective lightness from that system.

Note: This creates an asymmetric scale (light and dark values don't mirror) because alpha
blending produces different results depending on the base color. This asymmetry matched the
old visual feel and was not problematic in practice.

TODO: Revisit this curve when migrating to OKLCH. OKLCH provides perceptually uniform lightness,
so we may want to switch to a symmetric or mathematically derived scale at that point.

*/
// Untinted adaptive extremes
export const shade_min: StyleVariable = {
	name: 'shade_min',
	light: '#fff',
	dark: '#000',
};
export const shade_max: StyleVariable = {
	name: 'shade_max',
	light: '#000',
	dark: '#fff',
};
// Tinted shade scale (00-100)
// Values derived from old alpha system: shade_N0 ≈ effective lightness of fg_N on 96%/6% background
export const shade_00: StyleVariable = {
	name: 'shade_00',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const shade_05: StyleVariable = {
	name: 'shade_05',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 93%)', // interpolated
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 9%)', // interpolated
};
export const shade_10: StyleVariable = {
	name: 'shade_10',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)', // from fg_1: 96% * (1 - 0.06)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 12%)', // from fg_1: 6% + 94% * 0.06
};
export const shade_20: StyleVariable = {
	name: 'shade_20',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 84%)', // from fg_2: 96% * (1 - 0.12)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 17%)', // from fg_2: 6% + 94% * 0.12
};
export const shade_30: StyleVariable = {
	name: 'shade_30',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 76%)', // from fg_3: 96% * (1 - 0.21)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 26%)', // from fg_3: 6% + 94% * 0.21
};
export const shade_40: StyleVariable = {
	name: 'shade_40',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 65%)', // from fg_4: 96% * (1 - 0.32)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 36%)', // from fg_4: 6% + 94% * 0.32
};
export const shade_50: StyleVariable = {
	name: 'shade_50',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 53%)', // from fg_5: 96% * (1 - 0.45)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 48%)', // from fg_5: 6% + 94% * 0.45
};
export const shade_60: StyleVariable = {
	name: 'shade_60',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 34%)', // from fg_6: 96% * (1 - 0.65)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 67%)', // from fg_6: 6% + 94% * 0.65
};
export const shade_70: StyleVariable = {
	name: 'shade_70',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 19%)', // from fg_7: 96% * (1 - 0.80)
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 81%)', // from fg_7: 6% + 94% * 0.80
};
export const shade_80: StyleVariable = {
	name: 'shade_80',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 13%)', // spread out for better visual distinction
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 87%)',
};
export const shade_90: StyleVariable = {
	name: 'shade_90',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 10%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const shade_95: StyleVariable = {
	name: 'shade_95',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 92%)',
};
export const shade_100: StyleVariable = {
	name: 'shade_100',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};

/*

Non-adaptive shade variants - fixed lightness regardless of color scheme

shade_XX_light: uses the light-mode lightness value in both schemes
shade_XX_dark: uses the dark-mode lightness value in both schemes

Use when you need consistent appearance regardless of color scheme,
such as demo backgrounds or UI elements that shouldn't adapt.

*/
export const shade_00_light: StyleVariable = {
	name: 'shade_00_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};
export const shade_00_dark: StyleVariable = {
	name: 'shade_00_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const shade_05_light: StyleVariable = {
	name: 'shade_05_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 93%)',
};
export const shade_05_dark: StyleVariable = {
	name: 'shade_05_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 9%)',
};
export const shade_10_light: StyleVariable = {
	name: 'shade_10_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const shade_10_dark: StyleVariable = {
	name: 'shade_10_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 12%)',
};
export const shade_20_light: StyleVariable = {
	name: 'shade_20_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 84%)',
};
export const shade_20_dark: StyleVariable = {
	name: 'shade_20_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 17%)',
};
export const shade_30_light: StyleVariable = {
	name: 'shade_30_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 76%)',
};
export const shade_30_dark: StyleVariable = {
	name: 'shade_30_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 26%)',
};
export const shade_40_light: StyleVariable = {
	name: 'shade_40_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 65%)',
};
export const shade_40_dark: StyleVariable = {
	name: 'shade_40_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 36%)',
};
export const shade_50_light: StyleVariable = {
	name: 'shade_50_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 53%)',
};
export const shade_50_dark: StyleVariable = {
	name: 'shade_50_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 48%)',
};
export const shade_60_light: StyleVariable = {
	name: 'shade_60_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 34%)',
};
export const shade_60_dark: StyleVariable = {
	name: 'shade_60_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 67%)',
};
export const shade_70_light: StyleVariable = {
	name: 'shade_70_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 19%)',
};
export const shade_70_dark: StyleVariable = {
	name: 'shade_70_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 81%)',
};
export const shade_80_light: StyleVariable = {
	name: 'shade_80_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 13%)',
};
export const shade_80_dark: StyleVariable = {
	name: 'shade_80_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 87%)',
};
export const shade_90_light: StyleVariable = {
	name: 'shade_90_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 10%)',
};
export const shade_90_dark: StyleVariable = {
	name: 'shade_90_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const shade_95_light: StyleVariable = {
	name: 'shade_95_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
};
export const shade_95_dark: StyleVariable = {
	name: 'shade_95_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 92%)',
};
export const shade_100_light: StyleVariable = {
	name: 'shade_100_light',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const shade_100_dark: StyleVariable = {
	name: 'shade_100_dark',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};

/*

darken/lighten - non-adaptive alpha overlays

Color-scheme-agnostic overlays for consistent darkening/lightening regardless of
light or dark mode. Use for backdrops, overlays, and demo backgrounds that need
consistent contrast. Unlike the adaptive shade scale, these don't flip.

Perceptual curve: 3%, 6%, 12%, 21%, 32%, 45%, 65%, 80%, 89%, 96%, 98%

*/
export const darken_05: StyleVariable = {name: 'darken_05', light: '#00000008', summary: '3%'};
export const darken_10: StyleVariable = {name: 'darken_10', light: '#0000000f', summary: '6%'};
export const darken_20: StyleVariable = {name: 'darken_20', light: '#0000001f', summary: '12%'};
export const darken_30: StyleVariable = {name: 'darken_30', light: '#00000036', summary: '21%'};
export const darken_40: StyleVariable = {name: 'darken_40', light: '#00000052', summary: '32%'};
export const darken_50: StyleVariable = {name: 'darken_50', light: '#00000073', summary: '45%'};
export const darken_60: StyleVariable = {name: 'darken_60', light: '#000000a6', summary: '65%'};
export const darken_70: StyleVariable = {name: 'darken_70', light: '#000000cc', summary: '80%'};
export const darken_80: StyleVariable = {name: 'darken_80', light: '#000000e3', summary: '89%'};
export const darken_90: StyleVariable = {name: 'darken_90', light: '#000000f5', summary: '96%'};
export const darken_95: StyleVariable = {name: 'darken_95', light: '#000000fa', summary: '98%'};
export const lighten_05: StyleVariable = {name: 'lighten_05', light: '#ffffff08', summary: '3%'};
export const lighten_10: StyleVariable = {name: 'lighten_10', light: '#ffffff0f', summary: '6%'};
export const lighten_20: StyleVariable = {name: 'lighten_20', light: '#ffffff1f', summary: '12%'};
export const lighten_30: StyleVariable = {name: 'lighten_30', light: '#ffffff36', summary: '21%'};
export const lighten_40: StyleVariable = {name: 'lighten_40', light: '#ffffff52', summary: '32%'};
export const lighten_50: StyleVariable = {name: 'lighten_50', light: '#ffffff73', summary: '45%'};
export const lighten_60: StyleVariable = {name: 'lighten_60', light: '#ffffffa6', summary: '65%'};
export const lighten_70: StyleVariable = {name: 'lighten_70', light: '#ffffffcc', summary: '80%'};
export const lighten_80: StyleVariable = {name: 'lighten_80', light: '#ffffffe3', summary: '89%'};
export const lighten_90: StyleVariable = {name: 'lighten_90', light: '#fffffff5', summary: '96%'};
export const lighten_95: StyleVariable = {name: 'lighten_95', light: '#fffffffa', summary: '98%'};

/*

fg/bg - adaptive alpha overlays

Color-scheme-adaptive overlays that swap direction per color scheme:
- fg (foreground direction) = toward contrast (darkens in light mode, lightens in dark mode)
- bg (background direction) = toward surface (lightens in light mode, darkens in dark mode)

Use for subtle backgrounds that work in both color schemes without explicit conditionals.
These stack when nested (alpha accumulates), unlike the opaque shade scale.

*/
export const fg_05: StyleVariable = {
	name: 'fg_05',
	light: 'var(--darken_05)',
	dark: 'var(--lighten_05)',
};
export const fg_10: StyleVariable = {
	name: 'fg_10',
	light: 'var(--darken_10)',
	dark: 'var(--lighten_10)',
};
export const fg_20: StyleVariable = {
	name: 'fg_20',
	light: 'var(--darken_20)',
	dark: 'var(--lighten_20)',
};
export const fg_30: StyleVariable = {
	name: 'fg_30',
	light: 'var(--darken_30)',
	dark: 'var(--lighten_30)',
};
export const fg_40: StyleVariable = {
	name: 'fg_40',
	light: 'var(--darken_40)',
	dark: 'var(--lighten_40)',
};
export const fg_50: StyleVariable = {
	name: 'fg_50',
	light: 'var(--darken_50)',
	dark: 'var(--lighten_50)',
};
export const fg_60: StyleVariable = {
	name: 'fg_60',
	light: 'var(--darken_60)',
	dark: 'var(--lighten_60)',
};
export const fg_70: StyleVariable = {
	name: 'fg_70',
	light: 'var(--darken_70)',
	dark: 'var(--lighten_70)',
};
export const fg_80: StyleVariable = {
	name: 'fg_80',
	light: 'var(--darken_80)',
	dark: 'var(--lighten_80)',
};
export const fg_90: StyleVariable = {
	name: 'fg_90',
	light: 'var(--darken_90)',
	dark: 'var(--lighten_90)',
};
export const fg_95: StyleVariable = {
	name: 'fg_95',
	light: 'var(--darken_95)',
	dark: 'var(--lighten_95)',
};
export const bg_05: StyleVariable = {
	name: 'bg_05',
	light: 'var(--lighten_05)',
	dark: 'var(--darken_05)',
};
export const bg_10: StyleVariable = {
	name: 'bg_10',
	light: 'var(--lighten_10)',
	dark: 'var(--darken_10)',
};
export const bg_20: StyleVariable = {
	name: 'bg_20',
	light: 'var(--lighten_20)',
	dark: 'var(--darken_20)',
};
export const bg_30: StyleVariable = {
	name: 'bg_30',
	light: 'var(--lighten_30)',
	dark: 'var(--darken_30)',
};
export const bg_40: StyleVariable = {
	name: 'bg_40',
	light: 'var(--lighten_40)',
	dark: 'var(--darken_40)',
};
export const bg_50: StyleVariable = {
	name: 'bg_50',
	light: 'var(--lighten_50)',
	dark: 'var(--darken_50)',
};
export const bg_60: StyleVariable = {
	name: 'bg_60',
	light: 'var(--lighten_60)',
	dark: 'var(--darken_60)',
};
export const bg_70: StyleVariable = {
	name: 'bg_70',
	light: 'var(--lighten_70)',
	dark: 'var(--darken_70)',
};
export const bg_80: StyleVariable = {
	name: 'bg_80',
	light: 'var(--lighten_80)',
	dark: 'var(--darken_80)',
};
export const bg_90: StyleVariable = {
	name: 'bg_90',
	light: 'var(--lighten_90)',
	dark: 'var(--darken_90)',
};
export const bg_95: StyleVariable = {
	name: 'bg_95',
	light: 'var(--lighten_95)',
	dark: 'var(--darken_95)',
};

/*

border_color alpha - tinted alpha borders for accessibility

Theme-integrated borders with alpha transparency. Tinted with tint_hue for cohesion.
Higher alpha in dark mode compensates for lower perceived contrast.

*/
export const border_color_05: StyleVariable = {
	name: 'border_color_05',
	light: 'hsl(var(--tint_hue) 60% 20% / 10%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 15%)',
};
export const border_color_10: StyleVariable = {
	name: 'border_color_10',
	light: 'hsl(var(--tint_hue) 60% 20% / 15%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 25%)',
};
export const border_color_20: StyleVariable = {
	name: 'border_color_20',
	light: 'hsl(var(--tint_hue) 60% 20% / 25%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 40%)',
};
export const border_color_30: StyleVariable = {
	name: 'border_color_30',
	light: 'hsl(var(--tint_hue) 60% 20% / 35%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 55%)',
};
export const border_color_40: StyleVariable = {
	name: 'border_color_40',
	light: 'hsl(var(--tint_hue) 60% 20% / 50%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 70%)',
};
export const border_color_50: StyleVariable = {
	name: 'border_color_50',
	light: 'hsl(var(--tint_hue) 60% 20% / 65%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 80%)',
};
export const border_color_60: StyleVariable = {
	name: 'border_color_60',
	light: 'hsl(var(--tint_hue) 60% 20% / 75%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 85%)',
};
export const border_color_70: StyleVariable = {
	name: 'border_color_70',
	light: 'hsl(var(--tint_hue) 60% 20% / 82%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 90%)',
};
export const border_color_80: StyleVariable = {
	name: 'border_color_80',
	light: 'hsl(var(--tint_hue) 60% 20% / 88%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 93%)',
};
export const border_color_90: StyleVariable = {
	name: 'border_color_90',
	light: 'hsl(var(--tint_hue) 60% 20% / 94%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 96%)',
};
export const border_color_95: StyleVariable = {
	name: 'border_color_95',
	light: 'hsl(var(--tint_hue) 60% 20% / 97%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 98%)',
};

/*

text colors - flipped scale where low numbers = subtle, high numbers = bold

*/
/* text colors don't use alpha because it affects performance too much */

// Untinted text extremes (parallel to shade_min/shade_max)
export const text_min: StyleVariable = {
	name: 'text_min',
	light: '#fff',
	dark: '#000',
};
export const text_max: StyleVariable = {
	name: 'text_max',
	light: '#000',
	dark: '#fff',
};

export const text_color: StyleVariable = {name: 'text_color', light: 'var(--text_80)'};
export const text_00: StyleVariable = {
	name: 'text_00',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const text_05: StyleVariable = {
	name: 'text_05',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 94%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 10%)',
};
export const text_10: StyleVariable = {
	name: 'text_10',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 14%)',
};
export const text_20: StyleVariable = {
	name: 'text_20',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 22%)',
};
export const text_30: StyleVariable = {
	name: 'text_30',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 68%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 30%)',
};
export const text_40: StyleVariable = {
	name: 'text_40',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 59%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 40%)',
};
export const text_50: StyleVariable = {
	name: 'text_50',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 50%)',
};
export const text_60: StyleVariable = {
	name: 'text_60',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 41%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 58%)',
};
export const text_70: StyleVariable = {
	name: 'text_70',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 32%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 69%)',
};
export const text_80: StyleVariable = {
	name: 'text_80',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 80%)',
};
export const text_90: StyleVariable = {
	name: 'text_90',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const text_95: StyleVariable = {
	name: 'text_95',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 4%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};
export const text_100: StyleVariable = {
	name: 'text_100',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 2%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 98%)',
};
export const text_disabled: StyleVariable = {
	name: 'text_disabled',
	light: 'var(--text_50)',
};

/* fonts */
export const font_family_sans: StyleVariable = {
	name: 'font_family_sans',
	light: "system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
	summary:
		'@source https://kilianvalkhof.com/2022/css-html/your-css-reset-needs-text-size-adjust-probably/',
};
export const font_family_serif: StyleVariable = {
	name: 'font_family_serif',
	light: "'DM Serif Display', Georgia, serif",
	summary: '@source https://svelte.dev/',
};
export const font_family_mono: StyleVariable = {
	name: 'font_family_mono',
	light: "ui-monospace, 'Fira Mono', monospace",
};

/* sizes like font-size */
export const font_size_xs: StyleVariable = {name: 'font_size_xs', light: '1rem'};
export const font_size_sm: StyleVariable = {name: 'font_size_sm', light: '1.3rem'};
export const font_size_md: StyleVariable = {name: 'font_size_md', light: '1.6rem'};
export const font_size_lg: StyleVariable = {name: 'font_size_lg', light: '2.04rem'};
export const font_size_xl: StyleVariable = {name: 'font_size_xl', light: '2.59rem'};
export const font_size_xl2: StyleVariable = {name: 'font_size_xl2', light: '3.29rem'};
export const font_size_xl3: StyleVariable = {name: 'font_size_xl3', light: '4.19rem'};
export const font_size_xl4: StyleVariable = {name: 'font_size_xl4', light: '5.33rem'};
export const font_size_xl5: StyleVariable = {name: 'font_size_xl5', light: '6.78rem'};
export const font_size_xl6: StyleVariable = {name: 'font_size_xl6', light: '8.62rem'};
export const font_size_xl7: StyleVariable = {name: 'font_size_xl7', light: '10.97rem'};
export const font_size_xl8: StyleVariable = {name: 'font_size_xl8', light: '13.95rem'};
export const font_size_xl9: StyleVariable = {name: 'font_size_xl9', light: '17.74rem'};

export const line_height_xs: StyleVariable = {name: 'line_height_xs', light: '1'};
export const line_height_sm: StyleVariable = {name: 'line_height_sm', light: '1.2'};
export const line_height_md: StyleVariable = {name: 'line_height_md', light: '1.4'};
export const line_height_lg: StyleVariable = {name: 'line_height_lg', light: '1.6'};
export const line_height_xl: StyleVariable = {name: 'line_height_xl', light: '2'};

/* links */
export const link_color: StyleVariable = {
	name: 'link_color',
	light: 'hsl(var(--hue_a) 61% 35%)',
	dark: 'hsl(var(--hue_a) 61% 58%)',
};
export const text_decoration: StyleVariable = {name: 'text_decoration', light: 'none'};
export const text_decoration_hover: StyleVariable = {
	name: 'text_decoration_hover',
	light: 'underline',
};
export const text_decoration_selected: StyleVariable = {
	name: 'text_decoration_selected',
	light: 'underline',
};
export const link_color_selected: StyleVariable = {
	name: 'link_color_selected',
	light: 'var(--text_color)',
};

/* spacings, rounded to pixels for the default 16px case */
export const space_xs5: StyleVariable = {name: 'space_xs5', light: '0.1rem'};
export const space_xs4: StyleVariable = {name: 'space_xs4', light: '0.2rem'};
export const space_xs3: StyleVariable = {name: 'space_xs3', light: '0.3rem'};
export const space_xs2: StyleVariable = {name: 'space_xs2', light: '0.4rem'};
export const space_xs: StyleVariable = {name: 'space_xs', light: '0.6rem'};
export const space_sm: StyleVariable = {name: 'space_sm', light: '0.8rem'};
export const space_md: StyleVariable = {name: 'space_md', light: '1rem'};
export const space_lg: StyleVariable = {name: 'space_lg', light: '1.3rem'};
export const space_xl: StyleVariable = {name: 'space_xl', light: '1.6rem'};
export const space_xl2: StyleVariable = {name: 'space_xl2', light: '2.1rem'};
export const space_xl3: StyleVariable = {name: 'space_xl3', light: '2.6rem'};
export const space_xl4: StyleVariable = {name: 'space_xl4', light: '3.3rem'};
export const space_xl5: StyleVariable = {name: 'space_xl5', light: '4.2rem'};
export const space_xl6: StyleVariable = {name: 'space_xl6', light: '5.4rem'};
export const space_xl7: StyleVariable = {name: 'space_xl7', light: '6.9rem'};
export const space_xl8: StyleVariable = {name: 'space_xl8', light: '8.7rem'};
export const space_xl9: StyleVariable = {name: 'space_xl9', light: '11.1rem'};
export const space_xl10: StyleVariable = {name: 'space_xl10', light: '14.1rem'};
export const space_xl11: StyleVariable = {name: 'space_xl11', light: '17.9rem'};
export const space_xl12: StyleVariable = {name: 'space_xl12', light: '22.8rem'};
export const space_xl13: StyleVariable = {name: 'space_xl13', light: '29rem'};
export const space_xl14: StyleVariable = {name: 'space_xl14', light: '36.9rem'};
export const space_xl15: StyleVariable = {name: 'space_xl15', light: '47rem'};
export const distance_xs: StyleVariable = {name: 'distance_xs', light: '200px'};
export const distance_sm: StyleVariable = {name: 'distance_sm', light: '320px'};
export const distance_md: StyleVariable = {name: 'distance_md', light: '800px'};
export const distance_lg: StyleVariable = {name: 'distance_lg', light: '1200px'};
export const distance_xl: StyleVariable = {name: 'distance_xl', light: '1600px'};

/* borders and outlines */
export const border_color: StyleVariable = {
	name: 'border_color',
	light: 'var(--shade_30)',
};
export const border_style: StyleVariable = {
	name: 'border_style',
	light: 'solid',
};
export const border_width: StyleVariable = {name: 'border_width', light: 'var(--border_width_1)'};
// These use numbers instead of named size variants because
// they more directly map to how I think about border widths.
// But maye this could be expanded/rethought.
export const border_width_1: StyleVariable = {name: 'border_width_1', light: '1px'};
export const border_width_2: StyleVariable = {name: 'border_width_2', light: '2px'};
export const border_width_3: StyleVariable = {name: 'border_width_3', light: '3px'};
export const border_width_4: StyleVariable = {name: 'border_width_4', light: '4px'};
export const border_width_5: StyleVariable = {name: 'border_width_5', light: '5px'};
export const border_width_6: StyleVariable = {name: 'border_width_6', light: '6px'};
export const border_width_7: StyleVariable = {name: 'border_width_7', light: '7px'};
export const border_width_8: StyleVariable = {name: 'border_width_8', light: '8px'};
export const border_width_9: StyleVariable = {name: 'border_width_9', light: '9px'};
export const outline_width: StyleVariable = {
	name: 'outline_width',
	light: '0',
};
export const outline_width_focus: StyleVariable = {
	// TODO maybe rename _2 to `focus`
	name: 'outline_width_focus',
	light: 'var(--border_width_2)',
};
export const outline_width_active: StyleVariable = {
	// TODO maybe rename _3 to `active`
	name: 'outline_width_active',
	light: 'var(--border_width_1)',
};
export const outline_style: StyleVariable = {name: 'outline_style', light: 'solid'};
export const outline_color: StyleVariable = {
	name: 'outline_color',
	light: 'var(--color_a_50)',
};

/* border radii */
export const border_radius_xs3: StyleVariable = {name: 'border_radius_xs3', light: '0.3rem'};
export const border_radius_xs2: StyleVariable = {name: 'border_radius_xs2', light: '0.5rem'};
export const border_radius_xs: StyleVariable = {name: 'border_radius_xs', light: '0.8rem'};
export const border_radius_sm: StyleVariable = {name: 'border_radius_sm', light: '1.3rem'};
export const border_radius_md: StyleVariable = {name: 'border_radius_md', light: '2.1rem'};
export const border_radius_lg: StyleVariable = {name: 'border_radius_lg', light: '3.4rem'};
export const border_radius_xl: StyleVariable = {name: 'border_radius_xl', light: '5.5rem'};

/* button shadows */
export const button_shadow: StyleVariable = {
	name: 'button_shadow',
	light:
		'var(--shadow_inset_bottom_xs) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_30), transparent), var(--shadow_inset_top_xs) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_30), transparent)',
	dark: 'var(--shadow_inset_top_xs) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_30), transparent), var(--shadow_inset_bottom_xs) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_30), transparent)',
};
export const button_shadow_hover: StyleVariable = {
	name: 'button_shadow_hover',
	light:
		'var(--shadow_inset_bottom_sm) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_40), transparent), var(--shadow_inset_top_sm) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_40), transparent)',
	dark: 'var(--shadow_inset_top_sm) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_40), transparent), var(--shadow_inset_bottom_sm) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_40), transparent)',
};
export const button_shadow_active: StyleVariable = {
	name: 'button_shadow_active',
	light: button_shadow_hover.dark,
	dark: button_shadow_hover.light,
};

/* inputs */
export const input_fill: StyleVariable = {name: 'input_fill', light: 'var(--bg_80)'};
export const input_padding_y: StyleVariable = {name: 'input_padding_y', light: '0'};
export const input_padding_x: StyleVariable = {name: 'input_padding_x', light: 'var(--space_lg)'};
export const input_width_min: StyleVariable = {name: 'input_width_min', light: '100px'};
export const input_height: StyleVariable = {name: 'input_height', light: 'var(--space_xl5)'};
export const input_height_sm: StyleVariable = {name: 'input_height_sm', light: 'var(--space_xl4)'};
export const input_height_inner: StyleVariable = {
	name: 'input_height_inner',
	light: 'calc(var(--input_height) - 2 * var(--border_width) - 2 * var(--input_padding_y))',
};

/*

shadows

*/

// TODO these shouldn't use tint, use lighten/darken instead,
// but ideally we'd have a blend mode make the colors right,
// which would require a pseduo-element,
// but that's heavier and requires the element to be positioned (I think?)

// TODO maybe:
// - make shadow and glow color-scheme-agnostic?
// - lift and depth that have both shadow and glow, color-scheme-aware

export const shadow_xs: StyleVariable = {
	name: 'shadow_xs',
	light: '0 0 3px 0px',
};
export const shadow_top_xs: StyleVariable = {
	name: 'shadow_top_xs',
	light: '0 -1px 3px 0px',
};
export const shadow_bottom_xs: StyleVariable = {
	name: 'shadow_bottom_xs',
	light: '0 1px 3px 0px',
};
export const shadow_inset_xs: StyleVariable = {
	name: 'shadow_inset_xs',
	light: 'inset 0 0 3px 0px',
};
export const shadow_inset_top_xs: StyleVariable = {
	name: 'shadow_inset_top_xs',
	light: 'inset 0 1px 3px 0px',
};
export const shadow_inset_bottom_xs: StyleVariable = {
	name: 'shadow_inset_bottom_xs',
	light: 'inset 0 -1px 3px 0px',
};
export const shadow_sm: StyleVariable = {
	name: 'shadow_sm',
	light: '0 0 4px 0px',
};
export const shadow_top_sm: StyleVariable = {
	name: 'shadow_top_sm',
	light: '0 -1.5px 4px 0px',
};
export const shadow_bottom_sm: StyleVariable = {
	name: 'shadow_bottom_sm',
	light: '0 1.5px 4px 0px',
};
export const shadow_inset_sm: StyleVariable = {
	name: 'shadow_inset_sm',
	light: 'inset 0 0 4px 0px',
};
export const shadow_inset_top_sm: StyleVariable = {
	name: 'shadow_inset_top_sm',
	light: 'inset 0 1.5px 4px 0px',
};
export const shadow_inset_bottom_sm: StyleVariable = {
	name: 'shadow_inset_bottom_sm',
	light: 'inset 0 -1.5px 4px 0px',
};
export const shadow_md: StyleVariable = {
	name: 'shadow_md',
	light: '0 0 6px 0px',
};
export const shadow_top_md: StyleVariable = {
	name: 'shadow_top_md',
	light: '0 -2.5px 6px 0px',
};
export const shadow_bottom_md: StyleVariable = {
	name: 'shadow_bottom_md',
	light: '0 2.5px 6px 0px',
};
export const shadow_inset_md: StyleVariable = {
	name: 'shadow_inset_md',
	light: 'inset 0 0 6px 0px',
};
export const shadow_inset_top_md: StyleVariable = {
	name: 'shadow_inset_top_md',
	light: 'inset 0 2.5px 6px 0px',
};
export const shadow_inset_bottom_md: StyleVariable = {
	name: 'shadow_inset_bottom_md',
	light: 'inset 0 -2.5px 6px 0px',
};
export const shadow_lg: StyleVariable = {
	name: 'shadow_lg',
	light: '0 0 10px 0px',
};
export const shadow_top_lg: StyleVariable = {
	name: 'shadow_top_lg',
	light: '0 -3.5px 10px 0px',
};
export const shadow_bottom_lg: StyleVariable = {
	name: 'shadow_bottom_lg',
	light: '0 3.5px 10px 0px',
};
export const shadow_inset_lg: StyleVariable = {
	name: 'shadow_inset_lg',
	light: 'inset 0 0 10px 0px',
};
export const shadow_inset_top_lg: StyleVariable = {
	name: 'shadow_inset_top_lg',
	light: 'inset 0 3.5px 10px 0px',
};
export const shadow_inset_bottom_lg: StyleVariable = {
	name: 'shadow_inset_bottom_lg',
	light: 'inset 0 -3.5px 10px 0px',
};
export const shadow_xl: StyleVariable = {
	name: 'shadow_xl',
	light: '0 0 20px 1px',
};
export const shadow_top_xl: StyleVariable = {
	name: 'shadow_top_xl',
	light: '0 -5px 20px 1px',
};
export const shadow_bottom_xl: StyleVariable = {
	name: 'shadow_bottom_xl',
	light: '0 5px 20px 1px',
};
export const shadow_inset_xl: StyleVariable = {
	name: 'shadow_inset_xl',
	light: 'inset 0 0 20px 1px',
};
export const shadow_inset_top_xl: StyleVariable = {
	name: 'shadow_inset_top_xl',
	light: 'inset 0 5px 20px 1px',
};
export const shadow_inset_bottom_xl: StyleVariable = {
	name: 'shadow_inset_bottom_xl',
	light: 'inset 0 -5px 20px 1px',
};

export const shadow_color: StyleVariable = {
	name: 'shadow_color',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 0%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
};
export const shadow_color_highlight: StyleVariable = {
	name: 'shadow_color_highlight',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 94%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 0%)',
};
export const shadow_color_glow: StyleVariable = {
	name: 'shadow_color_glow',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 94%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
};
export const shadow_color_shroud: StyleVariable = {
	name: 'shadow_color_shroud',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 0%)',
};
// TODO @ryanatkn consider sharing an alpha abstraction with darken/lighten - these use the same perceptual scale
// TODO @ryanatkn are these variables needed, or can classes just use inline percentages?
export const shadow_alpha_05: StyleVariable = {name: 'shadow_alpha_05', light: '3%'};
export const shadow_alpha_10: StyleVariable = {name: 'shadow_alpha_10', light: '6%'};
export const shadow_alpha_20: StyleVariable = {name: 'shadow_alpha_20', light: '12%'};
export const shadow_alpha_30: StyleVariable = {name: 'shadow_alpha_30', light: '21%'};
export const shadow_alpha_40: StyleVariable = {name: 'shadow_alpha_40', light: '32%'};
export const shadow_alpha_50: StyleVariable = {name: 'shadow_alpha_50', light: '45%'};
export const shadow_alpha_60: StyleVariable = {name: 'shadow_alpha_60', light: '65%'};
export const shadow_alpha_70: StyleVariable = {name: 'shadow_alpha_70', light: '80%'};
export const shadow_alpha_80: StyleVariable = {name: 'shadow_alpha_80', light: '89%'};
export const shadow_alpha_90: StyleVariable = {name: 'shadow_alpha_90', light: '96%'};
export const shadow_alpha_95: StyleVariable = {name: 'shadow_alpha_95', light: '98%'};

/* icons */
/* these decrease by the golden ratio, rounded to the nearest pixel,
	and they're insensitive to font size (`px` not `rem`) */
export const icon_size_xs: StyleVariable = {
	name: 'icon_size_xs',
	light: icon_sizes.icon_size_xs,
};
export const icon_size_sm: StyleVariable = {
	name: 'icon_size_sm',
	light: icon_sizes.icon_size_sm,
};
export const icon_size_md: StyleVariable = {
	name: 'icon_size_md',
	light: icon_sizes.icon_size_md,
};
export const icon_size_lg: StyleVariable = {
	name: 'icon_size_lg',
	light: icon_sizes.icon_size_lg,
};
export const icon_size_xl: StyleVariable = {
	name: 'icon_size_xl',
	light: icon_sizes.icon_size_xl,
};
export const icon_size_xl2: StyleVariable = {
	name: 'icon_size_xl2',
	light: icon_sizes.icon_size_xl2,
};
export const icon_size_xl3: StyleVariable = {
	name: 'icon_size_xl3',
	light: icon_sizes.icon_size_xl3,
};

/* durations */
// TODO maybe change the scale from xs-xl, and add an xs here around 0.04s or 0.03s (2 frames at 60fps)
// TODO docs
export const duration_1: StyleVariable = {name: 'duration_1', light: '0.08s'};
export const duration_2: StyleVariable = {name: 'duration_2', light: '0.2s'};
export const duration_3: StyleVariable = {name: 'duration_3', light: '0.5s'};
export const duration_4: StyleVariable = {name: 'duration_4', light: '1s'};
export const duration_5: StyleVariable = {name: 'duration_5', light: '1.5s'};
export const duration_6: StyleVariable = {name: 'duration_6', light: '3s'};

export const disabled_opacity: StyleVariable = {
	name: 'disabled_opacity',
	light: '60%',
};

/**
 * Collect all color variables by hue for easy access.
 */
const color_variables_by_hue: Record<string, Record<string, StyleVariable>> = {
	a: {
		color_a_00,
		color_a_05,
		color_a_10,
		color_a_20,
		color_a_30,
		color_a_40,
		color_a_50,
		color_a_60,
		color_a_70,
		color_a_80,
		color_a_90,
		color_a_95,
		color_a_100,
	},
	b: {
		color_b_00,
		color_b_05,
		color_b_10,
		color_b_20,
		color_b_30,
		color_b_40,
		color_b_50,
		color_b_60,
		color_b_70,
		color_b_80,
		color_b_90,
		color_b_95,
		color_b_100,
	},
	c: {
		color_c_00,
		color_c_05,
		color_c_10,
		color_c_20,
		color_c_30,
		color_c_40,
		color_c_50,
		color_c_60,
		color_c_70,
		color_c_80,
		color_c_90,
		color_c_95,
		color_c_100,
	},
	d: {
		color_d_00,
		color_d_05,
		color_d_10,
		color_d_20,
		color_d_30,
		color_d_40,
		color_d_50,
		color_d_60,
		color_d_70,
		color_d_80,
		color_d_90,
		color_d_95,
		color_d_100,
	},
	e: {
		color_e_00,
		color_e_05,
		color_e_10,
		color_e_20,
		color_e_30,
		color_e_40,
		color_e_50,
		color_e_60,
		color_e_70,
		color_e_80,
		color_e_90,
		color_e_95,
		color_e_100,
	},
	f: {
		color_f_00,
		color_f_05,
		color_f_10,
		color_f_20,
		color_f_30,
		color_f_40,
		color_f_50,
		color_f_60,
		color_f_70,
		color_f_80,
		color_f_90,
		color_f_95,
		color_f_100,
	},
	g: {
		color_g_00,
		color_g_05,
		color_g_10,
		color_g_20,
		color_g_30,
		color_g_40,
		color_g_50,
		color_g_60,
		color_g_70,
		color_g_80,
		color_g_90,
		color_g_95,
		color_g_100,
	},
	h: {
		color_h_00,
		color_h_05,
		color_h_10,
		color_h_20,
		color_h_30,
		color_h_40,
		color_h_50,
		color_h_60,
		color_h_70,
		color_h_80,
		color_h_90,
		color_h_95,
		color_h_100,
	},
	i: {
		color_i_00,
		color_i_05,
		color_i_10,
		color_i_20,
		color_i_30,
		color_i_40,
		color_i_50,
		color_i_60,
		color_i_70,
		color_i_80,
		color_i_90,
		color_i_95,
		color_i_100,
	},
	j: {
		color_j_00,
		color_j_05,
		color_j_10,
		color_j_20,
		color_j_30,
		color_j_40,
		color_j_50,
		color_j_60,
		color_j_70,
		color_j_80,
		color_j_90,
		color_j_95,
		color_j_100,
	},
};

/**
 * Generate absolute color variants (non-adaptive).
 * color_X_XX_light: uses the light-mode value in both color schemes
 * color_X_XX_dark: uses the dark-mode value in both color schemes (falls back to light if no dark)
 */
const generate_absolute_color_variables = (): Array<StyleVariable> => {
	const result: Array<StyleVariable> = [];
	for (const hue of color_variants) {
		for (const intensity of intensity_variants) {
			const name_base = `color_${hue}_${intensity}`;
			const source = color_variables_by_hue[hue]![name_base]!;
			// _light variant uses the light-mode value
			result.push({
				name: `${name_base}_light`,
				light: source.light,
			});
			// _dark variant uses the dark-mode value (or light if no dark exists)
			result.push({
				name: `${name_base}_dark`,
				light: source.dark ?? source.light,
			});
		}
	}
	return result;
};

/**
 * Absolute color variants for all hues and intensities.
 * Non-adaptive: these don't change between light and dark color schemes.
 */
export const absolute_color_variables: Array<StyleVariable> = generate_absolute_color_variables();

/**
 * These are implicitly the variables for the `base` theme.
 * See also the empty `variables` array of the `base` theme above.
 */
export const default_variables: Array<StyleVariable> = [
	/*
		colors - eyeballed and intepolated with a spreadsheet,
		a professional designer will have opinions
	*/
	hue_a,
	hue_b,
	hue_c,
	hue_d,
	hue_e,
	hue_f,
	hue_g,
	hue_h,
	hue_i,
	hue_j,
	color_a_00,
	color_a_05,
	color_a_10,
	color_a_20,
	color_a_30,
	color_a_40,
	color_a_50,
	color_a_60,
	color_a_70,
	color_a_80,
	color_a_90,
	color_a_95,
	color_a_100,
	color_b_00,
	color_b_05,
	color_b_10,
	color_b_20,
	color_b_30,
	color_b_40,
	color_b_50,
	color_b_60,
	color_b_70,
	color_b_80,
	color_b_90,
	color_b_95,
	color_b_100,
	color_c_00,
	color_c_05,
	color_c_10,
	color_c_20,
	color_c_30,
	color_c_40,
	color_c_50,
	color_c_60,
	color_c_70,
	color_c_80,
	color_c_90,
	color_c_95,
	color_c_100,
	color_d_00,
	color_d_05,
	color_d_10,
	color_d_20,
	color_d_30,
	color_d_40,
	color_d_50,
	color_d_60,
	color_d_70,
	color_d_80,
	color_d_90,
	color_d_95,
	color_d_100,
	color_e_00,
	color_e_05,
	color_e_10,
	color_e_20,
	color_e_30,
	color_e_40,
	color_e_50,
	color_e_60,
	color_e_70,
	color_e_80,
	color_e_90,
	color_e_95,
	color_e_100,
	color_f_00,
	color_f_05,
	color_f_10,
	color_f_20,
	color_f_30,
	color_f_40,
	color_f_50,
	color_f_60,
	color_f_70,
	color_f_80,
	color_f_90,
	color_f_95,
	color_f_100,
	color_g_00,
	color_g_05,
	color_g_10,
	color_g_20,
	color_g_30,
	color_g_40,
	color_g_50,
	color_g_60,
	color_g_70,
	color_g_80,
	color_g_90,
	color_g_95,
	color_g_100,
	color_h_00,
	color_h_05,
	color_h_10,
	color_h_20,
	color_h_30,
	color_h_40,
	color_h_50,
	color_h_60,
	color_h_70,
	color_h_80,
	color_h_90,
	color_h_95,
	color_h_100,
	color_i_00,
	color_i_05,
	color_i_10,
	color_i_20,
	color_i_30,
	color_i_40,
	color_i_50,
	color_i_60,
	color_i_70,
	color_i_80,
	color_i_90,
	color_i_95,
	color_i_100,
	color_j_00,
	color_j_05,
	color_j_10,
	color_j_20,
	color_j_30,
	color_j_40,
	color_j_50,
	color_j_60,
	color_j_70,
	color_j_80,
	color_j_90,
	color_j_95,
	color_j_100,

	/* absolute color variants (non-adaptive) */
	...absolute_color_variables,

	/* tint colors */
	tint_hue,
	tint_saturation,

	/* shade scale */
	shade_min,
	shade_max,
	shade_00,
	shade_05,
	shade_10,
	shade_20,
	shade_30,
	shade_40,
	shade_50,
	shade_60,
	shade_70,
	shade_80,
	shade_90,
	shade_95,
	shade_100,

	/* non-adaptive shade variants */
	shade_00_light,
	shade_00_dark,
	shade_05_light,
	shade_05_dark,
	shade_10_light,
	shade_10_dark,
	shade_20_light,
	shade_20_dark,
	shade_30_light,
	shade_30_dark,
	shade_40_light,
	shade_40_dark,
	shade_50_light,
	shade_50_dark,
	shade_60_light,
	shade_60_dark,
	shade_70_light,
	shade_70_dark,
	shade_80_light,
	shade_80_dark,
	shade_90_light,
	shade_90_dark,
	shade_95_light,
	shade_95_dark,
	shade_100_light,
	shade_100_dark,

	/* darken/lighten alpha overlays */
	darken_05,
	darken_10,
	darken_20,
	darken_30,
	darken_40,
	darken_50,
	darken_60,
	darken_70,
	darken_80,
	darken_90,
	darken_95,
	lighten_05,
	lighten_10,
	lighten_20,
	lighten_30,
	lighten_40,
	lighten_50,
	lighten_60,
	lighten_70,
	lighten_80,
	lighten_90,
	lighten_95,

	/* fg/bg adaptive alpha overlays */
	fg_05,
	fg_10,
	fg_20,
	fg_30,
	fg_40,
	fg_50,
	fg_60,
	fg_70,
	fg_80,
	fg_90,
	fg_95,
	bg_05,
	bg_10,
	bg_20,
	bg_30,
	bg_40,
	bg_50,
	bg_60,
	bg_70,
	bg_80,
	bg_90,
	bg_95,

	/* border_color alpha */
	border_color_05,
	border_color_10,
	border_color_20,
	border_color_30,
	border_color_40,
	border_color_50,
	border_color_60,
	border_color_70,
	border_color_80,
	border_color_90,
	border_color_95,

	/* text colors don't use alpha because it affects performance too much */
	text_min,
	text_max,
	text_color,
	text_00,
	text_05,
	text_10,
	text_20,
	text_30,
	text_40,
	text_50,
	text_60,
	text_70,
	text_80,
	text_90,
	text_95,
	text_100,
	text_disabled,

	/* fonts */
	font_family_sans,
	font_family_serif,
	font_family_mono,

	/* font size */
	font_size_xs,
	font_size_sm,
	font_size_md,
	font_size_lg,
	font_size_xl,
	font_size_xl2,
	font_size_xl3,
	font_size_xl4,
	font_size_xl5,
	font_size_xl6,
	font_size_xl7,
	font_size_xl8,
	font_size_xl9,

	line_height_xs,
	line_height_sm,
	line_height_md,
	line_height_lg,
	line_height_xl,

	/* links */
	link_color,
	text_decoration,
	text_decoration_hover,
	text_decoration_selected,
	link_color_selected,

	/* space, rounded to pixels for the default 16px case */
	space_xs5,
	space_xs4,
	space_xs3,
	space_xs2,
	space_xs,
	space_sm,
	space_md,
	space_lg,
	space_xl,
	space_xl2,
	space_xl3,
	space_xl4,
	space_xl5,
	space_xl6,
	space_xl7,
	space_xl8,
	space_xl9,
	space_xl10,
	space_xl11,
	space_xl12,
	space_xl13,
	space_xl14,
	space_xl15,
	distance_xl,
	distance_lg,
	distance_md,
	distance_sm,
	distance_xs,

	/* borders and outlines */
	border_color,
	border_style,
	border_width,
	border_width_1,
	border_width_2,
	border_width_3,
	border_width_4,
	border_width_5,
	border_width_6,
	border_width_7,
	border_width_8,
	border_width_9,
	outline_width,
	outline_width_focus,
	outline_width_active,
	outline_style,
	outline_color,

	/* border radii */
	border_radius_xs3,
	border_radius_xs2,
	border_radius_xs,
	border_radius_sm,
	border_radius_md,
	border_radius_lg,
	border_radius_xl,

	/* button styles */
	button_shadow,
	button_shadow_hover,
	button_shadow_active,

	/* inputs */
	input_fill,
	input_padding_y,
	input_padding_x,
	input_width_min,
	input_height,
	input_height_sm,
	input_height_inner,

	/* shadows and glows */
	shadow_xs,
	shadow_sm,
	shadow_md,
	shadow_lg,
	shadow_xl,
	shadow_top_xs,
	shadow_top_sm,
	shadow_top_md,
	shadow_top_lg,
	shadow_top_xl,
	shadow_bottom_xs,
	shadow_bottom_sm,
	shadow_bottom_md,
	shadow_bottom_lg,
	shadow_bottom_xl,
	shadow_inset_xs,
	shadow_inset_sm,
	shadow_inset_md,
	shadow_inset_lg,
	shadow_inset_xl,
	shadow_inset_top_xs,
	shadow_inset_top_sm,
	shadow_inset_top_md,
	shadow_inset_top_lg,
	shadow_inset_top_xl,
	shadow_inset_bottom_xs,
	shadow_inset_bottom_sm,
	shadow_inset_bottom_md,
	shadow_inset_bottom_lg,
	shadow_inset_bottom_xl,
	shadow_color,
	shadow_color_highlight,
	shadow_color_glow,
	shadow_color_shroud,
	shadow_alpha_05,
	shadow_alpha_10,
	shadow_alpha_20,
	shadow_alpha_30,
	shadow_alpha_40,
	shadow_alpha_50,
	shadow_alpha_60,
	shadow_alpha_70,
	shadow_alpha_80,
	shadow_alpha_90,
	shadow_alpha_95,

	/* icons */
	icon_size_xs,
	icon_size_sm,
	icon_size_md,
	icon_size_lg,
	icon_size_xl,
	icon_size_xl2,
	icon_size_xl3,

	/* durations */
	duration_1,
	duration_2,
	duration_3,
	duration_4,
	duration_5,
	duration_6,

	/* transparencies */
	disabled_opacity,
];
