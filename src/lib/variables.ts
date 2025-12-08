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
export const color_a_1: StyleVariable = {
	name: 'color_a_1',
	light: 'hsl(var(--hue_a) 65% 91%)',
};
export const color_a_2: StyleVariable = {
	name: 'color_a_2',
	light: 'hsl(var(--hue_a) 62% 84%)',
	dark: 'hsl(var(--hue_a) 62% 84%)',
};
export const color_a_3: StyleVariable = {
	name: 'color_a_3',
	light: 'hsl(var(--hue_a) 60% 73%)',
	dark: 'hsl(var(--hue_a) 60% 76%)',
};
export const color_a_4: StyleVariable = {
	name: 'color_a_4',
	light: 'hsl(var(--hue_a) 60% 62%)',
	dark: 'hsl(var(--hue_a) 60% 72%)',
};
export const color_a_5: StyleVariable = {
	name: 'color_a_5',
	light: 'hsl(var(--hue_a) 55% 50%)',
	dark: 'hsl(var(--hue_a) 55% 65%)',
};
export const color_a_6: StyleVariable = {
	name: 'color_a_6',
	light: 'hsl(var(--hue_a) 55% 40%)',
	dark: 'hsl(var(--hue_a) 55% 52%)',
};
export const color_a_7: StyleVariable = {
	name: 'color_a_7',
	light: 'hsl(var(--hue_a) 55% 30%)',
	dark: 'hsl(var(--hue_a) 55% 40%)',
};
export const color_a_8: StyleVariable = {
	name: 'color_a_8',
	light: 'hsl(var(--hue_a) 55% 20%)',
	dark: 'hsl(var(--hue_a) 55% 25%)',
};
export const color_a_9: StyleVariable = {
	name: 'color_a_9',
	light: 'hsl(var(--hue_a) 55% 10%)',
};
export const color_b_1: StyleVariable = {
	name: 'color_b_1',
	light: 'hsl(var(--hue_b) 55% 90%)',
};
export const color_b_2: StyleVariable = {
	name: 'color_b_2',
	light: 'hsl(var(--hue_b) 50% 77%)',
	dark: 'hsl(var(--hue_b) 50% 82%)',
};
export const color_b_3: StyleVariable = {
	name: 'color_b_3',
	light: 'hsl(var(--hue_b) 50% 63%)',
	dark: 'hsl(var(--hue_b) 50% 74%)',
};
export const color_b_4: StyleVariable = {
	name: 'color_b_4',
	light: 'hsl(var(--hue_b) 50% 49%)',
	dark: 'hsl(var(--hue_b) 50% 66%)',
};
export const color_b_5: StyleVariable = {
	name: 'color_b_5',
	light: 'hsl(var(--hue_b) 55% 36%)',
	dark: 'hsl(var(--hue_b) 43% 58%)',
};
export const color_b_6: StyleVariable = {
	name: 'color_b_6',
	light: 'hsl(var(--hue_b) 60% 25%)',
	dark: 'hsl(var(--hue_b) 51% 45%)',
};
export const color_b_7: StyleVariable = {
	name: 'color_b_7',
	light: 'hsl(var(--hue_b) 65% 18%)',
	dark: 'hsl(var(--hue_b) 59% 33%)',
};
export const color_b_8: StyleVariable = {
	name: 'color_b_8',
	light: 'hsl(var(--hue_b) 70% 12%)',
	dark: 'hsl(var(--hue_b) 67% 20%)',
};
export const color_b_9: StyleVariable = {
	name: 'color_b_9',
	light: 'hsl(var(--hue_b) 75% 7%)',
};
export const color_c_1: StyleVariable = {
	name: 'color_c_1',
	light: 'hsl(var(--hue_c) 85% 92%)',
};
export const color_c_2: StyleVariable = {
	name: 'color_c_2',
	light: 'hsl(var(--hue_c) 80% 84%)',
	dark: 'hsl(var(--hue_c) 81% 84%)',
};
export const color_c_3: StyleVariable = {
	name: 'color_c_3',
	light: 'hsl(var(--hue_c) 75% 73%)',
	dark: 'hsl(var(--hue_c) 78% 74%)',
};
export const color_c_4: StyleVariable = {
	name: 'color_c_4',
	light: 'hsl(var(--hue_c) 70% 63%)',
	dark: 'hsl(var(--hue_c) 74% 65%)',
};
export const color_c_5: StyleVariable = {
	name: 'color_c_5',
	light: 'hsl(var(--hue_c) 65% 50%)',
	dark: 'hsl(var(--hue_c) 70% 56%)',
};
export const color_c_6: StyleVariable = {
	name: 'color_c_6',
	light: 'hsl(var(--hue_c) 65% 40%)',
	dark: 'hsl(var(--hue_c) 65% 45%)',
};
export const color_c_7: StyleVariable = {
	name: 'color_c_7',
	light: 'hsl(var(--hue_c) 65% 30%)',
	dark: 'hsl(var(--hue_c) 65% 33%)',
};
export const color_c_8: StyleVariable = {
	name: 'color_c_8',
	light: 'hsl(var(--hue_c) 65% 20%)',
	dark: 'hsl(var(--hue_c) 65% 22%)',
};
export const color_c_9: StyleVariable = {
	name: 'color_c_9',
	light: 'hsl(var(--hue_c) 65% 10%)',
};
export const color_d_1: StyleVariable = {
	name: 'color_d_1',
	light: 'hsl(var(--hue_d) 50% 91%)',
};
export const color_d_2: StyleVariable = {
	name: 'color_d_2',
	light: 'hsl(var(--hue_d) 50% 82%)',
	dark: 'hsl(var(--hue_d) 50% 82%)',
};
export const color_d_3: StyleVariable = {
	name: 'color_d_3',
	light: 'hsl(var(--hue_d) 50% 72%)',
	dark: 'hsl(var(--hue_d) 50% 75%)',
};
export const color_d_4: StyleVariable = {
	name: 'color_d_4',
	light: 'hsl(var(--hue_d) 50% 62%)',
	dark: 'hsl(var(--hue_d) 50% 70%)',
};
export const color_d_5: StyleVariable = {
	name: 'color_d_5',
	light: 'hsl(var(--hue_d) 50% 50%)',
	dark: 'hsl(var(--hue_d) 50% 62%)',
};
export const color_d_6: StyleVariable = {
	name: 'color_d_6',
	light: 'hsl(var(--hue_d) 50% 40%)',
	dark: 'hsl(var(--hue_d) 50% 52%)',
};
export const color_d_7: StyleVariable = {
	name: 'color_d_7',
	light: 'hsl(var(--hue_d) 50% 30%)',
	dark: 'hsl(var(--hue_d) 50% 40%)',
};
export const color_d_8: StyleVariable = {
	name: 'color_d_8',
	light: 'hsl(var(--hue_d) 50% 20%)',
	dark: 'hsl(var(--hue_d) 50% 25%)',
};
export const color_d_9: StyleVariable = {
	name: 'color_d_9',
	light: 'hsl(var(--hue_d) 50% 10%)',
};
export const color_e_1: StyleVariable = {
	name: 'color_e_1',
	light: 'hsl(var(--hue_e) 85% 91%)',
};
export const color_e_2: StyleVariable = {
	name: 'color_e_2',
	light: 'hsl(var(--hue_e) 80% 79%)',
	dark: 'hsl(var(--hue_e) 80% 83%)',
};
export const color_e_3: StyleVariable = {
	name: 'color_e_3',
	light: 'hsl(var(--hue_e) 75% 65%)',
	dark: 'hsl(var(--hue_e) 75% 76%)',
};
export const color_e_4: StyleVariable = {
	name: 'color_e_4',
	light: 'hsl(var(--hue_e) 70% 50%)',
	dark: 'hsl(var(--hue_e) 70% 69%)',
};
export const color_e_5: StyleVariable = {
	name: 'color_e_5',
	light: 'hsl(var(--hue_e) 65% 41%)',
	dark: 'hsl(var(--hue_e) 70% 62%)',
};
export const color_e_6: StyleVariable = {
	name: 'color_e_6',
	light: 'hsl(var(--hue_e) 70% 34%)',
	dark: 'hsl(var(--hue_e) 70% 49%)',
};
export const color_e_7: StyleVariable = {
	name: 'color_e_7',
	light: 'hsl(var(--hue_e) 75% 26%)',
	dark: 'hsl(var(--hue_e) 75% 36%)',
};
export const color_e_8: StyleVariable = {
	name: 'color_e_8',
	light: 'hsl(var(--hue_e) 80% 18%)',
	dark: 'hsl(var(--hue_e) 80% 23%)',
};
export const color_e_9: StyleVariable = {
	name: 'color_e_9',
	light: 'hsl(var(--hue_e) 85% 10%)',
};
export const color_f_1: StyleVariable = {
	name: 'color_f_1',
	light: 'hsl(var(--hue_f) 32% 87%)',
};
export const color_f_2: StyleVariable = {
	name: 'color_f_2',
	light: 'hsl(var(--hue_f) 32% 72%)',
	dark: 'hsl(var(--hue_f) 32% 79%)',
};
export const color_f_3: StyleVariable = {
	name: 'color_f_3',
	light: 'hsl(var(--hue_f) 32% 57%)',
	dark: 'hsl(var(--hue_f) 32% 72%)',
};
export const color_f_4: StyleVariable = {
	name: 'color_f_4',
	light: 'hsl(var(--hue_f) 42% 41%)',
	dark: 'hsl(var(--hue_f) 32% 64%)',
};
export const color_f_5: StyleVariable = {
	name: 'color_f_5',
	light: 'hsl(var(--hue_f) 60% 26%)',
	dark: 'hsl(var(--hue_f) 30% 56%)',
};
export const color_f_6: StyleVariable = {
	name: 'color_f_6',
	light: 'hsl(var(--hue_f) 65% 18%)',
	dark: 'hsl(var(--hue_f) 40% 44%)',
};
export const color_f_7: StyleVariable = {
	name: 'color_f_7',
	light: 'hsl(var(--hue_f) 70% 14%)',
	dark: 'hsl(var(--hue_f) 50% 31%)',
};
export const color_f_8: StyleVariable = {
	name: 'color_f_8',
	light: 'hsl(var(--hue_f) 75% 10%)',
	dark: 'hsl(var(--hue_f) 70% 19%)',
};
export const color_f_9: StyleVariable = {
	name: 'color_f_9',
	light: 'hsl(var(--hue_f) 80% 6%)',
};
export const color_g_1: StyleVariable = {
	name: 'color_g_1',
	light: 'hsl(var(--hue_g) 72% 91%)',
};
export const color_g_2: StyleVariable = {
	name: 'color_g_2',
	light: 'hsl(var(--hue_g) 72% 83%)',
	dark: 'hsl(var(--hue_g) 72% 86%)',
};
export const color_g_3: StyleVariable = {
	name: 'color_g_3',
	light: 'hsl(var(--hue_g) 72% 74%)',
	dark: 'hsl(var(--hue_g) 72% 81%)',
};
export const color_g_4: StyleVariable = {
	name: 'color_g_4',
	light: 'hsl(var(--hue_g) 72% 65%)',
	dark: 'hsl(var(--hue_g) 72% 76%)',
};
export const color_g_5: StyleVariable = {
	name: 'color_g_5',
	light: 'hsl(var(--hue_g) 72% 56%)',
	dark: 'hsl(var(--hue_g) 72% 70%)',
};
export const color_g_6: StyleVariable = {
	name: 'color_g_6',
	light: 'hsl(var(--hue_g) 72% 44%)',
	dark: 'hsl(var(--hue_g) 72% 55%)',
};
export const color_g_7: StyleVariable = {
	name: 'color_g_7',
	light: 'hsl(var(--hue_g) 72% 32%)',
	dark: 'hsl(var(--hue_g) 72% 40%)',
};
export const color_g_8: StyleVariable = {
	name: 'color_g_8',
	light: 'hsl(var(--hue_g) 72% 20%)',
	dark: 'hsl(var(--hue_g) 72% 25%)',
};
export const color_g_9: StyleVariable = {
	name: 'color_g_9',
	light: 'hsl(var(--hue_g) 72% 10%)',
};
export const color_h_1: StyleVariable = {
	name: 'color_h_1',
	light: 'hsl(var(--hue_h) 90% 91%)',
};
export const color_h_2: StyleVariable = {
	name: 'color_h_2',
	light: 'hsl(var(--hue_h) 90% 82%)',
	dark: 'hsl(var(--hue_h) 90% 86%)',
};
export const color_h_3: StyleVariable = {
	name: 'color_h_3',
	light: 'hsl(var(--hue_h) 90% 72%)',
	dark: 'hsl(var(--hue_h) 90% 81%)',
};
export const color_h_4: StyleVariable = {
	name: 'color_h_4',
	light: 'hsl(var(--hue_h) 90% 62%)',
	dark: 'hsl(var(--hue_h) 90% 74%)',
};
export const color_h_5: StyleVariable = {
	name: 'color_h_5',
	light: 'hsl(var(--hue_h) 90% 50%)',
	dark: 'hsl(var(--hue_h) 90% 63%)',
};
export const color_h_6: StyleVariable = {
	name: 'color_h_6',
	light: 'hsl(var(--hue_h) 90% 40%)',
	dark: 'hsl(var(--hue_h) 90% 55%)',
};
export const color_h_7: StyleVariable = {
	name: 'color_h_7',
	light: 'hsl(var(--hue_h) 90% 30%)',
	dark: 'hsl(var(--hue_h) 90% 40%)',
};
export const color_h_8: StyleVariable = {
	name: 'color_h_8',
	light: 'hsl(var(--hue_h) 90% 20%)',
	dark: 'hsl(var(--hue_h) 90% 25%)',
};
export const color_h_9: StyleVariable = {
	name: 'color_h_9',
	light: 'hsl(var(--hue_h) 90% 10%)',
};
export const color_i_1: StyleVariable = {
	name: 'color_i_1',
	light: 'hsl(var(--hue_i) 75% 89%)',
};
export const color_i_2: StyleVariable = {
	name: 'color_i_2',
	light: 'hsl(var(--hue_i) 75% 77%)',
	dark: 'hsl(var(--hue_i) 75% 82%)',
};
export const color_i_3: StyleVariable = {
	name: 'color_i_3',
	light: 'hsl(var(--hue_i) 75% 60%)',
	dark: 'hsl(var(--hue_i) 75% 75%)',
};
export const color_i_4: StyleVariable = {
	name: 'color_i_4',
	light: 'hsl(var(--hue_i) 75% 47%)',
	dark: 'hsl(var(--hue_i) 75% 68%)',
};
export const color_i_5: StyleVariable = {
	name: 'color_i_5',
	light: 'hsl(var(--hue_i) 75% 40%)',
	dark: 'hsl(var(--hue_i) 75% 60%)',
};
export const color_i_6: StyleVariable = {
	name: 'color_i_6',
	light: 'hsl(var(--hue_i) 75% 33%)',
	dark: 'hsl(var(--hue_i) 75% 48%)',
};
export const color_i_7: StyleVariable = {
	name: 'color_i_7',
	light: 'hsl(var(--hue_i) 75% 25%)',
	dark: 'hsl(var(--hue_i) 75% 40%)',
};
export const color_i_8: StyleVariable = {
	name: 'color_i_8',
	light: 'hsl(var(--hue_i) 75% 18%)',
	dark: 'hsl(var(--hue_i) 75% 25%)',
};
export const color_i_9: StyleVariable = {
	name: 'color_i_9',
	light: 'hsl(var(--hue_i) 75% 10%)',
};
export const color_j_1: StyleVariable = {
	name: 'color_j_1',
	light: 'hsl(var(--hue_j) 60% 89%)',
};
export const color_j_2: StyleVariable = {
	name: 'color_j_2',
	light: 'hsl(var(--hue_j) 58% 77%)',
	dark: 'hsl(var(--hue_j) 58% 82%)',
};
export const color_j_3: StyleVariable = {
	name: 'color_j_3',
	light: 'hsl(var(--hue_j) 55% 60%)',
	dark: 'hsl(var(--hue_j) 55% 75%)',
};
export const color_j_4: StyleVariable = {
	name: 'color_j_4',
	light: 'hsl(var(--hue_j) 55% 47%)',
	dark: 'hsl(var(--hue_j) 55% 68%)',
};
export const color_j_5: StyleVariable = {
	name: 'color_j_5',
	light: 'hsl(var(--hue_j) 55% 40%)',
	dark: 'hsl(var(--hue_j) 55% 60%)',
};
export const color_j_6: StyleVariable = {
	name: 'color_j_6',
	light: 'hsl(var(--hue_j) 60% 33%)',
	dark: 'hsl(var(--hue_j) 60% 48%)',
};
export const color_j_7: StyleVariable = {
	name: 'color_j_7',
	light: 'hsl(var(--hue_j) 65% 25%)',
	dark: 'hsl(var(--hue_j) 65% 40%)',
};
export const color_j_8: StyleVariable = {
	name: 'color_j_8',
	light: 'hsl(var(--hue_j) 70% 18%)',
	dark: 'hsl(var(--hue_j) 70% 25%)',
};
export const color_j_9: StyleVariable = {
	name: 'color_j_9',
	light: 'hsl(var(--hue_j) 75% 10%)',
};

