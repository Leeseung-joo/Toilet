<script setup>
import StarRating from "./StarRating.vue";
import BaseChip from "../common/BaseChip.vue";

defineProps({
  toilet: {
    type: Object,
    required: true,
  },

  compact: {
    type: Boolean,
    default: false,
  },

  showAction: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["select", "view-map"]);
</script>

<template>
  <article
    class="toilet-card"
    :class="{ 'toilet-card--compact': compact }"
    @click="$emit('select', toilet)"
  >
    <div class="toilet-card__main">
      <div class="toilet-card__header">
        <div>
          <p
            v-if="toilet.statusText"
            class="toilet-card__status"
          >
            {{ toilet.statusText }}
          </p>

          <h3 class="toilet-card__name">
            {{ toilet.name }}
          </h3>
        </div>

        <BaseChip
          v-if="toilet.isOpen"
          tone="soft"
        >
          현재 운영 중
        </BaseChip>
      </div>

      <p v-if="toilet.address" class="toilet-card__address">
        {{ toilet.address }}
      </p>

      <div class="toilet-card__rating">
        <strong v-if="toilet.rating !== undefined">
          {{ Number(toilet.rating).toFixed(1) }}
        </strong>

        <StarRating
          v-if="toilet.rating !== undefined"
          :score="Number(toilet.rating)"
          size="small"
        />

        <span v-if="toilet.reviewCount !== undefined">
          후기 {{ toilet.reviewCount }}개
        </span>
      </div>

      <div
        v-if="toilet.facilities && toilet.facilities.length"
        class="toilet-card__facilities"
      >
        <BaseChip
          v-for="facility in toilet.facilities"
          :key="facility"
        >
          {{ facility }}
        </BaseChip>
      </div>
    </div>

    <div
      v-if="showAction"
      class="toilet-card__action"
    >
      <button
        type="button"
        class="toilet-card__map-button"
        @click.stop="$emit('view-map', toilet)"
      >
        지도 보기
      </button>
    </div>
  </article>
</template>

<style scoped>
.toilet-card {
  display: flex;
  width: 100%;
  padding: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  background: var(--color-mint-50);
  cursor: pointer;
}

.toilet-card--compact {
  padding: 16px;
}

.toilet-card__main {
  min-width: 0;
}

.toilet-card__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.toilet-card__status {
  margin: 0 0 5px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
}

.toilet-card__name {
  margin: 0;
  color: var(--color-text);
  font-size: 17px;
}

.toilet-card__address {
  margin: 8px 0 0;
  color: var(--color-text-subtle);
  font-size: 13px;
}

.toilet-card__rating {
  display: flex;
  margin-top: 10px;
  align-items: center;
  gap: 8px;
}

.toilet-card__rating strong {
  font-size: 17px;
}

.toilet-card__rating span {
  color: var(--color-text-subtle);
  font-size: 11px;
}

.toilet-card__facilities {
  display: flex;
  margin-top: 12px;
  flex-wrap: wrap;
  gap: 7px;
}

.toilet-card__action {
  flex-shrink: 0;
}

.toilet-card__map-button {
  min-width: 94px;
  min-height: 38px;
  padding: 0 17px;
  border: 0;
  border-radius: var(--radius-pill);
  background: #ffffff;
  color: var(--color-text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 600px) {
  .toilet-card {
    align-items: stretch;
    flex-direction: column;
  }

  .toilet-card__map-button {
    width: 100%;
  }
}
</style>