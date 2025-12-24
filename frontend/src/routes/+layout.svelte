<script lang="ts">
	let { children } = $props();
</script>

<div class="app">
	<main class="shell">
		{@render children()}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		background: linear-gradient(135deg, #f5f7fb 0%, #e8ecf1 100%);
		color: #111827;
	}

	.shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.shell {
			padding-inline: 1.5rem;
		}
	}
</style>