/*

tint colors

*/
// TODO change/delete this?
export const tint_hue: StyleVariable = {name: 'tint_hue', light: 'var(--hue_f)'};
export const tint_saturation: StyleVariable = {name: 'tint_saturation', light: '11%'};

/*

shading - using these usually means handling both light and dark modes separately -
the semantic variants	that handle `color-schema` automatically include `--bg_1` and `--bg_2`

*/
// TODO some of these may be too subtle, but there may be cases where it's needed so keeping them for now
// TODO no tint here? is that best?
export const darken_1: StyleVariable = {name: 'darken_1', light: '#0000000f', summary: '6%'};
export const darken_2: StyleVariable = {name: 'darken_2', light: '#0000001f', summary: '12%'};
export const darken_3: StyleVariable = {name: 'darken_3', light: '#00000036', summary: '21%'};
export const darken_4: StyleVariable = {name: 'darken_4', light: '#00000052', summary: '32%'};
export const darken_5: StyleVariable = {name: 'darken_5', light: '#00000073', summary: '45%'};
export const darken_6: StyleVariable = {name: 'darken_6', light: '#000000a6', summary: '65%'};
export const darken_7: StyleVariable = {name: 'darken_7', light: '#000000cc', summary: '80%'};
export const darken_8: StyleVariable = {name: 'darken_8', light: '#000000e3', summary: '89%'};
export const darken_9: StyleVariable = {name: 'darken_9', light: '#000000f5', summary: '96%'};
export const lighten_1: StyleVariable = {name: 'lighten_1', light: '#ffffff0f', summary: '6%'};
export const lighten_2: StyleVariable = {name: 'lighten_2', light: '#ffffff1f', summary: '12%'};
export const lighten_3: StyleVariable = {name: 'lighten_3', light: '#ffffff36', summary: '21%'};
export const lighten_4: StyleVariable = {name: 'lighten_4', light: '#ffffff52', summary: '32%'};
export const lighten_5: StyleVariable = {name: 'lighten_5', light: '#ffffff73', summary: '45%'};
export const lighten_6: StyleVariable = {name: 'lighten_6', light: '#ffffffa6', summary: '65%'};
export const lighten_7: StyleVariable = {name: 'lighten_7', light: '#ffffffcc', summary: '80%'};
export const lighten_8: StyleVariable = {name: 'lighten_8', light: '#ffffffe3', summary: '89%'};
export const lighten_9: StyleVariable = {name: 'lighten_9', light: '#fffffff5', summary: '96%'};

