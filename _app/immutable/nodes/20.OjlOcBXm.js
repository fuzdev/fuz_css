import"../chunks/DsnmJJEf.js";import{p as V,c as R,f as k,a as x,z as n,b as o,s as t,i as C,d as l,y as s,r as i,u as B}from"../chunks/Ko5zs1F5.js";import{e as W}from"../chunks/Bn5BDaOT.js";import{C as j}from"../chunks/DvyxxLHs.js";import{T as F}from"../chunks/DyWomdcn.js";import{T as N}from"../chunks/Ch1Z775e.js";import{M}from"../chunks/Bo6phVVe.js";import{g as X}from"../chunks/DJbU5mL_.js";import{T as Y,a as D}from"../chunks/Bdl43Tn_.js";import{d as H}from"../chunks/BT6OC4q0.js";import{S as J}from"../chunks/DASSs5nK.js";import{M as q}from"../chunks/BkJ0pL7g.js";import{U as G}from"../chunks/DRAtFuLX.js";var K=k('<!> <!> <div class="variables svelte-ap0s2i"></div>',1),O=k(`<section><p>Style variables, or just "variables" in Fuz CSS, are <!> that can be grouped into a <!>. Each variable can have
			values for light and/or dark <!>.
			They're design tokens with an API.</p> <p>The goal of the variables system is to provide runtime theming that's efficient and ergnomic
			for both developers and end-users. Variables can be composed in multiple ways:</p> <ul><li>by CSS classes, both utility and component</li> <li>by other variables, both in calculations and to add useful semantics (e.g. <code>button_fill_hover</code> defaults to <code>fg_2</code> but can be themed independently)</li> <li>in JS like the <a href="https://svelte.dev/">Svelte</a> components in <a href="https://ui.fuz.dev/">Fuz UI</a></li></ul> <p>Variables also provide an interface that's generally secure for user-generated content, if
			you're into that kind of thing.</p> <p>The result is a flexible system that aligns with modern CSS to deliver high-capability UX and
			DX with low overhead.</p></section> <section><div class="mb_md"><!></div> <!></section> <!>`,1);function ce(I,P){V(P,!0);const w=X("variables"),v=H.slice().sort((m,u)=>m.name.localeCompare(u.name));F(I,{get tome(){return w},children:(m,u)=>{var f=O(),d=x(f),b=l(d),g=t(l(b));M(g,{path:"https://developer.mozilla.org/en-US/docs/Web/CSS/--*",children:(a,h)=>{s();var e=n("CSS custom properties");o(a,e)},$$slots:{default:!0}});var _=t(g,2);N(_,{name:"themes",children:(a,h)=>{s();var e=n("theme");o(a,e)},$$slots:{default:!0}});var A=t(_,2);M(A,{path:"Web/CSS/color-scheme",children:(a,h)=>{s();var e=n("color-schemes");o(a,e)},$$slots:{default:!0}}),s(),i(b),s(8),i(d);var p=t(d,2),c=l(p),z=l(c);q(z,{path:"theme.js"}),i(c);var E=t(c,2);j(E,{lang:"ts",content:`export interface Theme {
	name: string;
	variables: StyleVariable[];
}

export interface StyleVariable {
	name: string;
	light?: string;
	dark?: string;
	summary?: string;
}`}),i(p);var L=t(p,2);Y(L,{children:(a,h)=>{var e=K(),$=x(e);{let r=B(()=>`All ${v.length} style variables`);D($,{get text(){return C(r)}})}var S=t($,2);G(S,{children:(r,T)=>{s();var U=n("Many of these will change.");o(r,U)}});var y=t(S,2);W(y,21,()=>v,r=>r.name,(r,T)=>{J(r,{get name(){return C(T).name},classes:"menu_item"})}),i(y),o(a,e)},$$slots:{default:!0}}),o(m,f)},$$slots:{default:!0}}),R()}export{ce as component};
