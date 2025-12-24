<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getCurrentUser, login, register } from '$lib/api';

	let mode: 'login' | 'register' = 'login';
	let email = '';
	let password = '';
	let name = '';
	let loading = false;
	let error: string | null = null;
	let checkingAuth = true;

	onMount(async () => {
		// Silently check if user is already logged in
		// If backend is not running, just show login form (don't show error)
		try {
			const u = await getCurrentUser();
			if (u) {
				goto('/');
				return;
			}
		} catch (e) {
			// Backend not running or not logged in - silently ignore and show login form
			// Don't set error state - only show errors on actual login/register attempts
		} finally {
			checkingAuth = false;
		}
	});

	async function handleSubmit() {
		error = null;
		loading = true;

		try {
			if (mode === 'login') {
				const res = await login(email, password);
				if (!res.ok || !res.data?.success) {
					error = res.data?.message ?? res.error ?? 'Login failed. Make sure the backend is running on http://localhost:3000';
					return;
				}
			} else {
				const res = await register(name, email, password);
				if (!res.ok || !res.data?.success) {
					error = res.data?.message ?? res.error ?? 'Registration failed. Make sure the backend is running on http://localhost:3000';
					return;
				}
			}
			goto('/');
		} catch (e) {
			error = `Network error: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure the backend is running on http://localhost:3000`;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Sign in' : 'Create account'} · Bulk Email Sender</title>
</svelte:head>

<div class="auth-shell">
	<div class="panel">
		<header>
			<h1>Bulk Email Sender</h1>
			<p>Secure bulk campaign management</p>
		</header>

		<div class="tabs">
			<button
				type="button"
				class:active={mode === 'login'}
				on:click={() => {
					mode = 'login';
					error = null;
				}}
			>
				Sign in
			</button>
			<button
				type="button"
				class:active={mode === 'register'}
				on:click={() => {
					mode = 'register';
					error = null;
				}}
			>
				Sign up
			</button>
		</div>

		{#if checkingAuth}
			<div class="checking">Checking authentication...</div>
		{:else if error}
			<div class="alert">{error}</div>
		{/if}

		<form
			on:submit|preventDefault={handleSubmit}
			autocomplete="off"
			class="form"
			aria-busy={loading}
		>
			{#if mode === 'register'}
				<label>
					<span>Full name</span>
					<input
						placeholder="Jane Doe"
						bind:value={name}
						required={mode === 'register'}
						autocomplete="name"
					/>
				</label>
			{/if}

			<label>
				<span>Email</span>
				<input
					type="email"
					placeholder="you@example.com"
					bind:value={email}
					required
					autocomplete="email"
				/>
			</label>

			<label>
				<span>Password</span>
				<input
					type="password"
					placeholder="••••••••"
					minlength="6"
					bind:value={password}
					required
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
				/>
				<p class="hint">Minimum 6 characters</p>
			</label>

			<button class="primary" type="submit" disabled={loading}>
				{#if loading}
					{mode === 'login' ? 'Signing in…' : 'Creating account…'}
				{:else}
					{mode === 'login' ? 'Sign in' : 'Create account'}
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.auth-shell {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle at top left, #2563eb22, transparent 60%),
			radial-gradient(circle at bottom right, #4f46e522, transparent 60%), #0f172a;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	.panel {
		background: #ffffff;
		border-radius: 1.5rem;
		padding: 2.5rem 2.5rem 2.5rem;
		box-shadow: 0 20px 60px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
		width: 100%;
		max-width: 440px;
		backdrop-filter: blur(10px);
	}

	header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		background: linear-gradient(135deg, #2563eb, #4f46e5);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	header p {
		margin: 0.4rem 0 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.tabs {
		display: inline-flex;
		background: #f3f4f6;
		border-radius: 999px;
		padding: 0.15rem;
		margin: 1.4rem 0 1rem;
	}

	.tabs button {
		border: none;
		background: transparent;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		font-size: 0.85rem;
		cursor: pointer;
		color: #4b5563;
	}

	.tabs button.active {
		background: #111827;
		color: white;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.9rem;
		color: #374151;
	}

	input {
		border-radius: 0.75rem;
		border: 2px solid #e2e8f0;
		padding: 0.65rem 0.9rem;
		font-size: 0.95rem;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #fafbfc;
		transition: all 0.2s ease;
	}

	input:hover {
		border-color: #cbd5e1;
		background: white;
	}

	input:focus {
		outline: none;
		border-color: #2563eb;
		background: white;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.hint {
		font-size: 0.75rem;
		color: #9ca3af;
		margin: 0;
	}

	.primary {
		margin-top: 0.5rem;
		border: none;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #2563eb, #4f46e5);
		color: white;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.primary::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
	}

	.primary:hover:not(:disabled)::before {
		left: 100%;
	}

	.primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		box-shadow: none;
	}

	.checking {
		background: #f3f4f6;
		color: #6b7280;
		border-radius: 0.7rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.alert {
		background: #fee2e2;
		color: #991b1b;
		border-radius: 0.7rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
	}

	@media (max-width: 480px) {
		.panel {
			padding-inline: 1.25rem;
		}
	}
</style>


