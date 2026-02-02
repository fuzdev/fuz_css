import"../chunks/DsnmJJEf.js";import{p as Y,c as H,f as p,a as m,N as D,b as d,s as e,t as F,d as r,x as n,r as l}from"../chunks/DtM-i9bb.js";import{s as E}from"../chunks/C8mECUs7.js";import{C as _}from"../chunks/B7HLvWYg.js";import{r as L}from"../chunks/4BhlXiop.js";import{T as W}from"../chunks/DURlQU7v.js";import{T as b}from"../chunks/Bdop9cEF.js";import{g as j}from"../chunks/C_eHbMQu.js";import{T as f,a as y}from"../chunks/CpIW69B8.js";import{S as q}from"../chunks/CknmWIWv.js";var G=p(`<!> <p>All opinionated styles use <code>:where()</code> selectors, giving them zero specificity beyond
			the element itself. Your styles and utility classes override defaults without specificity battles.</p> <!>`,1),J=p(`<!> <p>Add <code>.unstyled</code> to opt out of decorative styling while keeping reset normalizations.
			Works for both decorative containers and interactive elements like links, buttons, inputs, and summary.</p> <!> <p><a>styled link</a> vs <a class="unstyled">unstyled link</a></p> <!> <p><button type="button">styled button</button> <button type="button" class="unstyled">unstyled button</button></p>`,1),K=p(`<!> <p>Block elements get <code>margin-bottom</code> via <code>:not(:last-child)</code>, creating
			natural vertical rhythm without trailing margins.</p> <!> <p>This eliminates bottom margins on terminal elements. Edge cases can be fixed with <code>.mb_lg</code> or similar utility classes.</p> <aside>⚠️ The <code>:not(:last-child)</code> creates unfortunate edge cases by coupling structure to
			style, including usage with Svelte's component-level CSS variables, because it adds a wrapper
			div. Perhaps the better global optimum is to omit the last child exception? This would add
			unwanted margin in many cases, but perhaps that's better overall; <code>mb_0</code> removes it.</aside>`,1),O=p("<!> <p>See the related docs for specifics:</p> <ul><li><!> - button states, colors, variants</li> <li><!> - links, lists, tables, code, details</li> <li><!> - inputs, labels, checkboxes, selects</li> <li><!> - headings, fonts, text styles</li></ul>",1),Q=p(`<section><p>fuz_css styles HTML elements in its <!>, so semantic markup gets themed and color-scheme-aware styling automatically -- utility
			classes optional. The goal is to be accessible and attractive out of the box, minimal yet
			extensible.</p></section> <!> <!> <!> <!>`,1);function ie(M,C){Y(C,!0);const I=j("semantic");W(M,{get tome(){return I},children:(R,V)=>{var k=Q(),g=m(k),x=r(g),z=e(r(x));q(z,{path:"style.css",children:(s,v)=>{n();var t=D("reset stylesheet");d(s,t)},$$slots:{default:!0}}),n(),l(x),l(g);var T=e(g,2);f(T,{children:(s,v)=>{var t=G(),o=m(t);y(o,{text:"Low specificity"});var a=e(o,4);_(a,{lang:"css",content:`/* any styles you apply will override these */
:where(a:not(.unstyled)) {
  color: var(--link_color);
  font-weight: 700;
}

:where(button:not(.unstyled)) {
  background-color: var(--button_fill);
  border-radius: var(--border_radius_sm);
}`}),d(s,t)},$$slots:{default:!0}});var S=e(T,2);f(S,{children:(s,v)=>{var t=J(),o=m(t);y(o,{text:".unstyled escape hatch"});var a=e(o,4);_(a,{lang:"svelte",content:`<a href="/home">styled link</a>
<a href="/home" class="unstyled">unstyled link</a>`});var i=e(a,2),h=r(i),c=e(h,2);l(i);var $=e(i,2);_($,{lang:"svelte",content:`<button>styled button</button>
<button class="unstyled">unstyled button</button>`}),n(2),F((u,w)=>{E(h,"href",u),E(c,"href",w)},[()=>L("/"),()=>L("/")]),d(s,t)},$$slots:{default:!0}});var P=e(S,2);f(P,{children:(s,v)=>{var t=K(),o=m(t);y(o,{text:"Document flow"});var a=e(o,4);_(a,{lang:"css",content:`:where(
  :is(p, ul, ...[many others])
    :not(:last-child):not(.unstyled)
) {
  margin-bottom: var(--space_lg);
}`}),n(4),d(s,t)},$$slots:{default:!0}});var B=e(P,2);f(B,{children:(s,v)=>{var t=O(),o=m(t);y(o,{text:"Element-specific docs"});var a=e(o,4),i=r(a),h=r(i);b(h,{name:"buttons"}),n(),l(i);var c=e(i,2),$=r(c);b($,{name:"elements"}),n(),l(c);var u=e(c,2),w=r(u);b(w,{name:"forms"}),n(),l(u);var A=e(u,2),N=r(A);b(N,{name:"typography"}),n(),l(A),l(a),d(s,t)},$$slots:{default:!0}}),d(R,k)},$$slots:{default:!0}}),H()}export{ie as component};
