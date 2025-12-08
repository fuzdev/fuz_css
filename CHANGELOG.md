# @fuzdev/fuz_css

## 0.42.1

### Patch Changes

- tweak teal to be slightly less green ([#71](https://github.com/fuzdev/fuz_css/pull/71))

## 0.42.0

### Minor Changes

- rename `gen_fuz_css` from `gen_moss_css` ([7562ced](https://github.com/fuzdev/fuz_css/commit/7562ced))

## 0.41.0

### Minor Changes

- migrate to fuzdev and rename to fuz_css from moss ([#70](https://github.com/fuzdev/fuz_css/pull/70))

### Patch Changes

- fix: add fuz_util as optional peer dep ([#70](https://github.com/fuzdev/fuz_css/pull/70))

## 0.40.0

### Minor Changes

- move to fuzdev and rename to fuz_css from moss ([29efeba](https://github.com/ryanatkn/moss/commit/29efeba))

## 0.39.0

### Minor Changes

- rename `PascalCase` from `Upper_Snake_Case` (lol) ([#69](https://github.com/ryanatkn/moss/pull/69))

## 0.38.0

### Minor Changes

- improve code element styles and remove `.pre` ([#68](https://github.com/ryanatkn/moss/pull/68))

## 0.37.0

### Minor Changes

- improve code element styles and remove `.pre` ([#67](https://github.com/ryanatkn/moss/pull/67))

### Patch Changes

- tweak teal hue to be greener and further from cyan ([9b288f3](https://github.com/ryanatkn/moss/commit/9b288f3))

## 0.36.3

### Patch Changes

- reduce `legend` text soze to lg from xl ([a86caed](https://github.com/ryanatkn/moss/commit/a86caed))

## 0.36.2

### Patch Changes

- fix class sort order ([ff438fd](https://github.com/ryanatkn/moss/commit/ff438fd))

## 0.36.1

### Patch Changes

- remove default fieldset border ([48ec114](https://github.com/ryanatkn/moss/commit/48ec114))
- fix a type import ([88ec26e](https://github.com/ryanatkn/moss/commit/88ec26e))

## 0.36.0

### Minor Changes

- rename utility classes for consistency with CSS declarations ([#66](https://github.com/ryanatkn/moss/pull/66))
  - rename `flex_wrap_wrap` from `flex_wrap`
  - rename `flex_wrap_wrap_reverse` from `flex_wrap_reverse`
  - rename `flex_wrap_nowrap` from `flex_nowrap`
  - rename `flex_direction_row` from `flex_row`
  - rename `flex_direction_row_reverse` from `flex_row_reverse`
  - rename `flex_direction_column` from `flex_column`
  - rename `flex_direction_column_reverse` from `flex_column_reverse`
  - rename `top_N` from `t_N`
  - rename `right_N` from `r_N`
  - rename `bottom_N` from `b_N`
  - rename `left_N` from `l_N`
  - rename `flex_shrink_1` from `shrink`
  - rename `flex_shrink_0` from `shrink_0`
  - rename `flex_grow_1` from `grow`
  - rename `flex_grow_0` from `grow_0`

- expand `generate_classes_css` with support for interpreters ([#66](https://github.com/ryanatkn/moss/pull/66))

## 0.35.0

### Minor Changes

- fix gen CSS watch ([#65](https://github.com/ryanatkn/moss/pull/65))

## 0.34.1

### Patch Changes

- add color j ([#64](https://github.com/ryanatkn/moss/pull/64))

## 0.34.0

### Minor Changes

- default `include_stats` to false in `gen_moss_css` ([#63](https://github.com/ryanatkn/moss/pull/63))

## 0.33.0

### Minor Changes

- remove gro plugin and switch to a gen file for CSS, see `$lib/gen_moss_css.ts` and `$routes/moss.gen.css.ts` ([#62](https://github.com/ryanatkn/moss/pull/62))

## 0.32.0

### Minor Changes

- upgrade deps ([#60](https://github.com/ryanatkn/moss/pull/60))

## 0.31.0

### Minor Changes

- change some classes to be more aligned with the platform ([#58](https://github.com/ryanatkn/moss/pull/58))
  - add `position_` prefix
  - fill out `float_` classes

## 0.30.0

### Minor Changes

- remove `fade_` variables and replace with `opacity_` utility classes and hardcoded values ([#57](https://github.com/ryanatkn/moss/pull/57))

### Patch Changes

- add more CSS utilities aligning with the platform ([#57](https://github.com/ryanatkn/moss/pull/57))

## 0.29.0

### Minor Changes

- bump node@22.15 from 22.11 ([commit](https://github.com/ryanatkn/moss/commit/3c8154b49adfd6bd8295964d22b76c0521b92045)) ([f950917](https://github.com/ryanatkn/moss/commit/f950917))

## 0.28.0

### Minor Changes

- rework some utility classes ([#55](https://github.com/ryanatkn/moss/pull/55))
  - rename `border_$STYLE` variants to `border_style_$STYLE`
  - rename `radius_` variants to `border_radius_`
  - add top/right/bottom/left border radius variants, e.g. `border_top_left_radius`
  - support `.unstyled` on more base elements
  - prefix `font_sans`, `font_serif`, and `font_mono` with `font_family_`
  - prefix display classes with `display_` and
    remove classes `inline|inline_block|inline_flex|inline_grid|block|flex|grid`

## 0.27.0

### Minor Changes

- rework some styles and classes ([#49](https://github.com/ryanatkn/moss/pull/49))
  - rename `--distance_` vars from `--width_`
  - add `border_width_7-9` and change them to default to 1px increments
  - replace `outline_width_1` with `outline_width_0` and remove its variable,
    replace `outline_width_2` with `outline_width_focus`,
    and `outline_width_3` with `outline_width_active`

### Patch Changes

- add basic table styles ([#49](https://github.com/ryanatkn/moss/pull/49))

## 0.26.0

### Minor Changes

- change some base styles to be entirely wrapped in `:where`, reducing specificity, breaking by causing potentially unintended overrides in existing code ([#54](https://github.com/ryanatkn/moss/pull/54))
- remove deprecated `get_sorted_array` in `css_class_helpers.ts` ([#54](https://github.com/ryanatkn/moss/pull/54))

## 0.25.0

### Minor Changes

- bump node@22.11 ([4eec6d6](https://github.com/ryanatkn/moss/commit/4eec6d6))

## 0.24.3

### Patch Changes

- fix CSS class generation sort order ([#51](https://github.com/ryanatkn/moss/pull/51))

## 0.24.2

### Patch Changes

- add cursor styles to `.menu_item` ([c1e71ea](https://github.com/ryanatkn/moss/commit/c1e71ea))

## 0.24.1

### Patch Changes

- add `.menu_item` styles ([455199c](https://github.com/ryanatkn/moss/commit/455199c))

## 0.24.0

### Minor Changes

- break: change `.unstyled` lists to have no `margin-bottom` ([c27315e](https://github.com/ryanatkn/moss/commit/c27315e))

## 0.23.2

### Patch Changes

- add scrollbar-width and scrollbar-gutter css classes ([9d6866d](https://github.com/ryanatkn/moss/commit/9d6866d))

## 0.23.1

### Patch Changes

- add `user-select` css classes ([cc4865b](https://github.com/ryanatkn/moss/commit/cc4865b))

## 0.23.0

### Minor Changes

- add `font_serif` and make it the default for headings ([#50](https://github.com/ryanatkn/moss/pull/50))

### Patch Changes

- add `--size` for `.size_*` classes and `--font_weight` for `.font_weight_*` classes ([#50](https://github.com/ryanatkn/moss/pull/50))
- add `.heading` for h1-6-like behavior ([#50](https://github.com/ryanatkn/moss/pull/50))

## 0.22.5

### Patch Changes

- set border color variable instead of property on `.plain` ([e6efe3e](https://github.com/ryanatkn/moss/commit/e6efe3e))

## 0.22.4

### Patch Changes

- make active state behave the same as hover for plain borders ([7f6cda1](https://github.com/ryanatkn/moss/commit/7f6cda1))

## 0.22.3

### Patch Changes

- make `.plain` have a transparent border on hover ([04f711a](https://github.com/ryanatkn/moss/commit/04f711a))

## 0.22.2

### Patch Changes

- add line-height 1 to `.icon_button` ([caf4e3e](https://github.com/ryanatkn/moss/commit/caf4e3e))

## 0.22.1

### Patch Changes

- add `width_xl`, `width_lg`, and `width_xs` classes ([#48](https://github.com/ryanatkn/moss/pull/48))
- add `min_width` class variants ([#48](https://github.com/ryanatkn/moss/pull/48))

## 0.22.0

### Minor Changes

- fix css class order, giving simpler utility classes higher priority ([#46](https://github.com/ryanatkn/moss/pull/46))

### Patch Changes

- add word_break classes ([#47](https://github.com/ryanatkn/moss/pull/47))
- fix `shadow_xs` CSS class ([#47](https://github.com/ryanatkn/moss/pull/47))

## 0.21.1

### Patch Changes

- update description ([35c0195](https://github.com/ryanatkn/moss/commit/35c0195))

## 0.21.0

### Minor Changes

- fix border colors in dark mode ([bb8e522](https://github.com/ryanatkn/moss/commit/bb8e522))

## 0.20.2

### Patch Changes

- fix `.pre` with `.inline` ([96c90bd](https://github.com/ryanatkn/moss/commit/96c90bd))

## 0.20.1

### Patch Changes

- add `.pre` utility class ([b901812](https://github.com/ryanatkn/moss/commit/b901812))

## 0.20.0

### Minor Changes

- move some css class helpers ([470472b](https://github.com/ryanatkn/moss/commit/470472b))

## 0.19.0

### Minor Changes

- move gro plugin to gro ([#45](https://github.com/ryanatkn/moss/pull/45))

## 0.18.2

### Patch Changes

- fix `gro_plugin_moss` banner ([044430c](https://github.com/ryanatkn/moss/commit/044430c))

## 0.18.1

### Patch Changes

- add `banner` option to `gro_plugin_moss` ([55cab52](https://github.com/ryanatkn/moss/commit/55cab52))

## 0.18.0

### Minor Changes

- upgrade gro ([99f61de](https://github.com/ryanatkn/moss/commit/99f61de))

## 0.17.0

### Minor Changes

- add `gro_plugin_moss` ([#43](https://github.com/ryanatkn/moss/pull/43))

## 0.16.1

### Patch Changes

- fix pane shadow ([#42](https://github.com/ryanatkn/moss/pull/42))

## 0.16.0

### Minor Changes

- bump required node version to `20.17` ([0bce067](https://github.com/ryanatkn/moss/commit/0bce067))

## 0.15.0

### Minor Changes

- rework shadows ([738f4dd](https://github.com/ryanatkn/moss/commit/738f4dd))
  - rename `shadow_color_a-i` from `shadow_a-i_color`
  - rename `shadow_color_highlight` from `highlight_color`
  - rename `shadow_color_glow` from `glow_color`
  - rename `shadow_color_shroud` from `shroud_color`
  - rename `shadow_inset_bottom_` variables from `shadow_outset_`
  - rename `shadow_inset_top_` variables from `shadow_inset_`
    and add `shadow_inset_` variants with no y offset
  - remove shadow color variable variants `shadow_color_1-5`
    along with `highlight`/`glow`/`shroud` and colors `a-i` -
    alpha must now be applied manually with `color-mix` or relative colors,
    though maybe we'll add these back when we efficiently build only what's used

## 0.14.1

### Patch Changes

- add more layout classes ([#39](https://github.com/ryanatkn/moss/pull/39))

## 0.14.0

### Minor Changes

- improve shadows ([#37](https://github.com/ryanatkn/moss/pull/37))
  - add `inner` and `outer` shadow variants
  - remove `x` offset from all shadows

## 0.13.4

### Patch Changes

- change `input`, `select`, and `textarea` to be blocks by default ([07274c8](https://github.com/ryanatkn/moss/commit/07274c8))

## 0.13.3

### Patch Changes

- add utility classes for `overflow-wrap` ([#35](https://github.com/ryanatkn/moss/pull/35))

## 0.13.2

### Patch Changes

- fix summary margin ([d65d160](https://github.com/ryanatkn/moss/commit/d65d160))

## 0.13.1

### Patch Changes

- add some flex utility classes ([#34](https://github.com/ryanatkn/moss/pull/34))
  - add variants for `.align|justify_items|content|self_`
  - add `.grow`, `.grow_0`, `.shrink`, and `.shrink_1`
  - add `.column`

## 0.13.0

### Minor Changes

- rename shadow color variables to numbered weights ([#33](https://github.com/ryanatkn/moss/pull/33))

### Patch Changes

- add `flex_nowrap` class ([#33](https://github.com/ryanatkn/moss/pull/33))

## 0.12.2

### Patch Changes

- add flex direction classes ([fb99dd8](https://github.com/ryanatkn/moss/commit/fb99dd8))

## 0.12.1

### Patch Changes

- add margin auto variants ([f684712](https://github.com/ryanatkn/moss/commit/f684712))

## 0.12.0

### Minor Changes

- rename `text_color_0-10` from `text_1-5` ([#32](https://github.com/ryanatkn/moss/pull/32))

## 0.11.1

### Patch Changes

- fix `.selectable` styles ([c55e4dd](https://github.com/ryanatkn/moss/commit/c55e4dd))

## 0.11.0

### Minor Changes

- change colors back to including `hsl()` ([#30](https://github.com/ryanatkn/moss/pull/30))
- move `StyleVariable` to `variables.ts` ([#29](https://github.com/ryanatkn/moss/pull/29))

### Patch Changes

- rework styles ([#31](https://github.com/ryanatkn/moss/pull/31))
  - rework button styles
  - reduce input border radius
  - rework shadow styles, reducing variable count by separating shadow position/blue/spread and color

## 0.10.1

### Patch Changes

- refactor some variables ([#28](https://github.com/ryanatkn/moss/pull/28))
  - add `button_shadow`, `button_shadow_hover`, and `button_shadow_active`

- soften xs and sm shadows ([d309880](https://github.com/ryanatkn/moss/commit/d309880))

## 0.10.0

### Minor Changes

- swap styles for colored buttons and selected variants ([#27](https://github.com/ryanatkn/moss/pull/27))

## 0.9.0

### Minor Changes

- add colors `h` and `i` ([#26](https://github.com/ryanatkn/moss/pull/26))

## 0.8.0

### Minor Changes

- remove the `hsl_` variables and change the `--color_` variables to require being wrapped in `hsl()` ([#24](https://github.com/ryanatkn/moss/pull/24))

## 0.7.1

### Patch Changes

- publish src files ([d4289dc](https://github.com/ryanatkn/moss/commit/d4289dc))
- enable tsconfig `declaration` and `declarationMap` ([fe60a19](https://github.com/ryanatkn/moss/commit/fe60a19))
- add tsconfig `sourceRoot` ([039be68](https://github.com/ryanatkn/moss/commit/039be68))

## 0.7.0

### Minor Changes

- update some theme-related styles ([#22](https://github.com/ryanatkn/moss/pull/22))
  - remove `.themed` styles
  - support `light` inside `.dark`, but as the fallback
  - add explicit `color-scheme: light dark` to `:root`

## 0.6.3

### Patch Changes

- add `sideEffects` to `package.json` ([9285817](https://github.com/ryanatkn/moss/commit/9285817))
- add vertical_align and missing text_align utility classes ([d5891ea](https://github.com/ryanatkn/moss/commit/d5891ea))

## 0.6.2

### Patch Changes

- fix input styles to not use `:where` for pseudo-elements ([#18](https://github.com/ryanatkn/moss/pull/18))

## 0.6.1

### Patch Changes

- upgrade gro with correctly formatted exports ([3b4f1cf](https://github.com/ryanatkn/moss/commit/3b4f1cf))

## 0.6.0

### Minor Changes

- support `node@20.12` and later ([108a2a7](https://github.com/ryanatkn/moss/commit/108a2a7))

## 0.5.0

### Minor Changes

- upgrade `node@22.3` ([#16](https://github.com/ryanatkn/moss/pull/16))

## 0.4.0

### Minor Changes

- extract composable shadow variables and remove the create shadow helpers ([#14](https://github.com/ryanatkn/moss/pull/14))

### Patch Changes

- extract hsl color variables ([#15](https://github.com/ryanatkn/moss/pull/15))

## 0.3.2

### Patch Changes

- remove `:where` from style components ([a9199e0](https://github.com/ryanatkn/moss/commit/a9199e0))

## 0.3.1

### Patch Changes

- tweak shadows ([#13](https://github.com/ryanatkn/moss/pull/13))

## 0.3.0

### Minor Changes

- upstream Svelte-specific theme helpers ([#9](https://github.com/ryanatkn/moss/pull/9))
- rename some variables ([#8](https://github.com/ryanatkn/moss/pull/8))
  - `button_fill` from `button_bg`
  - `button_fill_hover` from `button_bg_hover`
  - `button_fill_active` from `button_bg_active`
  - `input_fill` from `input_bg`

- use `:where` everywhere in the reset to fix specificity issues ([#3](https://github.com/ryanatkn/moss/pull/3))

### Patch Changes

- add fill color variables ([#7](https://github.com/ryanatkn/moss/pull/7))
- add `button_fill_selected` ([#6](https://github.com/ryanatkn/moss/pull/6))
- add colorful border variants ([#6](https://github.com/ryanatkn/moss/pull/6))
- add colorful shadow variants ([#3](https://github.com/ryanatkn/moss/pull/3))

## 0.2.0

### Minor Changes

- break: rename `shadow_inset_bottom_md` from `shadow_inset_md` and `shadow_inset_md` from `shadow_inset_inverse_md` ([#2](https://github.com/ryanatkn/moss/pull/2))

### Patch Changes

- feat: add variables shadow_inset|outset_xs-xl including utility classes ([#2](https://github.com/ryanatkn/moss/pull/2))

## 0.1.0

### Minor Changes

- extract from @ryanatkn/fuz - ([#1](https://github.com/ryanatkn/moss/pull/1))
  [github.com/ryanatkn/fuz/pull/20](https://github.com/ryanatkn/fuz/pull/20)
