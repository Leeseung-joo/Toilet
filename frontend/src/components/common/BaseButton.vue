<script setup>
import { computed } from "vue";

const props = defineProps({
  type: {
    type: String,
    default: "button",
  },

  variant: {
    type: String,
    default: "primary",
  },

  size: {
    type: String,
    default: "medium",
  },

  block: {
    type: Boolean,
    default: false,
  },

  disabled: {
    type: Boolean,
    default: false,
  },

  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click"]);

const buttonClasses = computed(() => {
  return [
    `base-button--${props.variant}`,
    `base-button--${props.size}`,
    {
      "base-button--block": props.block,
      "base-button--loading": props.loading,
    },
  ];
});

const handleClick = (event) => {
  if (props.disabled || props.loading) {
    return;
  }

  emit("click", event);
};
</script>

<template>
  <button
    :type="type"
    class="base-button"
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__spinner" />

    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  min-width: 104px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-weight: 700;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease,
    opacity 0.15s ease;
}

.base-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.base-button:focus-visible {
  outline: 3px solid rgba(7, 153, 135, 0.2);
  outline-offset: 2px;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-button--small {
  min-height: 34px;
  padding: 0 16px;
  font-size: 12px;
}

.base-button--medium {
  min-height: 44px;
  padding: 0 24px;
  font-size: 14px;
}

.base-button--large {
  min-height: 50px;
  padding: 0 30px;
  font-size: 15px;
}

.base-button--block {
  width: 100%;
}

.base-button--primary {
  background: var(--color-primary);
  color: #ffffff;
}

.base-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.base-button--secondary {
  background: var(--color-primary-dark);
  color: #ffffff;
}

.base-button--outline {
  border-color: var(--color-border);
  background: #ffffff;
  color: var(--color-text);
}

.base-button--outline:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.base-button--ghost {
  background: var(--color-mint-100);
  color: var(--color-primary-dark);
}

.base-button--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.base-button__spinner {
  width: 15px;
  height: 15px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-rotate 0.7s linear infinite;
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>