<script setup>
import { computed } from "vue";

const props = defineProps({
  selected: {
    type: Boolean,
    default: false,
  },

  clickable: {
    type: Boolean,
    default: false,
  },

  disabled: {
    type: Boolean,
    default: false,
  },

  tone: {
    type: String,
    default: "soft",
  },
});

const emit = defineEmits(["click"]);

const componentName = computed(() => {
  return props.clickable ? "button" : "span";
});

const handleClick = () => {
  if (!props.clickable || props.disabled) {
    return;
  }

  emit("click");
};
</script>

<template>
  <component
    :is="componentName"
    class="base-chip"
    :class="[
      `base-chip--${tone}`,
      {
        'base-chip--selected': selected,
        'base-chip--clickable': clickable,
      },
    ]"
    :type="clickable ? 'button' : undefined"
    :disabled="clickable ? disabled : undefined"
    :aria-pressed="clickable ? selected : undefined"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<style scoped>
.base-chip {
  display: inline-flex;
  min-height: 30px;
  padding: 0 14px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.base-chip--clickable {
  cursor: pointer;
}

.base-chip--soft {
  background: var(--color-mint-100);
  color: var(--color-primary);
}

.base-chip--neutral {
  border-color: var(--color-border);
  background: #ffffff;
  color: var(--color-text-subtle);
}

.base-chip--primary {
  background: var(--color-primary);
  color: #ffffff;
}

.base-chip--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.base-chip--selected {
  background: var(--color-primary-dark);
  color: #ffffff;
}
</style>