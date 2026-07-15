<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "",
  },

  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="page-heading">
    <div class="page-heading__copy">
      <p v-if="eyebrow" class="page-heading__eyebrow">
        {{ eyebrow }}
      </p>

      <h1 class="page-heading__title">
        {{ title }}
      </h1>

      <p v-if="description" class="page-heading__description">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.action" class="page-heading__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.page-heading__copy {
  min-width: 0;
}

.page-heading__eyebrow {
  margin: 0 0 7px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.page-heading__title {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.2;
}

.page-heading__description {
  margin: 8px 0 0;
  color: var(--color-text-subtle);
  font-size: 14px;
}

.page-heading__action {
  flex-shrink: 0;
}

@media (max-width: 680px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-heading__action {
    width: 100%;
  }
}
</style>