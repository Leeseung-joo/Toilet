<script setup>
defineProps({
  post: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["click"]);
</script>

<template>
  <article
    class="community-post-card"
    tabindex="0"
    role="button"
    @click="$emit('click', post)"
    @keydown.enter="$emit('click', post)"
  >
    <div class="community-post-card__content">
      <span
        v-if="post.category"
        class="community-post-card__category"
      >
        {{ post.category }}
      </span>

      <h3 class="community-post-card__title">
        {{ post.title }}
      </h3>

      <p class="community-post-card__preview">
        {{ post.preview }}
      </p>
    </div>

    <div class="community-post-card__meta">
      <span>
        {{ post.authorName || "익명" }}
        ·
        {{ post.createdAtLabel }}
      </span>

      <strong>
        댓글 {{ post.commentCount || 0 }}
      </strong>
    </div>
  </article>
</template>

<style scoped>
.community-post-card {
  display: flex;
  min-height: 126px;
  padding: 25px 28px;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.community-post-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-small);
  transform: translateY(-2px);
}

.community-post-card:focus-visible {
  outline: 3px solid rgba(7, 153, 135, 0.15);
  outline-offset: 2px;
}

.community-post-card__content {
  min-width: 0;
}

.community-post-card__category {
  display: inline-block;
  margin-bottom: 7px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 800;
}

.community-post-card__title {
  margin: 0;
  color: var(--color-text);
  font-size: 17px;
}

.community-post-card__preview {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--color-text-subtle);
  font-size: 13px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.community-post-card__meta {
  display: flex;
  min-width: 110px;
  align-items: flex-end;
  flex-direction: column;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 11px;
}

.community-post-card__meta strong {
  color: var(--color-primary);
}

@media (max-width: 600px) {
  .community-post-card {
    flex-direction: column;
  }

  .community-post-card__meta {
    width: 100%;
    align-items: center;
    flex-direction: row;
  }
}
</style>