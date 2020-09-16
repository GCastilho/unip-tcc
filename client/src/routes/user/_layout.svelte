<script>
	import { onMount } from 'svelte'
	import { goto } from '@sapper/app'
	import * as auth from '../../stores/auth'

	onMount(() => {
		if (!$auth) goto('/login')
	})
</script>

<slot></slot>