/*

background colors

*/
export const bg: StyleVariable = {
	name: 'bg',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
};
export const fg: StyleVariable = {
	name: 'fg',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 6%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
};
/* these are light or dark with a low alpha, so they nest/stack arbitrarily */
// TODO these inconsistently don't use tint, unlike bg/fg, and if they did they would be roughly equal to text_color_0-10
export const bg_0: StyleVariable = {
	name: 'bg_0',
	light: '#000',
	dark: '#fff',
};
export const bg_1: StyleVariable = {
	name: 'bg_1',
	light: 'var(--lighten_1)',
	dark: 'var(--darken_1)',
};
export const bg_2: StyleVariable = {
	name: 'bg_2',
	light: 'var(--lighten_2)',
	dark: 'var(--darken_2)',
};
export const bg_3: StyleVariable = {
	name: 'bg_3',
	light: 'var(--lighten_3)',
	dark: 'var(--darken_3)',
};
export const bg_4: StyleVariable = {
	name: 'bg_4',
	light: 'var(--lighten_4)',
	dark: 'var(--darken_4)',
};
export const bg_5: StyleVariable = {
	name: 'bg_5',
	light: 'var(--lighten_5)',
	dark: 'var(--darken_5)',
};
export const bg_6: StyleVariable = {
	name: 'bg_6',
	light: 'var(--lighten_6)',
	dark: 'var(--darken_6)',
};
export const bg_7: StyleVariable = {
	name: 'bg_7',
	light: 'var(--lighten_7)',
	dark: 'var(--darken_7)',
};
export const bg_8: StyleVariable = {
	name: 'bg_8',
	light: 'var(--lighten_8)',
	dark: 'var(--darken_8)',
};
export const bg_9: StyleVariable = {
	name: 'bg_9',
	light: 'var(--lighten_9)',
	dark: 'var(--darken_9)',
};
export const bg_10: StyleVariable = {
	name: 'bg_10',
	light: '#fff',
	dark: '#000',
};
export const fg_0: StyleVariable = {
	name: 'fg_0',
	light: '#fff',
	dark: '#000',
};
export const fg_1: StyleVariable = {
	name: 'fg_1',
	light: 'var(--darken_1)',
	dark: 'var(--lighten_1)',
};
export const fg_2: StyleVariable = {
	name: 'fg_2',
	light: 'var(--darken_2)',
	dark: 'var(--lighten_2)',
};
export const fg_3: StyleVariable = {
	name: 'fg_3',
	light: 'var(--darken_3)',
	dark: 'var(--lighten_3)',
};
export const fg_4: StyleVariable = {
	name: 'fg_4',
	light: 'var(--darken_4)',
	dark: 'var(--lighten_4)',
};
export const fg_5: StyleVariable = {
	name: 'fg_5',
	light: 'var(--darken_5)',
	dark: 'var(--lighten_5)',
};
export const fg_6: StyleVariable = {
	name: 'fg_6',
	light: 'var(--darken_6)',
	dark: 'var(--lighten_6)',
};
export const fg_7: StyleVariable = {
	name: 'fg_7',
	light: 'var(--darken_7)',
	dark: 'var(--lighten_7)',
};
export const fg_8: StyleVariable = {
	name: 'fg_8',
	light: 'var(--darken_8)',
	dark: 'var(--lighten_8)',
};
export const fg_9: StyleVariable = {
	name: 'fg_9',
	light: 'var(--darken_9)',
	dark: 'var(--lighten_9)',
};
export const fg_10: StyleVariable = {
	name: 'fg_10',
	light: '#000',
	dark: '#fff',
};

