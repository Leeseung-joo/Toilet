<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseCard from "../components/common/BaseCard.vue";
import BaseChip from "../components/common/BaseChip.vue";
import {
  deleteCommunityPost,
  getCommunityPostById,
  toggleCommunityPostLike,
  verifyCommunityPostPassword,
} from "../stores/communityStore";

const route = useRoute();
const router = useRouter();

const post = ref(null);
const password = ref("");
const passwordError = ref("");
const actionMode = ref(null);

const categoryLabel = computed(() => {
  const labels = {
    REPORT: "이용 제보",
    QUESTION: "질문",
    REVIEW: "후기",
  };

  return labels[post.value?.category] ?? "이용 제보";
});

const commentCount = computed(() =>
  Array.isArray(post.value?.comments) ? post.value.comments.length : 0,
);

const modalTitle = computed(() =>
  actionMode.value === "delete" ? "게시글 삭제" : "게시글 수정",
);

const modalDescription = computed(() =>
  actionMode.value === "delete"
    ? "삭제하려면 작성할 때 설정한 비밀번호를 입력해주세요."
    : "수정하려면 작성할 때 설정한 비밀번호를 입력해주세요.",
);

const loadPost = () => {
  post.value = getCommunityPostById(route.params.postId);

  if (!post.value) {
    window.alert("게시글을 찾지 못했습니다.");
    router.replace({ name: "community" });
  }
};

const goBack = () => {
  router.push({ name: "community" });
};

const openPasswordModal = (mode) => {
  actionMode.value = mode;
  password.value = "";
  passwordError.value = "";
};

const closePasswordModal = () => {
  actionMode.value = null;
  password.value = "";
  passwordError.value = "";
};

const confirmPassword = () => {
  const valid = verifyCommunityPostPassword(
    route.params.postId,
    password.value.trim(),
  );

  if (!valid) {
    passwordError.value = "비밀번호가 일치하지 않습니다.";
    return;
  }

  if (actionMode.value === "delete") {
    deleteCommunityPost(route.params.postId);
    window.alert("게시글이 삭제되었습니다.");
    router.push({ name: "community" });
    return;
  }

  window.sessionStorage.setItem(
    `community-edit-authorized:${route.params.postId}`,
    "true",
  );

  router.push({
    name: "community-edit",
    params: { postId: route.params.postId },
  });
};

const toggleLike = () => {
  const updated = toggleCommunityPostLike(route.params.postId);
  if (updated) post.value = updated;
};

const openToiletMap = () => {
  const query = encodeURIComponent(post.value.toiletName);
  window.open(
    `https://map.kakao.com/link/search/${query}`,
    "_blank",
    "noopener,noreferrer",
  );
};

onMounted(loadPost);
</script>

