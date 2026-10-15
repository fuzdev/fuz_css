<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<!-- plain semantic elements with only the built-in conventions (`.title`,
	`.selected`, `.palette_c`) and the `row` layouts the controls need, so it
	shows what the defaults do on their own -->
<h3>Moss survey</h3>
<p>
	Paragraphs carry <a href={resolve('/docs/elements')}>links</a>, <code>inline code</code>,
	<strong>strong</strong> and <em>emphasized</em> text, <kbd>Ctrl</kbd>+<kbd>K</kbd>, and
	<small>small print</small>, spaced by the flow margin with nothing added.
</p>
<blockquote>Moss grows on the north side, except where it doesn't.</blockquote>
<aside>An aside is a callout, with its own tint and border.</aside>
<form onsubmit={(e) => e.preventDefault()}>
	<label>
		<div class="title">Site name</div>
		<input placeholder="north creek" />
	</label>
	<label>
		<div class="title">Coverage</div>
		<select>
			<option>sparse</option>
			<option selected>patchy</option>
			<option>dense</option>
		</select>
	</label>
	<label class="row">
		<input type="checkbox" checked />
		shaded
	</label>
	<div class="row flex-wrap:wrap gap_sm">
		<button type="submit">save</button>
		<button type="button" class="selected" aria-pressed="true">selected</button>
		<button type="button" class="palette_c">discard</button>
		<button type="button" disabled>disabled</button>
	</div>
</form>
<table>
	<thead>
		<tr>
			<th>species</th>
			<th>coverage</th>
			<th>shade</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>sheet moss</td>
			<td>dense</td>
			<td>full</td>
		</tr>
		<tr>
			<td>haircap moss</td>
			<td>patchy</td>
			<td>partial</td>
		</tr>
		<tr>
			<td>rock moss</td>
			<td>sparse</td>
			<td>none</td>
		</tr>
	</tbody>
</table>
