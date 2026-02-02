import"../chunks/DsnmJJEf.js";import{p as R,c as U,f as k,a as x,N as n,b as o,s as t,d as l,h as C,x as s,r as i,u as B}from"../chunks/DtM-i9bb.js";import{e as N}from"../chunks/DDj0E4NJ.js";import{C as W}from"../chunks/B7HLvWYg.js";import{T as X}from"../chunks/BtNb02pj.js";import{T as Y}from"../chunks/DITWDnbk.js";import{M}from"../chunks/Cg46sUOV.js";import{g as j}from"../chunks/CgwFB2So.js";import{T as D,a as H}from"../chunks/ngQN1hBV.js";import{M as J}from"../chunks/DyrB7Jei.js";import{S as q}from"../chunks/D0Ak8WX8.js";import{d as F}from"../chunks/71gF23KS.js";import{U as G}from"../chunks/bHHRTpkt.js";var K=k('<!> <!> <div class="variables svelte-ap0s2i"></div>',1),O=k(`<section><p>Style variables, or just "variables" in fuz_css, are <!> that can be grouped into a <!>. Each variable can have
			values for light and/or dark <!>.
			They're design tokens with an API.</p> <p>The goal of the variables system is to provide runtime theming that's efficient and ergonomic
			for both developers and end-users. Variables can be composed in multiple ways:</p> <ul><li>by CSS classes, both utility and component</li> <li>by other variables, both in calculations and to add useful semantics (e.g. <code>button_fill_hover</code> uses <code>shade_50</code> but can be themed independently)</li> <li>in JS like the <a href="https://svelte.dev/">Svelte</a> components in <a href="https://ui.fuz.dev/">fuz_ui</a></li></ul> <p>Variables also provide an interface that's generally secure for user-generated content, if
			you're into that kind of thing.</p> <p>The result is a flexible system that aligns with modern CSS to deliver high-capability UX and
			DX with low overhead.</p></section> <section><div class="mb_md"><!></div> <!></section> <!>`,1);function pe(P,w){R(w,!0);const A=j("variables"),v=F.slice().sort((m,u)=>m.name.localeCompare(u.name));X(P,{get tome(){return A},children:(m,u)=>{var f=O(),d=x(f),_=l(d),b=t(l(_));M(b,{path:"https://developer.mozilla.org/en-US/docs/Web/CSS/--*",children:(a,h)=>{s();var e=n("CSS custom properties");o(a,e)},$$slots:{default:!0}});var g=t(b,2);Y(g,{name:"themes",children:(a,h)=>{s();var e=n("theme");o(a,e)},$$slots:{default:!0}});var I=t(g,2);M(I,{path:"Web/CSS/color-scheme",children:(a,h)=>{s();var e=n("color-schemes");o(a,e)},$$slots:{default:!0}}),s(),i(_),s(8),i(d);var c=t(d,2),p=l(c),E=l(p);J(E,{module_path:"theme.ts"}),i(p);var L=t(p,2);W(L,{lang:"ts",content:`export interface Theme {
	name: string;
	variables: StyleVariable[];
}

export interface StyleVariable {
	name: string;
	light?: string;
	dark?: string;
	summary?: string;
}`}),i(c);var V=t(c,2);D(V,{children:(a,h)=>{var e=K(),$=x(e);{let r=B(()=>`All ${v.length} style variables`);H($,{get text(){return C(r)}})}var S=t($,2);G(S,{children:(r,T)=>{s();var z=n("Many of these will change.");o(r,z)}});var y=t(S,2);N(y,21,()=>v,r=>r.name,(r,T)=>{q(r,{get name(){return C(T).name},class:"menu_item"})}),i(y),o(a,e)},$$slots:{default:!0}}),o(m,f)},$$slots:{default:!0}}),U()}export{pe as component};
