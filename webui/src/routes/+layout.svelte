<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { resolve } from '$app/paths';
  import ThemeSwap from '$lib/ThemeSwap.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<header class="navbar bg-base-100 shadow-sm">
  <nav class="flex w-full items-center max-w-6xl mx-auto">
    <div class="flex-1">
      <a class="font-bold text-primary" href={resolve('/')}>AIVA</a>
    </div>
    <div class="flex gap-2">
      <ThemeSwap />
    </div>
  </nav>
</header>
<main class="px-4 py-4">
  {@render children()}
</main>
