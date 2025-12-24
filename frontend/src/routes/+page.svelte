<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AuthUser, SmtpConfig, EmailLog, ReportStats } from '$lib/api';
	import { getCurrentUser, getUserConfigs, getReport, emailApiBase, logout, createUserConfig } from '$lib/api';

	let user: AuthUser | null = null;
	let loading = true;
	let error: string | null = null;
	let successMessage: string | null = null;

	let configs: SmtpConfig[] = [];
	let selectedConfigId: string | null = null;

	// compose form
	let subject = '';
	let body = '';
	let delay = 20;
	let excelFile: File | null = null;

	// simple scheduling
	let schedule = false;
	let scheduledTime = '';

	// reports
	let logs: EmailLog[] = [];
	let stats: ReportStats | null = null;
	let reportLoading = false;

	// SMTP config management
	let showConfigForm = false;
	let configForm = {
		name: '',
		host: '',
		port: 587,
		secure: false,
		user: '',
		pass: '',
		fromEmail: '',
		fromName: '',
		isDefault: false
	};
	let configLoading = false;

	onMount(async () => {
		try {
			const u = await getCurrentUser();
			if (!u) {
				goto('/login');
				return;
			}

			user = u;
			await Promise.all([loadConfigs(), loadReport()]);
		} catch (e) {
			error = `Failed to load dashboard: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure the backend API is running on http://localhost:3000`;
		} finally {
			loading = false;
		}
	});

	async function loadConfigs() {
		const res = await getUserConfigs();
		if (!res.ok || !res.data?.success) {
			error = res.error ?? 'Failed to load SMTP configurations';
			return;
		}
		configs = res.data.userConfigs;
		if (!selectedConfigId && configs.length > 0) {
			const def = configs.find((c) => c.isDefault);
			selectedConfigId = (def ?? configs[0]).id;
		}
	}

	async function loadReport() {
		reportLoading = true;
		const res = await getReport();
		if (res.ok && res.data?.success) {
			logs = res.data.data.logs;
			stats = res.data.data.stats;
		}
		reportLoading = false;
	}

	function onExcelChange(e: Event) {
		const input = e.target as HTMLInputElement;
		excelFile = input.files?.[0] ?? null;
		error = null; // Clear any previous errors when file is selected
	}

	async function handleLogout() {
		await logout();
		goto('/login');
	}

	async function handleAddConfig() {
		error = null;
		successMessage = null;
		
		// Validation
		if (!configForm.name || !configForm.name.trim()) {
			error = 'Configuration name is required';
			return;
		}
		if (!configForm.host || !configForm.host.trim()) {
			error = 'SMTP host is required';
			return;
		}
		if (!configForm.user || !configForm.user.trim()) {
			error = 'Username is required';
			return;
		}
		if (!configForm.pass || !configForm.pass.trim()) {
			error = 'Password is required';
			return;
		}
		if (!configForm.fromEmail || !configForm.fromEmail.trim()) {
			error = 'From email is required';
			return;
		}

		configLoading = true;
		try {
			const res = await createUserConfig(configForm);
			if (!res.ok || !res.data?.success) {
				error = res.data?.message ?? res.error ?? 'Failed to save configuration';
				return;
			}
			
			// Success!
			successMessage = '✅ SMTP configuration saved successfully!';
			showConfigForm = false;
			configForm = {
				name: '',
				host: '',
				port: 587,
				secure: false,
				user: '',
				pass: '',
				fromEmail: '',
				fromName: '',
				isDefault: false
			};
			
			// Reload configs to show the new one
			await loadConfigs();
			
			// Auto-select the newly created config
			if (res.data?.configId) {
				selectedConfigId = res.data.configId;
			}
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				successMessage = null;
			}, 3000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save configuration';
		} finally {
			configLoading = false;
		}
	}

	async function sendEmails() {
		error = null;
		successMessage = null;
		
		// Validation
		if (!selectedConfigId) {
			error = 'Please select an SMTP configuration';
			return;
		}
		if (!excelFile) {
			error = 'Please upload an Excel contacts file';
			return;
		}
		if (!subject.trim()) {
			error = 'Subject is required';
			return;
		}
		if (!body.trim()) {
			error = 'Email content is required';
			return;
		}
		if (schedule && !scheduledTime) {
			error = 'Please choose a scheduled date/time';
			return;
		}

		const fd = new FormData();
		fd.set('configId', selectedConfigId);
		fd.set('subject', subject.trim());
		fd.set('htmlContent', body);
		fd.set('delay', String(delay));
		fd.set('excelFile', excelFile);

		if (schedule) {
			// send UTC as backend expects
			const dt = new Date(scheduledTime);
			if (dt <= new Date()) {
				error = 'Scheduled time must be in the future';
				return;
			}
			fd.set('scheduleEmail', 'on');
			fd.set('scheduledTime', dt.toISOString());
		}

		loading = true;
		try {
			const res = await fetch(`${emailApiBase}/send`, {
				method: 'POST',
				body: fd,
				credentials: 'include'
			});
			const json = await res.json();
			if (!res.ok || !json.success) {
				error = json.message ?? 'Failed to start email sending';
			} else {
				successMessage = json.message ?? (schedule ? '✅ Campaign scheduled successfully!' : '✅ Email sending started!');
				// Refresh reports to show new activity
				await loadReport();
				// Clear form
				subject = '';
				body = '';
				excelFile = null;
				// Clear success message after 5 seconds
				setTimeout(() => {
					successMessage = null;
				}, 5000);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Network error. Make sure the backend is running.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Bulk Email Sender</title>
</svelte:head>

{#if loading}
	<div class="loading-state">
		<p>Loading dashboard…</p>
		<p class="hint">Make sure the backend API is running on http://localhost:3000</p>
	</div>
{:else if error}
	<div class="error-state">
		<h2>⚠️ Error</h2>
		<p>{error}</p>
		<div class="actions">
			<button class="primary" on:click={() => window.location.reload()}>Retry</button>
			<button class="ghost" on:click={() => goto('/login')}>Go to Login</button>
		</div>
	</div>
{:else if !user}
	<p>Redirecting to login…</p>
{:else}
	<section class="header">
		<div>
			<h1>Bulk Email Sender</h1>
			<p class="sub">Compose, schedule and track your campaigns.</p>
		</div>
		<div class="user">
			<div>
				<div class="user-name">{user.name}</div>
				<div class="user-email">{user.email}</div>
			</div>
			<button class="ghost small" on:click={handleLogout}>Log out</button>
		</div>
	</section>

	{#if error}
		<div class="alert error">{error}</div>
	{/if}
	
	{#if successMessage}
		<div class="alert success">{successMessage}</div>
	{/if}

	<section class="grid">
		<div class="card">
			<h2>Compose campaign</h2>
			<div class="field">
				<label for="smtp-config">SMTP configuration</label>
				<select id="smtp-config" bind:value={selectedConfigId} aria-required="true" aria-label="Select SMTP configuration">
					<option value="" disabled>Select configuration…</option>
					{#each configs as cfg}
						<option value={cfg.id}>
							{cfg.name} ({cfg.host}:{cfg.port})
						</option>
					{/each}
				</select>
				{#if !configs.length}
					<p class="hint">No SMTP configurations found. Add one below.</p>
				{/if}
				<button type="button" class="ghost small" on:click={() => {
					showConfigForm = !showConfigForm;
					if (showConfigForm) {
						error = null;
						successMessage = null;
					}
				}}>
					{showConfigForm ? 'Cancel' : '+ Add SMTP Configuration'}
				</button>
			</div>

			<div class="field">
				<label for="excel-file">Contacts Excel file</label>
				<input id="excel-file" type="file" accept=".xlsx,.xls" on:change={onExcelChange} aria-required="true" aria-label="Upload Excel contacts file" />
				{#if excelFile}
					<p class="hint success-text">✅ File selected: {excelFile.name}</p>
				{:else}
					<p class="hint">
						Need a template?
						<a href="/samples/sample-contacts.xlsx" target="_blank" rel="noreferrer">Download sample</a>.
					</p>
				{/if}
			</div>

			<div class="field">
				<label for="email-subject">Subject</label>
				<input id="email-subject" bind:value={subject} placeholder={'Welcome {{FirstName}}!'} aria-required="true" aria-label="Email subject line" />
			</div>

			<div class="field">
				<label for="email-body">Content (HTML allowed)</label>
				<textarea id="email-body" rows="8" bind:value={body} aria-required="true" aria-label="Email content body"></textarea>
				<p class="hint">
					You can use placeholders like {'{{FirstName}}'} and {'{{Company}}'}.
				</p>
			</div>

			<div class="field-inline">
				<label>Delay between emails (seconds)</label>
				<input type="number" min="10" max="60" bind:value={delay} />
			</div>

			<div class="field-row">
				<label class="checkbox">
					<input type="checkbox" bind:checked={schedule} />
					<span>Schedule for later</span>
				</label>
				{#if schedule}
					<input type="datetime-local" bind:value={scheduledTime} />
				{/if}
			</div>

			<button class="primary" on:click|preventDefault={sendEmails} disabled={loading || !selectedConfigId} aria-label={schedule ? 'Schedule email campaign' : 'Send emails immediately'}>
				{#if loading}
					{schedule ? 'Scheduling…' : 'Sending…'}
				{:else if schedule}
					Schedule campaign
				{:else}
					Send emails
				{/if}
			</button>

			{#if showConfigForm}
				<hr style="margin: 2rem 0; border: none; border-top: 2px solid #f1f5f9;" />
				<div style="background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; border: 2px solid #e2e8f0; margin-top: 1rem;">
					<h3 style="margin-top: 0;">Add SMTP Configuration</h3>
				<div class="field">
					<label>Configuration Name</label>
					<input type="text" bind:value={configForm.name} placeholder="My Gmail" />
				</div>
				<div class="field-row">
					<div class="field" style="flex: 2;">
						<label>SMTP Host</label>
						<input type="text" bind:value={configForm.host} placeholder="smtp.gmail.com" />
					</div>
					<div class="field" style="flex: 1;">
						<label>Port</label>
						<input type="number" bind:value={configForm.port} />
					</div>
				</div>
				<div class="field-row">
					<label class="checkbox">
						<input type="checkbox" bind:checked={configForm.secure} />
						<span>Use TLS/SSL</span>
					</label>
				</div>
				<div class="field">
					<label>Username</label>
					<input type="text" bind:value={configForm.user} placeholder="your@email.com" />
				</div>
				<div class="field">
					<label>Password</label>
					<input type="password" bind:value={configForm.pass} placeholder="App password for Gmail" />
				</div>
				<div class="field">
					<label>From Email</label>
					<input type="email" bind:value={configForm.fromEmail} placeholder="your@email.com" />
				</div>
				<div class="field">
					<label>From Name (optional)</label>
					<input type="text" bind:value={configForm.fromName} placeholder="Your Name" />
				</div>
				<div class="field-row">
					<label class="checkbox">
						<input type="checkbox" bind:checked={configForm.isDefault} />
						<span>Set as default</span>
					</label>
				</div>
					<button class="primary" on:click|preventDefault={handleAddConfig} disabled={configLoading}>
						{configLoading ? 'Saving…' : 'Save Configuration'}
					</button>
				</div>
			{/if}
		</div>

		<div class="card">
			<div class="card-header">
				<h2>Recent activity</h2>
				<button class="ghost" on:click={loadReport} disabled={reportLoading} aria-label="Refresh email reports">
					Refresh
				</button>
			</div>

			{#if stats}
				<div class="stats-row">
					<div class="stat">
						<div class="label">Total</div>
						<div class="value">{stats.total}</div>
					</div>
					<div class="stat">
						<div class="label">Sent</div>
						<div class="value success">{stats.sent}</div>
					</div>
					<div class="stat">
						<div class="label">Failed</div>
						<div class="value danger">{stats.failed}</div>
					</div>
					<div class="stat">
						<div class="label">Errors</div>
						<div class="value warn">{stats.errors}</div>
					</div>
				</div>
			{/if}

			<div class="logs">
				{#if !logs.length}
					<p class="empty">No email logs yet.</p>
				{:else}
					<table>
						<thead>
							<tr>
								<th>Email</th>
								<th>Status</th>
								<th>Subject</th>
								<th>Time</th>
							</tr>
						</thead>
						<tbody>
							{#each logs.slice(0, 20) as log}
								<tr>
									<td>{log.email}</td>
									<td>
										<span class={`badge ${log.status.toLowerCase()}`}>{log.status}</span>
									</td>
									<td>{log.subject ?? '-'}</td>
									<td>{new Date(log.timestamp).toLocaleString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 2rem;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		background: linear-gradient(135deg, #2563eb, #4f46e5);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.sub {
		margin: 0.5rem 0 0;
		color: #64748b;
		font-size: 0.95rem;
	}

	.user {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-align: right;
		font-size: 0.9rem;
	}

	.user > div {
		text-align: right;
	}

	.user-name {
		font-weight: 600;
		color: #1e293b;
		font-size: 0.95rem;
	}

	.user-email {
		color: #64748b;
		font-size: 0.85rem;
	}

	.alert {
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
		border-left: 4px solid;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.alert.error {
		background: linear-gradient(135deg, #fef2f2, #fee2e2);
		color: #991b1b;
		border-left-color: #dc2626;
	}

	.alert.success {
		background: linear-gradient(135deg, #f0fdf4, #dcfce7);
		color: #166534;
		border-left-color: #16a34a;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 2fr);
		gap: 1.5rem;
	}

	.card {
		background: white;
		border-radius: 1rem;
		padding: 1.75rem 2rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
	}

	.card h2 {
		margin: 0 0 1.5rem;
		font-size: 1.35rem;
		font-weight: 700;
		color: #1e293b;
	}

	.card h3 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: #334155;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #f1f5f9;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}

	.field label {
		font-size: 0.9rem;
		font-weight: 600;
		color: #334155;
		margin-bottom: 0.25rem;
	}

	.field-inline {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}


	input,
	select,
	textarea {
		border-radius: 0.625rem;
		border: 2px solid #e2e8f0;
		padding: 0.65rem 0.85rem;
		font-size: 0.95rem;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #fafbfc;
		transition: all 0.2s ease;
	}

	input:hover,
	select:hover,
	textarea:hover {
		border-color: #cbd5e1;
		background: white;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #2563eb;
		background: white;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	textarea {
		resize: vertical;
	}

	.hint {
		font-size: 0.78rem;
		color: #6b7280;
	}

	.success-text {
		color: #16a34a;
		font-weight: 500;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.9rem;
	}

	.primary {
		margin-top: 1rem;
		border: none;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #2563eb, #4f46e5);
		color: white;
		padding: 0.75rem 1.75rem;
		font-weight: 600;
		cursor: pointer;
		font-size: 0.95rem;
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

	.ghost {
		border-radius: 0.625rem;
		border: 2px solid #e2e8f0;
		background: transparent;
		font-size: 0.85rem;
		padding: 0.5rem 1rem;
		cursor: pointer;
		color: #475569;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.ghost:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #cbd5e1;
		color: #334155;
		transform: translateY(-1px);
	}

	.ghost:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ghost.small {
		font-size: 0.8rem;
		padding: 0.4rem 0.85rem;
		margin-top: 0.5rem;
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.stat {
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #f8fafc, #f1f5f9);
		padding: 1rem;
		border: 1px solid #e2e8f0;
		transition: all 0.2s ease;
	}

	.stat:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
	}

	.stat .label {
		font-size: 0.75rem;
		color: #64748b;
		margin-bottom: 0.4rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat .value {
		font-weight: 700;
		font-size: 1.5rem;
		color: #1e293b;
	}

	.value.success {
		color: #16a34a;
		font-size: 1.75rem;
	}

	.value.danger {
		color: #dc2626;
		font-size: 1.75rem;
	}

	.value.warn {
		color: #d97706;
		font-size: 1.75rem;
	}

	.logs {
		margin-top: 0.5rem;
		max-height: 360px;
		overflow: auto;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.875rem;
	}

	th,
	td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		white-space: nowrap;
	}

	th {
		font-weight: 600;
		color: #475569;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: #f8fafc;
		border-bottom: 2px solid #e2e8f0;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	td {
		border-bottom: 1px solid #f1f5f9;
		color: #475569;
	}

	tbody tr {
		transition: background 0.15s ease;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.65rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.badge.sent {
		background: linear-gradient(135deg, #dcfce7, #bbf7d0);
		color: #166534;
		border: 1px solid #86efac;
	}

	.badge.failed {
		background: linear-gradient(135deg, #fee2e2, #fecaca);
		color: #b91c1c;
		border: 1px solid #fca5a5;
	}

	.badge.error {
		background: linear-gradient(135deg, #fef3c7, #fde68a);
		color: #92400e;
		border: 1px solid #fcd34d;
	}

	.empty {
		margin: 2rem 0;
		color: #94a3b8;
		font-size: 0.9rem;
		text-align: center;
		padding: 2rem;
		background: #f8fafc;
		border-radius: 0.75rem;
		border: 2px dashed #e2e8f0;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.06);
		max-width: 500px;
		margin: 3rem auto;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-state::before {
		content: '';
		width: 40px;
		height: 40px;
		border: 4px solid #e2e8f0;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-state .hint {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #64748b;
	}

	.error-state h2 {
		margin: 0 0 1rem;
		color: #dc2626;
		font-size: 1.5rem;
	}

	.error-state p {
		margin-bottom: 1.5rem;
		color: #475569;
		line-height: 1.6;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
		}

		.user {
			text-align: left;
		}

		.stats-row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		th:nth-child(3),
		td:nth-child(3) {
			display: none;
		}
	}
</style>
