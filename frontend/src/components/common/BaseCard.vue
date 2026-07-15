<script setup>
defineProps({
  padding: {
    type: String,
    default: "medium",
  },

  elevated: {
    type: Boolean,
    default: false,
  },

  interactive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click"]);

const handleClick = () => {
  emit("click");
};
</script>

<template>
  <section
    class="base-card"
    :class="[
      `base-card--${padding}`,
      {
        'base-card--elevated': elevated,
        'base-card--interactive': interactive,
      },
    ]"
    @click="interactive ? handleClick() : undefined"
  >
    <slot />
  </section>
</template>

<style scoped>
.base-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  background: var(--color-surface);
}

.base-card--small {
  padding: 16px;
}

.base-card--medium {
  padding: 24px;
}

.base-card--large {
  padding: 34px;
}

.base-card--elevated {
  border-color: transparent;
  box-shadow: var(--shadow-medium);
}

.base-card--interactive {
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.base-card--interactive:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-small);
  transform: translateY(-2px);
}
</style>