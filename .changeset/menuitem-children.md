---
'@fuzdev/fuz_css': minor
---

**breaking** feat: name `menuitem`'s children `menuitem_content`, `menuitem_icon`, and `menuitem_title`

They're classes of their own now, each resolving and shipping on its own name, in place of the generic `.content`, `.icon`, and `.title` under a `.menuitem`.

Breaking:

- `.menuitem .content` is `.menuitem_content`, `.menuitem .icon` is `.menuitem_icon`, and `.menuitem .title` is `.menuitem_title` - rename the classes on a menu item's children
- the children's rules drop from `.menuitem .x` specificity to a single class, still in the composites sublayer
- fuz_ui's contextmenu components take the new names in its next release; until then their menu items render without the child styles
