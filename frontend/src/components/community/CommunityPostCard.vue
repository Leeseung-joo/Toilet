<script setup>
import { computed } from "vue";

import BaseCard from "../common/BaseCard.vue";
import BaseChip from "../common/BaseChip.vue";

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  "like",
  "open",
]);

const categoryLabel = computed(() => {
  const labels = {
    REPORT: "이용 제보",
    QUESTION: "질문",
    REVIEW: "후기",
    CLEAN: "청결",
    CROWDED: "혼잡",
    TISSUE: "휴지",
    BROKEN: "시설 고장",
    SAFETY: "안전",
    ETC: "기타",
  };

  return (
    labels[props.post.category] ??
    "이용 제보"
  );
});

const categoryTone = computed(() => {
  const tones = {
    REPORT: "soft",
    QUESTION: "primary",
    REVIEW: "success",
    CLEAN: "success",
    CROWDED: "warning",
    TISSUE: "soft",
    BROKEN: "danger",
    SAFETY: "primary",
    ETC: "neutral",
  };

  return (
    tones[props.post.category] ??
    "soft"
  );
});

const commentCount = computed(() => {
  if (Array.isArray(props.post.comments)) {
    return props.post.comments.length;
  }

  return Number(
    props.post.commentCount ?? 0,
  );
});

const openPost = () => {
  emit("open", props.post);
};

const toggleLike = () => {
  emit("like", props.post.id);
};
</script>

<template>
  <article
    class="community-post-wrapper"
    role="button"
    tabindex="0"
    @click="openPost"
    @keydown.enter.self.prevent="openPost"
    @keydown.space.self.prevent="openPost"
  >
    <BaseCard class="community-post-card">
      <div class="community-post-card__header">
        <div>
          <strong class="community-post-card__author">
            {{ post.author }}
          </strong>

          <span class="community-post-card__time">
            {{ post.createdAt }}
          </span>
        </div>

        <BaseChip :tone="categoryTone">
          {{ categoryLabel }}
        </BaseChip>
      </div>

      <h3 class="community-post-card__title">
        {{ post.title }}
      </h3>

      <p class="community-post-card__content">
        {{ post.content }}
      </p>

      <div class="community-post-card__location">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />

          <circle
            cx="12"
            cy="10"
            r="2.2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />
        </svg>

        <span>
          {{ post.toiletName }}
        </span>
      </div>

      <div class="community-post-card__footer">
        <button
          type="button"
          class="community-post-card__action"
          :class="{
            'community-post-card__action--active':
              post.liked,
          }"
          @click.stop="toggleLike"
          @keydown.stop
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M7.5 10.2V20H4.2a1.7 1.7 0 0 1-1.7-1.7v-6.4a1.7 1.7 0 0 1 1.7-1.7h3.3Zm0 0 3.6-6.3c.5-.8 1.7-.6 1.8.4l.4 3.5h4.9a2 2 0 0 1 1.9 2.5l-1.8 7.6a2.7 2.7 0 0 1-2.6 2.1H7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span>
            공감 {{ post.likeCount }}
          </span>
        </button>

        <button
          type="button"
          class="community-post-card__action"
          @click.stop="openPost"
          @keydown.stop
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 5.5h16v11H9l-5 4v-15Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
          </svg>

          <span>
            댓글 {{ commentCount }}
          </span>
        </button>
      </div>
    </BaseCard>
  </article>
</template>

<style scoped>
.community-post-wrapper {
  display: block;
  border-radius: 18px;
  outline: none;
  cursor: pointer;
}

.community-post-wrapper:focus-visible {
  box-shadow:
    0 0 0 3px
    rgba(13, 159, 140, 0.18);
}

.community-post-card {
  padding: 20px;
  border: 1px solid
    var(--color-border, #dce9e6);
  background: #ffffff;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.community-post-wrapper:hover
.community-post-card {
  border-color:
    var(--color-primary, #0d9f8c);
  box-shadow:
    0 12px 28px
    rgba(29, 89, 81, 0.1);
  transform: translateY(-2px);
}

.community-post-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.community-post-card__author {
  display: block;
  color:
    var(--color-text, #173b38);
  font-size: 13px;
}

.community-post-card__time {
  display: block;
  margin-top: 4px;
  color:
    var(
      --color-text-muted,
      #96a5a2
    );
  font-size: 10px;
}

.community-post-card__title {
  margin: 17px 0 8px;
  color:
    var(--color-text, #173b38);
  font-size: 17px;
  line-height: 1.45;
}

.community-post-card__content {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.community-post-card__location {
  display: flex;
  margin-top: 16px;
  align-items: center;
  gap: 6px;
  color:
    var(--color-primary, #0d9f8c);
  font-size: 11px;
  font-weight: 700;
}

.community-post-card__location svg {
  width: 15px;
  height: 15px;
}

.community-post-card__footer {
  display: flex;
  padding-top: 15px;
  margin-top: 17px;
  align-items: center;
  gap: 16px;
  border-top: 1px solid #edf3f1;
}

.community-post-card__action {
  display: inline-flex;
  padding: 0;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color:
    var(
      --color-text-muted,
      #8a9a97
    );
  cursor: pointer;
  font-size: 11px;
}

.community-post-card__action:hover,
.community-post-card__action--active {
  color:
    var(--color-primary, #0d9f8c);
}

.community-post-card__action svg {
  width: 16px;
  height: 16px;
}
</style>