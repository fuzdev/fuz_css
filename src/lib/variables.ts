import type {StyleVariable} from './variable.js';
import {icon_sizes} from './variable_data.js';

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
export const color_a_05: StyleVariable = {
	name: 'color_a_05',
	light: 'hsl(var(--hue_a) 68% 95%)',
	dark: 'hsl(var(--hue_a) 68% 88%)',
};
export const color_a_10: StyleVariable = {
	name: 'color_a_10',
	light: 'hsl(var(--hue_a) 65% 91%)',
};
export const color_a_20: StyleVariable = {
	name: 'color_a_20',
	light: 'hsl(var(--hue_a) 62% 84%)',
	dark: 'hsl(var(--hue_a) 62% 84%)',
};
export const color_a_30: StyleVariable = {
	name: 'color_a_30',
	light: 'hsl(var(--hue_a) 60% 73%)',
	dark: 'hsl(var(--hue_a) 60% 76%)',
};
export const color_a_40: StyleVariable = {
	name: 'color_a_40',
	light: 'hsl(var(--hue_a) 60% 62%)',
	dark: 'hsl(var(--hue_a) 60% 72%)',
};
export const color_a_50: StyleVariable = {
	name: 'color_a_50',
	light: 'hsl(var(--hue_a) 55% 50%)',
	dark: 'hsl(var(--hue_a) 55% 65%)',
};
export const color_a_60: StyleVariable = {
	name: 'color_a_60',
	light: 'hsl(var(--hue_a) 55% 40%)',
	dark: 'hsl(var(--hue_a) 55% 52%)',
};
export const color_a_70: StyleVariable = {
	name: 'color_a_70',
	light: 'hsl(var(--hue_a) 55% 30%)',
	dark: 'hsl(var(--hue_a) 55% 40%)',
};
export const color_a_80: StyleVariable = {
	name: 'color_a_80',
	light: 'hsl(var(--hue_a) 55% 20%)',
	dark: 'hsl(var(--hue_a) 55% 25%)',
};
export const color_a_90: StyleVariable = {
	name: 'color_a_90',
	light: 'hsl(var(--hue_a) 55% 10%)',
};
export const color_a_95: StyleVariable = {
	name: 'color_a_95',
	light: 'hsl(var(--hue_a) 55% 5%)',
	dark: 'hsl(var(--hue_a) 55% 12%)',
};
export const color_b_05: StyleVariable = {
	name: 'color_b_05',
	light: 'hsl(var(--hue_b) 52% 94%)',
	dark: 'hsl(var(--hue_b) 52% 87%)',
};
export const color_b_10: StyleVariable = {
	name: 'color_b_10',
	light: 'hsl(var(--hue_b) 55% 90%)',
};
export const color_b_20: StyleVariable = {
	name: 'color_b_20',
	light: 'hsl(var(--hue_b) 50% 77%)',
	dark: 'hsl(var(--hue_b) 50% 82%)',
};
export const color_b_30: StyleVariable = {
	name: 'color_b_30',
	light: 'hsl(var(--hue_b) 50% 63%)',
	dark: 'hsl(var(--hue_b) 50% 74%)',
};
export const color_b_40: StyleVariable = {
	name: 'color_b_40',
	light: 'hsl(var(--hue_b) 50% 49%)',
	dark: 'hsl(var(--hue_b) 50% 66%)',
};
export const color_b_50: StyleVariable = {
	name: 'color_b_50',
	light: 'hsl(var(--hue_b) 55% 36%)',
	dark: 'hsl(var(--hue_b) 43% 58%)',
};
export const color_b_60: StyleVariable = {
	name: 'color_b_60',
	light: 'hsl(var(--hue_b) 60% 25%)',
	dark: 'hsl(var(--hue_b) 51% 45%)',
};
export const color_b_70: StyleVariable = {
	name: 'color_b_70',
	light: 'hsl(var(--hue_b) 65% 18%)',
	dark: 'hsl(var(--hue_b) 59% 33%)',
};
export const color_b_80: StyleVariable = {
	name: 'color_b_80',
	light: 'hsl(var(--hue_b) 70% 12%)',
	dark: 'hsl(var(--hue_b) 67% 20%)',
};
export const color_b_90: StyleVariable = {
	name: 'color_b_90',
	light: 'hsl(var(--hue_b) 75% 7%)',
};
export const color_b_95: StyleVariable = {
	name: 'color_b_95',
	light: 'hsl(var(--hue_b) 78% 4%)',
	dark: 'hsl(var(--hue_b) 70% 10%)',
};
export const color_c_05: StyleVariable = {
	name: 'color_c_05',
	light: 'hsl(var(--hue_c) 88% 96%)',
	dark: 'hsl(var(--hue_c) 88% 88%)',
};
export const color_c_10: StyleVariable = {
	name: 'color_c_10',
	light: 'hsl(var(--hue_c) 85% 92%)',
};
export const color_c_20: StyleVariable = {
	name: 'color_c_20',
	light: 'hsl(var(--hue_c) 80% 84%)',
	dark: 'hsl(var(--hue_c) 81% 84%)',
};
export const color_c_30: StyleVariable = {
	name: 'color_c_30',
	light: 'hsl(var(--hue_c) 75% 73%)',
	dark: 'hsl(var(--hue_c) 78% 74%)',
};
export const color_c_40: StyleVariable = {
	name: 'color_c_40',
	light: 'hsl(var(--hue_c) 70% 63%)',
	dark: 'hsl(var(--hue_c) 74% 65%)',
};
export const color_c_50: StyleVariable = {
	name: 'color_c_50',
	light: 'hsl(var(--hue_c) 65% 50%)',
	dark: 'hsl(var(--hue_c) 70% 56%)',
};
export const color_c_60: StyleVariable = {
	name: 'color_c_60',
	light: 'hsl(var(--hue_c) 65% 40%)',
	dark: 'hsl(var(--hue_c) 65% 45%)',
};
export const color_c_70: StyleVariable = {
	name: 'color_c_70',
	light: 'hsl(var(--hue_c) 65% 30%)',
	dark: 'hsl(var(--hue_c) 65% 33%)',
};
export const color_c_80: StyleVariable = {
	name: 'color_c_80',
	light: 'hsl(var(--hue_c) 65% 20%)',
	dark: 'hsl(var(--hue_c) 65% 22%)',
};
export const color_c_90: StyleVariable = {
	name: 'color_c_90',
	light: 'hsl(var(--hue_c) 65% 10%)',
};
export const color_c_95: StyleVariable = {
	name: 'color_c_95',
	light: 'hsl(var(--hue_c) 65% 5%)',
	dark: 'hsl(var(--hue_c) 65% 12%)',
};
export const color_d_05: StyleVariable = {
	name: 'color_d_05',
	light: 'hsl(var(--hue_d) 52% 95%)',
	dark: 'hsl(var(--hue_d) 52% 87%)',
};
export const color_d_10: StyleVariable = {
	name: 'color_d_10',
	light: 'hsl(var(--hue_d) 50% 91%)',
};
export const color_d_20: StyleVariable = {
	name: 'color_d_20',
	light: 'hsl(var(--hue_d) 50% 82%)',
	dark: 'hsl(var(--hue_d) 50% 82%)',
};
export const color_d_30: StyleVariable = {
	name: 'color_d_30',
	light: 'hsl(var(--hue_d) 50% 72%)',
	dark: 'hsl(var(--hue_d) 50% 75%)',
};
export const color_d_40: StyleVariable = {
	name: 'color_d_40',
	light: 'hsl(var(--hue_d) 50% 62%)',
	dark: 'hsl(var(--hue_d) 50% 70%)',
};
export const color_d_50: StyleVariable = {
	name: 'color_d_50',
	light: 'hsl(var(--hue_d) 50% 50%)',
	dark: 'hsl(var(--hue_d) 50% 62%)',
};
export const color_d_60: StyleVariable = {
	name: 'color_d_60',
	light: 'hsl(var(--hue_d) 50% 40%)',
	dark: 'hsl(var(--hue_d) 50% 52%)',
};
export const color_d_70: StyleVariable = {
	name: 'color_d_70',
	light: 'hsl(var(--hue_d) 50% 30%)',
	dark: 'hsl(var(--hue_d) 50% 40%)',
};
export const color_d_80: StyleVariable = {
	name: 'color_d_80',
	light: 'hsl(var(--hue_d) 50% 20%)',
	dark: 'hsl(var(--hue_d) 50% 25%)',
};
export const color_d_90: StyleVariable = {
	name: 'color_d_90',
	light: 'hsl(var(--hue_d) 50% 10%)',
};
export const color_d_95: StyleVariable = {
	name: 'color_d_95',
	light: 'hsl(var(--hue_d) 50% 5%)',
	dark: 'hsl(var(--hue_d) 50% 12%)',
};
export const color_e_05: StyleVariable = {
	name: 'color_e_05',
	light: 'hsl(var(--hue_e) 88% 95%)',
	dark: 'hsl(var(--hue_e) 88% 88%)',
};
export const color_e_10: StyleVariable = {
	name: 'color_e_10',
	light: 'hsl(var(--hue_e) 85% 91%)',
};
export const color_e_20: StyleVariable = {
	name: 'color_e_20',
	light: 'hsl(var(--hue_e) 80% 79%)',
	dark: 'hsl(var(--hue_e) 80% 83%)',
};
export const color_e_30: StyleVariable = {
	name: 'color_e_30',
	light: 'hsl(var(--hue_e) 75% 65%)',
	dark: 'hsl(var(--hue_e) 75% 76%)',
};
export const color_e_40: StyleVariable = {
	name: 'color_e_40',
	light: 'hsl(var(--hue_e) 70% 50%)',
	dark: 'hsl(var(--hue_e) 70% 69%)',
};
export const color_e_50: StyleVariable = {
	name: 'color_e_50',
	light: 'hsl(var(--hue_e) 65% 41%)',
	dark: 'hsl(var(--hue_e) 70% 62%)',
};
export const color_e_60: StyleVariable = {
	name: 'color_e_60',
	light: 'hsl(var(--hue_e) 70% 34%)',
	dark: 'hsl(var(--hue_e) 70% 49%)',
};
export const color_e_70: StyleVariable = {
	name: 'color_e_70',
	light: 'hsl(var(--hue_e) 75% 26%)',
	dark: 'hsl(var(--hue_e) 75% 36%)',
};
export const color_e_80: StyleVariable = {
	name: 'color_e_80',
	light: 'hsl(var(--hue_e) 80% 18%)',
	dark: 'hsl(var(--hue_e) 80% 23%)',
};
export const color_e_90: StyleVariable = {
	name: 'color_e_90',
	light: 'hsl(var(--hue_e) 85% 10%)',
};
export const color_e_95: StyleVariable = {
	name: 'color_e_95',
	light: 'hsl(var(--hue_e) 88% 5%)',
	dark: 'hsl(var(--hue_e) 88% 12%)',
};
export const color_f_05: StyleVariable = {
	name: 'color_f_05',
	light: 'hsl(var(--hue_f) 30% 92%)',
	dark: 'hsl(var(--hue_f) 30% 84%)',
};
export const color_f_10: StyleVariable = {
	name: 'color_f_10',
	light: 'hsl(var(--hue_f) 32% 87%)',
};
export const color_f_20: StyleVariable = {
	name: 'color_f_20',
	light: 'hsl(var(--hue_f) 32% 72%)',
	dark: 'hsl(var(--hue_f) 32% 79%)',
};
export const color_f_30: StyleVariable = {
	name: 'color_f_30',
	light: 'hsl(var(--hue_f) 32% 57%)',
	dark: 'hsl(var(--hue_f) 32% 72%)',
};
export const color_f_40: StyleVariable = {
	name: 'color_f_40',
	light: 'hsl(var(--hue_f) 42% 41%)',
	dark: 'hsl(var(--hue_f) 32% 64%)',
};
export const color_f_50: StyleVariable = {
	name: 'color_f_50',
	light: 'hsl(var(--hue_f) 60% 26%)',
	dark: 'hsl(var(--hue_f) 30% 56%)',
};
export const color_f_60: StyleVariable = {
	name: 'color_f_60',
	light: 'hsl(var(--hue_f) 65% 18%)',
	dark: 'hsl(var(--hue_f) 40% 44%)',
};
export const color_f_70: StyleVariable = {
	name: 'color_f_70',
	light: 'hsl(var(--hue_f) 70% 14%)',
	dark: 'hsl(var(--hue_f) 50% 31%)',
};
export const color_f_80: StyleVariable = {
	name: 'color_f_80',
	light: 'hsl(var(--hue_f) 75% 10%)',
	dark: 'hsl(var(--hue_f) 70% 19%)',
};
export const color_f_90: StyleVariable = {
	name: 'color_f_90',
	light: 'hsl(var(--hue_f) 80% 6%)',
};
export const color_f_95: StyleVariable = {
	name: 'color_f_95',
	light: 'hsl(var(--hue_f) 82% 3%)',
	dark: 'hsl(var(--hue_f) 75% 10%)',
};
export const color_g_05: StyleVariable = {
	name: 'color_g_05',
	light: 'hsl(var(--hue_g) 74% 95%)',
	dark: 'hsl(var(--hue_g) 74% 90%)',
};
export const color_g_10: StyleVariable = {
	name: 'color_g_10',
	light: 'hsl(var(--hue_g) 72% 91%)',
};
export const color_g_20: StyleVariable = {
	name: 'color_g_20',
	light: 'hsl(var(--hue_g) 72% 83%)',
	dark: 'hsl(var(--hue_g) 72% 86%)',
};
export const color_g_30: StyleVariable = {
	name: 'color_g_30',
	light: 'hsl(var(--hue_g) 72% 74%)',
	dark: 'hsl(var(--hue_g) 72% 81%)',
};
export const color_g_40: StyleVariable = {
	name: 'color_g_40',
	light: 'hsl(var(--hue_g) 72% 65%)',
	dark: 'hsl(var(--hue_g) 72% 76%)',
};
export const color_g_50: StyleVariable = {
	name: 'color_g_50',
	light: 'hsl(var(--hue_g) 72% 56%)',
	dark: 'hsl(var(--hue_g) 72% 70%)',
};
export const color_g_60: StyleVariable = {
	name: 'color_g_60',
	light: 'hsl(var(--hue_g) 72% 44%)',
	dark: 'hsl(var(--hue_g) 72% 55%)',
};
export const color_g_70: StyleVariable = {
	name: 'color_g_70',
	light: 'hsl(var(--hue_g) 72% 32%)',
	dark: 'hsl(var(--hue_g) 72% 40%)',
};
export const color_g_80: StyleVariable = {
	name: 'color_g_80',
	light: 'hsl(var(--hue_g) 72% 20%)',
	dark: 'hsl(var(--hue_g) 72% 25%)',
};
export const color_g_90: StyleVariable = {
	name: 'color_g_90',
	light: 'hsl(var(--hue_g) 72% 10%)',
};
export const color_g_95: StyleVariable = {
	name: 'color_g_95',
	light: 'hsl(var(--hue_g) 72% 5%)',
	dark: 'hsl(var(--hue_g) 72% 12%)',
};
export const color_h_05: StyleVariable = {
	name: 'color_h_05',
	light: 'hsl(var(--hue_h) 92% 95%)',
	dark: 'hsl(var(--hue_h) 92% 90%)',
};
export const color_h_10: StyleVariable = {
	name: 'color_h_10',
	light: 'hsl(var(--hue_h) 90% 91%)',
};
export const color_h_20: StyleVariable = {
	name: 'color_h_20',
	light: 'hsl(var(--hue_h) 90% 82%)',
	dark: 'hsl(var(--hue_h) 90% 86%)',
};
export const color_h_30: StyleVariable = {
	name: 'color_h_30',
	light: 'hsl(var(--hue_h) 90% 72%)',
	dark: 'hsl(var(--hue_h) 90% 81%)',
};
export const color_h_40: StyleVariable = {
	name: 'color_h_40',
	light: 'hsl(var(--hue_h) 90% 62%)',
	dark: 'hsl(var(--hue_h) 90% 74%)',
};
export const color_h_50: StyleVariable = {
	name: 'color_h_50',
	light: 'hsl(var(--hue_h) 90% 50%)',
	dark: 'hsl(var(--hue_h) 90% 63%)',
};
export const color_h_60: StyleVariable = {
	name: 'color_h_60',
	light: 'hsl(var(--hue_h) 90% 40%)',
	dark: 'hsl(var(--hue_h) 90% 55%)',
};
export const color_h_70: StyleVariable = {
	name: 'color_h_70',
	light: 'hsl(var(--hue_h) 90% 30%)',
	dark: 'hsl(var(--hue_h) 90% 40%)',
};
export const color_h_80: StyleVariable = {
	name: 'color_h_80',
	light: 'hsl(var(--hue_h) 90% 20%)',
	dark: 'hsl(var(--hue_h) 90% 25%)',
};
export const color_h_90: StyleVariable = {
	name: 'color_h_90',
	light: 'hsl(var(--hue_h) 90% 10%)',
};
export const color_h_95: StyleVariable = {
	name: 'color_h_95',
	light: 'hsl(var(--hue_h) 90% 5%)',
	dark: 'hsl(var(--hue_h) 90% 12%)',
};
export const color_i_05: StyleVariable = {
	name: 'color_i_05',
	light: 'hsl(var(--hue_i) 77% 94%)',
	dark: 'hsl(var(--hue_i) 77% 87%)',
};
export const color_i_10: StyleVariable = {
	name: 'color_i_10',
	light: 'hsl(var(--hue_i) 75% 89%)',
};
export const color_i_20: StyleVariable = {
	name: 'color_i_20',
	light: 'hsl(var(--hue_i) 75% 77%)',
	dark: 'hsl(var(--hue_i) 75% 82%)',
};
export const color_i_30: StyleVariable = {
	name: 'color_i_30',
	light: 'hsl(var(--hue_i) 75% 60%)',
	dark: 'hsl(var(--hue_i) 75% 75%)',
};
export const color_i_40: StyleVariable = {
	name: 'color_i_40',
	light: 'hsl(var(--hue_i) 75% 47%)',
	dark: 'hsl(var(--hue_i) 75% 68%)',
};
export const color_i_50: StyleVariable = {
	name: 'color_i_50',
	light: 'hsl(var(--hue_i) 75% 40%)',
	dark: 'hsl(var(--hue_i) 75% 60%)',
};
export const color_i_60: StyleVariable = {
	name: 'color_i_60',
	light: 'hsl(var(--hue_i) 75% 33%)',
	dark: 'hsl(var(--hue_i) 75% 48%)',
};
export const color_i_70: StyleVariable = {
	name: 'color_i_70',
	light: 'hsl(var(--hue_i) 75% 25%)',
	dark: 'hsl(var(--hue_i) 75% 40%)',
};
export const color_i_80: StyleVariable = {
	name: 'color_i_80',
	light: 'hsl(var(--hue_i) 75% 18%)',
	dark: 'hsl(var(--hue_i) 75% 25%)',
};
export const color_i_90: StyleVariable = {
	name: 'color_i_90',
	light: 'hsl(var(--hue_i) 75% 10%)',
};
export const color_i_95: StyleVariable = {
	name: 'color_i_95',
	light: 'hsl(var(--hue_i) 75% 5%)',
	dark: 'hsl(var(--hue_i) 75% 12%)',
};
export const color_j_05: StyleVariable = {
	name: 'color_j_05',
	light: 'hsl(var(--hue_j) 62% 94%)',
	dark: 'hsl(var(--hue_j) 62% 87%)',
};
export const color_j_10: StyleVariable = {
	name: 'color_j_10',
	light: 'hsl(var(--hue_j) 60% 89%)',
};
export const color_j_20: StyleVariable = {
	name: 'color_j_20',
	light: 'hsl(var(--hue_j) 58% 77%)',
	dark: 'hsl(var(--hue_j) 58% 82%)',
};
export const color_j_30: StyleVariable = {
	name: 'color_j_30',
	light: 'hsl(var(--hue_j) 55% 60%)',
	dark: 'hsl(var(--hue_j) 55% 75%)',
};
export const color_j_40: StyleVariable = {
	name: 'color_j_40',
	light: 'hsl(var(--hue_j) 55% 47%)',
	dark: 'hsl(var(--hue_j) 55% 68%)',
};
export const color_j_50: StyleVariable = {
	name: 'color_j_50',
	light: 'hsl(var(--hue_j) 55% 40%)',
	dark: 'hsl(var(--hue_j) 55% 60%)',
};
export const color_j_60: StyleVariable = {
	name: 'color_j_60',
	light: 'hsl(var(--hue_j) 60% 33%)',
	dark: 'hsl(var(--hue_j) 60% 48%)',
};
export const color_j_70: StyleVariable = {
	name: 'color_j_70',
	light: 'hsl(var(--hue_j) 65% 25%)',
	dark: 'hsl(var(--hue_j) 65% 40%)',
};
export const color_j_80: StyleVariable = {
	name: 'color_j_80',
	light: 'hsl(var(--hue_j) 70% 18%)',
	dark: 'hsl(var(--hue_j) 70% 25%)',
};
export const color_j_90: StyleVariable = {
	name: 'color_j_90',
	light: 'hsl(var(--hue_j) 75% 10%)',
};
export const color_j_95: StyleVariable = {
	name: 'color_j_95',
	light: 'hsl(var(--hue_j) 78% 5%)',
	dark: 'hsl(var(--hue_j) 78% 12%)',
};

