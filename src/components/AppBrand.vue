<template>
  <header class="brand">
    <p class="brand-name">Expense Tracker</p>
    <p v-if="tagline" class="brand-tagline">{{ tagline }}</p>
  </header>
</template>

<script setup>
defineProps({
  tagline: {
    type: String,
    default: '',
  },
})
</script>

<style scoped>
.brand {
  text-align: center;
  margin-bottom: 1.5rem;
}
.brand-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.brand-tagline {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  opacity: 0.75;
}
</style>
