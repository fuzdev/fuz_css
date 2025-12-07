import"../chunks/DsnmJJEf.js";import{p as z,c as R,f as k,a as x,z as n,b as o,s as t,i as M,d as l,y as s,r as i,u as B}from"../chunks/BXT8hfh2.js";import{e as W}from"../chunks/JC-9cd5s.js";import{C as j}from"../chunks/DpDRPISf.js";import{T as N}from"../chunks/CRKMJ7-6.js";import{T as X}from"../chunks/CGBkVEJ1.js";import{M as C}from"../chunks/DUbTEJZv.js";import{g as Y}from"../chunks/DxcZvTu0.js";import{T as D,a as F}from"../chunks/CLe1wKLj.js";import{d as H}from"../chunks/DhmLXYaG.js";import{S as J}from"../chunks/mwnHODL-.js";import{M as q}from"../chunks/BbrY47Td.js";import{U as G}from"../chunks/MxwI0L71.js";var K=k('<!> <!> <div class="variables svelte-ap0s2i"></div>',1),O=k(`<section><p>Style variables, or just "variables" in Moss, are <!> that can be grouped into a <!>. Each variable can have
			values for light and/or dark <!>.
			They're design tokens with an API.</p> <p>The goal of the variables system is to provide runtime theming that's efficient and ergnomic
			for both developers and end-users. Variables can be composed in multiple ways:</p> <ul><li>by CSS classes, both utility and component</li> <li>by other variables, both in calculations and to add useful semantics (e.g. <code>button_fill_hover</code> defaults to <code>fg_2</code> but can be themed independently)</li> <li>in JS like the <a href="https://svelte.dev/">Svelte</a> components in <a href="https://ui.fuz.dev/">Fuz UI</a></li></ul> <p>Variables also provide an interface that's generally secure for user-generated content, if
			you're into that kind of thing.</p> <p>The result is a flexible system that aligns with modern CSS to deliver high-capability UX and
			DX with low overhead.</p></section> <section><div class="mb_md"><!></div> <!></section> <!>`,1);function ce(I,P){z(P,!0);const w=Y("variables"),v=H.slice().sort((m,u)=>m.name.localeCompare(u.name));N(I,{get tome(){return w},children:(m,u)=>{var f=O(),d=x(f),b=l(d),g=t(l(b));C(g,{path:"https://developer.mozilla.org/en-US/docs/Web/CSS/--*",children:(a,h)=>{s();var e=n("CSS custom properties");o(a,e)},$$slots:{default:!0}});var _=t(g,2);X(_,{name:"themes",children:(a,h)=>{s();var e=n("theme");o(a,e)},$$slots:{default:!0}});var A=t(_,2);C(A,{path:"Web/CSS/color-scheme",children:(a,h)=>{s();var e=n("color-schemes");o(a,e)},$$slots:{default:!0}}),s(),i(b),s(8),i(d);var p=t(d,2),c=l(p),E=l(c);q(E,{path:"theme.js"}),i(c);var L=t(c,2);j(L,{lang:"ts",content:`export interface Theme {
	name: string;
	variables: StyleVariable[];
}

export interface StyleVariable {
	name: string;
	light?: string;
	dark?: string;
	summary?: string;
}`}),i(p);var U=t(p,2);D(U,{children:(a,h)=>{var e=K(),$=x(e);{let r=B(()=>`All ${v.length} style variables`);F($,{get text(){return M(r)}})}var y=t($,2);G(y,{children:(r,T)=>{s();var V=n("Many of these will change.");o(r,V)}});var S=t(y,2);W(S,21,()=>v,r=>r.name,(r,T)=>{J(r,{get name(){return M(T).name},classes:"menu_item"})}),i(S),o(a,e)},$$slots:{default:!0}}),o(m,f)},$$slots:{default:!0}}),R()}export{ce as component};