/*

tint colors

*/
// TODO change/delete this?
export const tint_hue: StyleVariable = {name: 'tint_hue', light: 'var(--hue_f)'};
export const tint_saturation: StyleVariable = {name: 'tint_saturation', light: '11%'};

/*

shade scale - the primary system for backgrounds and surfaces

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
export const shade_00: StyleVariable = {
	name: 'shade_00',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const shade_05: StyleVariable = {
	name: 'shade_05',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 94%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 10%)',
};
export const shade_10: StyleVariable = {
	name: 'shade_10',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
};
export const shade_20: StyleVariable = {
	name: 'shade_20',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 22%)',
};
export const shade_30: StyleVariable = {
	name: 'shade_30',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 72%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 30%)',
};
export const shade_40: StyleVariable = {
	name: 'shade_40',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 62%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 40%)',
};
export const shade_50: StyleVariable = {
	name: 'shade_50',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 50%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 50%)',
};
export const shade_60: StyleVariable = {
	name: 'shade_60',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 40%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 62%)',
};
export const shade_70: StyleVariable = {
	name: 'shade_70',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 30%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 72%)',
};
export const shade_80: StyleVariable = {
	name: 'shade_80',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 22%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
};
export const shade_90: StyleVariable = {
	name: 'shade_90',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const shade_95: StyleVariable = {
	name: 'shade_95',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 10%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 94%)',
};
export const shade_100: StyleVariable = {
	name: 'shade_100',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};
// Semantic alias for the base surface
export const surface: StyleVariable = {
	name: 'surface',
	light: 'var(--shade_00)',
};

/*

text colors - flipped scale where low numbers = subtle, high numbers = bold

*/
/* text colors don't use alpha because it affects performance too much */
export const text_color: StyleVariable = {name: 'text_color', light: 'var(--text_80)'};
// text_05: very faint, near-surface (watermarks, ghost text)
export const text_05: StyleVariable = {
	name: 'text_05',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 98%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
};
// text_10: very subtle (old text_color_9 values)
export const text_10: StyleVariable = {
	name: 'text_10',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 12%)',
};
// text_20: subtle (old text_color_8 values)
export const text_20: StyleVariable = {
	name: 'text_20',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 22%)',
};
// text_30: (old text_color_7 values)
export const text_30: StyleVariable = {
	name: 'text_30',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 68%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 30%)',
};
// text_40: (old text_color_6 values)
export const text_40: StyleVariable = {
	name: 'text_40',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 59%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 40%)',
};
// text_50: mid-range (old text_color_5 values)
export const text_50: StyleVariable = {
	name: 'text_50',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 50%)',
};
// text_60: (old text_color_4 values)
export const text_60: StyleVariable = {
	name: 'text_60',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 41%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 58%)',
};
// text_70: (old text_color_3 values)
export const text_70: StyleVariable = {
	name: 'text_70',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 32%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 69%)',
};
// text_80: default body text (old text_color_2 values)
export const text_80: StyleVariable = {
	name: 'text_80',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 80%)',
};
// text_90: very prominent (old text_color_1 values)
export const text_90: StyleVariable = {
	name: 'text_90',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
// text_95: near-ink, highest emphasis
export const text_95: StyleVariable = {
	name: 'text_95',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 4%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
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
		'var(--shadow_inset_bottom_xs) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_1), transparent), var(--shadow_inset_top_xs) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_1), transparent)',
	dark: 'var(--shadow_inset_top_xs) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_1), transparent), var(--shadow_inset_bottom_xs) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_1), transparent)',
};
export const button_shadow_hover: StyleVariable = {
	name: 'button_shadow_hover',
	light:
		'var(--shadow_inset_bottom_sm) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_2), transparent), var(--shadow_inset_top_sm) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_2), transparent)',
	dark: 'var(--shadow_inset_top_sm) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_2), transparent), var(--shadow_inset_bottom_sm) color-mix(in hsl, var(--shadow_color_highlight) var(--shadow_alpha_2), transparent)',
};
export const button_shadow_active: StyleVariable = {
	name: 'button_shadow_active',
	light: button_shadow_hover.dark,
	dark: button_shadow_hover.light,
};

/* inputs */
export const input_fill: StyleVariable = {name: 'input_fill', light: 'var(--shade_min)'};
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
export const shadow_alpha_1: StyleVariable = {
	name: 'shadow_alpha_1',
	light: '20%',
};
export const shadow_alpha_2: StyleVariable = {
	name: 'shadow_alpha_2',
	light: '30%',
};
export const shadow_alpha_3: StyleVariable = {
	name: 'shadow_alpha_3',
	light: '40%',
};
export const shadow_alpha_4: StyleVariable = {
	name: 'shadow_alpha_4',
	light: '60%',
};
export const shadow_alpha_5: StyleVariable = {
	name: 'shadow_alpha_5',
	light: '80%',
};

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
	surface,

	/* text colors don't use alpha because it affects performance too much */
	text_color,
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
	shadow_alpha_1,
	shadow_alpha_2,
	shadow_alpha_3,
	shadow_alpha_4,
	shadow_alpha_5,

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