<template>
  <AppShell active="community">
    <main v-if="post" class="detail-page">
      <BaseCard class="detail-card">
        <div class="detail-top-row">
          <button type="button" class="back-button" @click="goBack">
            ← 목록
          </button>

          <div class="detail-actions">
            <button
              type="button"
              class="action-button"
              @click="openPasswordModal('edit')"
            >
              수정
            </button>

            <button
              type="button"
              class="action-button action-button--danger"
              @click="openPasswordModal('delete')"
            >
              삭제
            </button>
          </div>
        </div>

        <header class="detail-header">
          <BaseChip tone="soft">
            {{ categoryLabel }}
          </BaseChip>

          <h1>{{ post.title }}</h1>
          <p>익명 · {{ post.createdAt }}</p>
        </header>

        <div class="detail-divider" />

        <article class="detail-content">
          {{ post.content }}
        </article>

        <section class="toilet-summary">
          <div>
            <span>연관된 화장실</span>
            <strong>{{ post.toiletName }}</strong>
            <small>
              ★ {{ Number(post.rating ?? 0).toFixed(1) }} ·
              {{ post.operationStatus }}
            </small>
          </div>

          <BaseButton variant="secondary" @click="openToiletMap">
            지도 보기
          </BaseButton>
        </section>

        <div class="like-section">
          <button
            type="button"
            class="like-button"
            :class="{ 'like-button--active': post.liked }"
            @click="toggleLike"
          >
            ♡ 공감 {{ post.likeCount }}
          </button>
        </div>

        <section class="comment-section">
          <h2>댓글 {{ commentCount }}</h2>

          <div v-if="commentCount > 0" class="comment-list">
            <article
              v-for="comment in post.comments"
              :key="comment.id"
              class="comment-item"
            >
              <strong>{{ comment.author }}</strong>
              <p>{{ comment.content }}</p>
              <small>{{ comment.createdAt }}</small>
            </article>
          </div>

          <div v-else class="comment-empty">
            아직 등록된 댓글이 없습니다.
          </div>
        </section>
      </BaseCard>

      <div
        v-if="actionMode"
        class="password-modal-backdrop"
        @click.self="closePasswordModal"
      >
        <BaseCard class="password-modal">
          <div class="password-modal__header">
            <div>
              <span>PASSWORD CHECK</span>
              <h2>{{ modalTitle }}</h2>
            </div>

            <button
              type="button"
              class="password-modal__close"
              @click="closePasswordModal"
            >
              ×
            </button>
          </div>

          <p>{{ modalDescription }}</p>

          <form @submit.prevent="confirmPassword">
            <input
              v-model="password"
              type="password"
              inputmode="numeric"
              autocomplete="current-password"
              placeholder="비밀번호 입력"
              autofocus
            />

            <small v-if="passwordError" class="password-error">
              {{ passwordError }}
            </small>

            <div class="password-modal__actions">
              <BaseButton
                type="button"
                variant="secondary"
                @click="closePasswordModal"
              >
                취소
              </BaseButton>

              <BaseButton type="submit">확인</BaseButton>
            </div>
          </form>
        </BaseCard>
      </div>
    </main>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.detail-page {
  min-height: calc(100vh - var(--header-height, 72px));
  padding: 34px 20px 70px;
  background: linear-gradient(180deg, #f1faf8 0%, #edf7f5 100%);
}

.detail-card {
  width: min(820px, 100%);
  padding: 28px 34px 34px;
  margin: 0 auto;
  border: 1px solid var(--color-border, #dce9e6);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(31, 81, 74, 0.07);
}

.detail-top-row,
.toilet-summary,
.password-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.back-button,
.action-button {
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--color-border, #dce9e6);
  border-radius: 999px;
  background: #ffffff;
  color: var(--color-text, #173b38);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.back-button {
  border: 0;
  background: var(--color-mint-100, #e8f7f3);
  color: var(--color-primary, #0d9f8c);
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.action-button--danger {
  border-color: #ffdede;
  background: #fff7f7;
  color: #d95353;
}

.detail-header {
  margin-top: 24px;
}

.detail-header h1 {
  margin: 12px 0 8px;
  color: var(--color-text, #173b38);
  font-size: clamp(25px, 4vw, 34px);
  line-height: 1.35;
  letter-spacing: -0.04em;
}

.detail-header p {
  margin: 0;
  color: var(--color-text-muted, #91a09d);
  font-size: 10px;
}

.detail-divider {
  height: 1px;
  margin: 25px 0;
  background: var(--color-border, #dce9e6);
}

.detail-content {
  min-height: 120px;
  color: var(--color-text, #2a4b47);
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-line;
}

.toilet-summary {
  padding: 20px;
  margin-top: 30px;
  border-radius: 16px;
  background: var(--color-mint-100, #e5f8f4);
}

.toilet-summary div {
  display: grid;
  gap: 5px;
}

.toilet-summary span {
  color: var(--color-primary, #0d9f8c);
  font-size: 9px;
  font-weight: 900;
}

.toilet-summary strong {
  color: var(--color-text, #173b38);
  font-size: 13px;
}

.toilet-summary small {
  color: var(--color-primary, #0d9f8c);
  font-size: 9px;
  font-weight: 700;
}

.like-section {
  display: flex;
  margin-top: 18px;
  justify-content: flex-end;
}

.like-button {
  height: 34px;
  padding: 0 15px;
  border: 1px solid var(--color-border, #dce9e6);
  border-radius: 999px;
  background: #ffffff;
  color: var(--color-text-muted, #859592);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.like-button--active {
  border-color: var(--color-primary, #0d9f8c);
  color: var(--color-primary, #0d9f8c);
}

.comment-section {
  margin-top: 30px;
}

.comment-section h2 {
  margin: 0 0 15px;
  color: var(--color-text, #173b38);
  font-size: 13px;
}

.comment-list {
  display: grid;
  gap: 10px;
}

.comment-item,
.comment-empty {
  padding: 15px 16px;
  border-radius: 12px;
  background: var(--color-surface-soft, #fafdfc);
}

.comment-item strong {
  color: var(--color-text, #173b38);
  font-size: 10px;
}

.comment-item p {
  margin: 7px 0;
  color: var(--color-text-subtle, #607470);
  font-size: 12px;
  line-height: 1.6;
}

.comment-item small,
.comment-empty {
  color: var(--color-text-muted, #99a6a4);
  font-size: 9px;
}

.password-modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  padding: 20px;
  align-items: center;
  justify-content: center;
  background: rgba(16, 42, 39, 0.5);
}

.password-modal {
  width: min(420px, 100%);
  padding: 25px;
  border: 0;
}

.password-modal__header {
  align-items: flex-start;
}

.password-modal__header span {
  color: var(--color-primary, #0d9f8c);
  font-size: 9px;
  font-weight: 900;
}

.password-modal__header h2 {
  margin: 6px 0 0;
  color: var(--color-text, #173b38);
  font-size: 22px;
}

.password-modal__close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #eef5f3;
  color: var(--color-text, #173b38);
  cursor: pointer;
  font-size: 22px;
}

.password-modal > p {
  margin: 16px 0;
  color: var(--color-text-subtle, #687b78);
  font-size: 12px;
  line-height: 1.6;
}

.password-modal form {
  display: grid;
  gap: 8px;
}

.password-modal input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--color-border, #dce9e6);
  border-radius: 12px;
  outline: none;
  color: var(--color-text, #173b38);
  font: inherit;
  font-size: 13px;
}

.password-modal input:focus {
  border-color: var(--color-primary, #0d9f8c);
  box-shadow: 0 0 0 3px rgba(13, 159, 140, 0.1);
}

.password-error {
  color: #c84f4f;
  font-size: 10px;
}

.password-modal__actions {
  display: flex;
  margin-top: 12px;
  justify-content: flex-end;
  gap: 9px;
}

@media (max-width: 640px) {
  .detail-page {
    padding: 20px 14px 50px;
  }

  .detail-card {
    padding: 22px 18px 25px;
  }

  .toilet-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
