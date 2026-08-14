<script lang="ts">
	// `wdth.css` porta l'asse di larghezza di Archivo: senza quello il taglio
	// espanso non esiste e il display perde la sua ragione d'essere.
	import '@fontsource-variable/archivo/wdth.css';
	import '@fontsource-variable/geist';
	import '@fontsource-variable/geist-mono';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}
