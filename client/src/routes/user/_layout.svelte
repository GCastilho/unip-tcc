<script context="module">
	export function preload(page, session) {
		if (!session.loggedIn) this.redirect(303, '/login')
	}
</script>

<slot></slot>