export const fill: StyleVariable = {
	name: 'fill',
	light: 'hsl(var(--tint_hue) 5% 50%)',
};
export const fill_a: StyleVariable = {
	name: 'fill_a',
	light: 'var(--color_a_4)',
	dark: 'var(--color_a_6)',
};
export const fill_b: StyleVariable = {
	name: 'fill_b',
	light: 'var(--color_b_4)',
	dark: 'var(--color_b_6)',
};
export const fill_c: StyleVariable = {
	name: 'fill_c',
	light: 'var(--color_c_4)',
	dark: 'var(--color_c_6)',
};
export const fill_d: StyleVariable = {
	name: 'fill_d',
	light: 'var(--color_d_4)',
	dark: 'var(--color_d_6)',
};
export const fill_e: StyleVariable = {
	name: 'fill_e',
	light: 'var(--color_e_4)',
	dark: 'var(--color_e_6)',
};
export const fill_f: StyleVariable = {
	name: 'fill_f',
	light: 'var(--color_f_4)',
	dark: 'var(--color_f_6)',
};
export const fill_g: StyleVariable = {
	name: 'fill_g',
	light: 'var(--color_g_4)',
	dark: 'var(--color_g_6)',
};
export const fill_h: StyleVariable = {
	name: 'fill_h',
	light: 'var(--color_h_4)',
	dark: 'var(--color_h_6)',
};
export const fill_i: StyleVariable = {
	name: 'fill_i',
	light: 'var(--color_i_4)',
	dark: 'var(--color_i_6)',
};
export const fill_j: StyleVariable = {
	name: 'fill_j',
	light: 'var(--color_j_4)',
	dark: 'var(--color_j_6)',
};

