<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { resolve } from '$app/paths';
  import ThemeSwap from '$lib/ThemeSwap.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <script>
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
  </script>
</svelte:head>

<div class="h-screen flex flex-col">
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
  <main class="flex-1 overflow-hidden">
    {@render children()}
  </main>
</div>
