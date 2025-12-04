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

<div class="h-screen overflow-hidden">
  <header class="navbar bg-base-100 shadow-sm">
    <nav class="flex w-full items-center max-w-6xl mx-auto">
      <div class="flex-1">
        <a class="font-bold text-primary text-xl" href={resolve('/')}>
          Automate.It Virtual Assistant
        </a>
      </div>
      <div class="flex gap-2">
        <ThemeSwap />
      </div>
    </nav>
  </header>
  <main class="p-2 md:p-4 overflow-scroll">
    {@render children()}
  </main>
</div>