/*

text colors

*/

// TODO is this shorthand a good idea? change to `text_color_N`?
/* text colors don't use alpha because it affects performance too much */
export const text_color: StyleVariable = {name: 'text_color', light: 'var(--text_color_2)'};
export const text_color_0: StyleVariable = {
	name: 'text_color_0',
	light: 'var(--fg_10)',
};
// TODO the problem with this is that saturation doesn't make sense on colored backgrounds, we probably either want no saturation (in which case, just use `fg` variables for text but not transparent?), or a hue variant per color (could set a variable on buttons for example? `--hue: var(--hue_g)` for `.color_g`)
export const text_color_1: StyleVariable = {
	name: 'text_color_1',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
};
export const text_color_2: StyleVariable = {
	name: 'text_color_2',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 80%)',
};
export const text_color_3: StyleVariable = {
	name: 'text_color_3',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 32%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 69%)',
};
export const text_color_4: StyleVariable = {
	name: 'text_color_4',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 41%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 58%)',
};
export const text_color_5: StyleVariable = {
	name: 'text_color_5',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 50%)',
};
export const text_color_6: StyleVariable = {
	name: 'text_color_6',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 59%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 40%)',
};
export const text_color_7: StyleVariable = {
	name: 'text_color_7',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 68%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 30%)',
};
export const text_color_8: StyleVariable = {
	name: 'text_color_8',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 82%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 22%)',
};
export const text_color_9: StyleVariable = {
	name: 'text_color_9',
	light: 'hsl(var(--tint_hue) var(--tint_saturation) 96%)',
	dark: 'hsl(var(--tint_hue) var(--tint_saturation) 12%)',
};
export const text_color_10: StyleVariable = {
	name: 'text_color_10',
	light: 'var(--fg_0)',
};
export const text_color_disabled: StyleVariable = {
	name: 'text_color_disabled',
	light: 'var(--text_color_5)',
};
export const text_active: StyleVariable = {
	name: 'text_active',
	light: 'hsl(var(--hue_a) 55% 40%);',
	dark: 'hsl(var(--hue_a) 65% 65%);',
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
// TODO remove these two generics? composability doesn't work like I wanted, maybe `--border_color_1-5` should be calculated from alpha instead?
export const border_color: StyleVariable = {
	name: 'border_color',
	light: 'var(--border_color_3)',
	// light: 'hsl(var(--tint_hue) 60% 20%)',
	// dark: 'hsl(var(--tint_hue) 60% 80%)',
};
export const border_style: StyleVariable = {
	name: 'border_style',
	light: 'solid',
};
// TODO add tint vars for these?
export const border_color_1: StyleVariable = {
	name: 'border_color_1',
	light: 'hsl(var(--tint_hue) 60% 20% / 15%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 25%)',
};
export const border_color_2: StyleVariable = {
	name: 'border_color_2',
	light: 'hsl(var(--tint_hue) 60% 20% / 25%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 40%)',
};
export const border_color_3: StyleVariable = {
	name: 'border_color_3',
	light: 'hsl(var(--tint_hue) 60% 20% / 35%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 55%)',
};
export const border_color_4: StyleVariable = {
	name: 'border_color_4',
	light: 'hsl(var(--tint_hue) 60% 20% / 50%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 70%)',
};
export const border_color_5: StyleVariable = {
	name: 'border_color_5',
	light: 'hsl(var(--tint_hue) 60% 20% / 70%)',
	dark: 'hsl(var(--tint_hue) 60% 80% / 85%)',
};
// TODO having these for theming seems wise, right? but then we'd want variants, like 1-3 or 1-5?
export const border_color_a: StyleVariable = {
	name: 'border_color_a',
	light: 'var(--color_a_5)',
};
export const border_color_b: StyleVariable = {
	name: 'border_color_b',
	light: 'var(--color_b_5)',
};
export const border_color_c: StyleVariable = {
	name: 'border_color_c',
	light: 'var(--color_c_5)',
};
export const border_color_d: StyleVariable = {
	name: 'border_color_d',
	light: 'var(--color_d_5)',
};
export const border_color_e: StyleVariable = {
	name: 'border_color_e',
	light: 'var(--color_e_5)',
};
export const border_color_f: StyleVariable = {
	name: 'border_color_f',
	light: 'var(--color_f_5)',
};
export const border_color_g: StyleVariable = {
	name: 'border_color_g',
	light: 'var(--color_g_5)',
};
export const border_color_h: StyleVariable = {
	name: 'border_color_h',
	light: 'var(--color_h_5)',
};
export const border_color_i: StyleVariable = {
	name: 'border_color_i',
	light: 'var(--color_i_5)',
};
export const border_color_j: StyleVariable = {
	name: 'border_color_j',
	light: 'var(--color_j_5)',
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
	light: 'var(--border_color_a)',
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
export const input_fill: StyleVariable = {name: 'input_fill', light: 'var(--bg_10)'};
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
export const shadow_color_a: StyleVariable = {
	name: 'shadow_color_a',
	light: 'var(--color_a_6)',
	dark: 'var(--color_a_4)',
};
export const shadow_color_b: StyleVariable = {
	name: 'shadow_color_b',
	light: 'var(--color_b_6)',
	dark: 'var(--color_b_4)',
};
export const shadow_color_c: StyleVariable = {
	name: 'shadow_color_c',
	light: 'var(--color_c_6)',
	dark: 'var(--color_c_4)',
};
export const shadow_color_d: StyleVariable = {
	name: 'shadow_color_d',
	light: 'var(--color_d_6)',
	dark: 'var(--color_d_4)',
};
export const shadow_color_e: StyleVariable = {
	name: 'shadow_color_e',
	light: 'var(--color_e_6)',
	dark: 'var(--color_e_4)',
};
export const shadow_color_f: StyleVariable = {
	name: 'shadow_color_f',
	light: 'var(--color_f_6)',
	dark: 'var(--color_f_4)',
};
export const shadow_color_g: StyleVariable = {
	name: 'shadow_color_g',
	light: 'var(--color_g_6)',
	dark: 'var(--color_g_4)',
};
export const shadow_color_h: StyleVariable = {
	name: 'shadow_color_h',
	light: 'var(--color_h_6)',
	dark: 'var(--color_h_4)',
};
export const shadow_color_i: StyleVariable = {
	name: 'shadow_color_i',
	light: 'var(--color_i_6)',
	dark: 'var(--color_i_4)',
};
export const shadow_color_j: StyleVariable = {
	name: 'shadow_color_j',
	light: 'var(--color_j_6)',
	dark: 'var(--color_j_4)',
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
	color_a_1,
	color_a_2,
	color_a_3,
	color_a_4,
	color_a_5,
	color_a_6,
	color_a_7,
	color_a_8,
	color_a_9,
	color_b_1,
	color_b_2,
	color_b_3,
	color_b_4,
	color_b_5,
	color_b_6,
	color_b_7,
	color_b_8,
	color_b_9,
	color_c_1,
	color_c_2,
	color_c_3,
	color_c_4,
	color_c_5,
	color_c_6,
	color_c_7,
	color_c_8,
	color_c_9,
	color_d_1,
	color_d_2,
	color_d_3,
	color_d_4,
	color_d_5,
	color_d_6,
	color_d_7,
	color_d_8,
	color_d_9,
	color_e_1,
	color_e_2,
	color_e_3,
	color_e_4,
	color_e_5,
	color_e_6,
	color_e_7,
	color_e_8,
	color_e_9,
	color_f_1,
	color_f_2,
	color_f_3,
	color_f_4,
	color_f_5,
	color_f_6,
	color_f_7,
	color_f_8,
	color_f_9,
	color_g_1,
	color_g_2,
	color_g_3,
	color_g_4,
	color_g_5,
	color_g_6,
	color_g_7,
	color_g_8,
	color_g_9,
	color_h_1,
	color_h_2,
	color_h_3,
	color_h_4,
	color_h_5,
	color_h_6,
	color_h_7,
	color_h_8,
	color_h_9,
	color_i_1,
	color_i_2,
	color_i_3,
	color_i_4,
	color_i_5,
	color_i_6,
	color_i_7,
	color_i_8,
	color_i_9,
	color_j_1,
	color_j_2,
	color_j_3,
	color_j_4,
	color_j_5,
	color_j_6,
	color_j_7,
	color_j_8,
	color_j_9,

	/* tint colors */
	tint_hue,
	tint_saturation,

	/*
		shading variants - using these usually means handling both light and dark modes separately -
		the semantic variants	that handle `color-schema` automatically include `--bg_1` and `--bg_2`
	*/
	// TODO some of these may be too subtle, but there may be cases where it's needed so keeping them for now
	darken_1,
	darken_2,
	darken_3,
	darken_4,
	darken_5,
	darken_6,
	darken_7,
	darken_8,
	darken_9,
	lighten_1,
	lighten_2,
	lighten_3,
	lighten_4,
	lighten_5,
	lighten_6,
	lighten_7,
	lighten_8,
	lighten_9,

	/* bg colors */
	bg,
	fg,
	/* these are light or dark with a low alpha, so they nest/stack arbitrarily */
	// TODO these inconsistently don't use tint, unlike bg/fg
	bg_0,
	bg_1,
	bg_2,
	bg_3,
	bg_4,
	bg_5,
	bg_6,
	bg_7,
	bg_8,
	bg_9,
	bg_10,
	fg_0,
	fg_1,
	fg_2,
	fg_3,
	fg_4,
	fg_5,
	fg_6,
	fg_7,
	fg_8,
	fg_9,
	fg_10,
	fill,
	fill_a,
	fill_b,
	fill_c,
	fill_d,
	fill_e,
	fill_f,
	fill_g,
	fill_h,
	fill_i,
	fill_j,
	// TODO probably need more variants, 5 total?
	/* text colors don't use alpha because it affects performance too much */
	text_color,
	text_color_0,
	text_color_1,
	text_color_2,
	text_color_3,
	text_color_4,
	text_color_5,
	text_color_6,
	text_color_7,
	text_color_8,
	text_color_9,
	text_color_10,
	text_color_disabled,
	text_active,

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
	// TODO add tint vars for these?
	border_color_1,
	border_color_2,
	border_color_3,
	border_color_4,
	border_color_5,
	border_color_a,
	border_color_b,
	border_color_c,
	border_color_d,
	border_color_e,
	border_color_f,
	border_color_g,
	border_color_h,
	border_color_i,
	border_color_j,
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
	shadow_color_a,
	shadow_color_b,
	shadow_color_c,
	shadow_color_d,
	shadow_color_e,
	shadow_color_f,
	shadow_color_g,
	shadow_color_h,
	shadow_color_i,
	shadow_color_j,
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
