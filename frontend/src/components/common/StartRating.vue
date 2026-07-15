<script setup>
import { computed } from "vue";

const props = defineProps({
  score: {
    type: Number,
    default: 0,
  },

  max: {
    type: Number,
    default: 5,
  },

  showScore: {
    type: Boolean,
    default: false,
  },

  size: {
    type: String,
    default: "medium",
  },
});

const stars = computed(() => {
  return Array.from({ length: props.max }, (_, index) => {
    return index + 1 <= Math.round(props.score);
  });
});
</script>

<template>
  <div
    class="star-rating"
    :class="`star-rating--${size}`"
    :aria-label="`${score}점`"
  >
    <span
      v-for="(filled, index) in stars"
      :key="index"
      class="star-rating__star"
      :class="{ 'star-rating__star--filled': filled }"
    >
      ★
    </span>

    <strong v-if="showScore" class="star-rating__score">
      {{ score.toFixed(1) }}
    </strong>
  </div>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.star-rating__star {
  color: #dce5e2;
}

.star-rating__star--filled {
  color: var(--color-warning);
}

.star-rating__score {
  margin-left: 5px;
  color: var(--color-text);
}

.star-rating--small {
  font-size: 11px;
}

.star-rating--medium {
  font-size: 14px;
}

.star-rating--large {
  font-size: 18px;
}
</style>