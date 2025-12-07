<script lang="ts">
	import {swallow} from '@fuzdev/fuz_util/dom.js';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	const LIBRARY_ITEM_NAME = 'menu item';
	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	// TODO this is currently not being displayed

	// TODO `role="menuitem"` ?

	let clicked = $state('c');

	const handled = (e: any): boolean => {
		if (e.key === 'Enter' || e.key === ' ') {
			swallow(e);
			return true;
		}
		return false;
	};
</script>

<!-- eslint-disable svelte/no-useless-mustaches -->

<TomeContent {tome}>
	<TomeSection>
		<section>
			<TomeSectionHeader text=".menu-item CSS class">
				<code>.menu_item</code> CSS class
			</TomeSectionHeader>
			<blockquote>This is experimental and may change or be removed.</blockquote>
		</section>
		<section>
			<ul class="unstyled">
				<li role="none">
					<div class="menu_item">
						<div class="content">
							<div class="icon">1</div>
							<div class="title">
								<span class="text"><Code content={`<div class="menu_item">`} /></span>
							</div>
						</div>
					</div>
				</li>
				<li role="none">
					<div class="menu_item">
						<div class="content">
							<div class="icon">2</div>
							<div class="title">
								<span class="text"><Code content={`<div class="menu_item">`} /></span>
							</div>
						</div>
					</div>
				</li>
				<li role="none">
					<div class="menu_item selected">
						<div class="content">
							<div class="icon">3</div>
							<div class="title">
								<span class="text"><Code content={`<div class="menu_item selected">`} /></span>
							</div>
						</div>
					</div>
				</li>
			</ul>
		</section>
		<section>
			<ul class="unstyled">
				<li role="none">
					<div
						class="menu_item selectable"
						class:selected={clicked === 'a'}
						tabindex="0"
						role="menuitem"
						onclick={() => (clicked = 'a')}
						onkeypress={(e) => handled(e) && (clicked = 'a')}
					>
						<div class="content">
							<div class="icon">a</div>
							<div class="title">
								<span class="text"
									><Code
										content={`<div class="menu_item selectable${
											clicked === 'a' ? ' selected' : ''
										}">`}
									/></span
								>
							</div>
						</div>
					</div>
				</li>
				<li role="none">
					<div
						class="menu_item selectable"
						class:selected={clicked === 'b'}
						tabindex="0"
						role="menuitem"
						onclick={() => (clicked = 'b')}
						onkeypress={(e) => handled(e) && (clicked = 'b')}
					>
						<div class="content">
							<div class="icon">b</div>
							<div class="title">
								<span class="text"
									><Code
										content={`<div class="menu_item selectable${
											clicked === 'b' ? ' selected' : ''
										}">`}
									/></span
								>
							</div>
						</div>
					</div>
				</li>
				<li role="none">
					<div
						class="menu_item selectable"
						class:selected={clicked === 'c'}
						tabindex="0"
						role="menuitem"
						onclick={() => (clicked = 'c')}
						onkeypress={(e) => handled(e) && (clicked = 'c')}
					>
						<div class="content">
							<div class="icon">c</div>
							<div class="title">
								<span class="text"
									><Code
										content={`<div class="menu_item selectable${
											clicked === 'c' ? ' selected' : ''
										}">`}
									/></span
								>
							</div>
						</div>
					</div>
				</li>
			</ul>
		</section>
	</TomeSection>
</TomeContent>
