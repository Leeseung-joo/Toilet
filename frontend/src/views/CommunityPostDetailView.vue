<script setup>
import {
  computed,
  ref,
  watch,
} from "vue";
import {
  useRoute,
  useRouter,
} from "vue-router";

import AppShell from "../components/common/AppShell.vue";

import {
  deleteCommunityPost,
  getCommunityPostDetail,
} from "../api/communityApi.js";

const route = useRoute();
const router = useRouter();

const post = ref(null);

const loading = ref(false);
const loadError = ref("");

const deleteModalOpen = ref(false);
const deletePassword = ref("");
const deleteError = ref("");
const deleting = ref(false);

/*
 * 댓글 목록 API가 연결되면 이 배열에
 * 실제 응답 데이터를 넣으면 된다.
 */
const comments = ref([]);

const postId = computed(() => {
  return route.params.postId;
});

const normalizePost = (data) => {
  return {
    id: data.post_id,

    toiletId:
      data.toilet?.toilet_id ??
      null,

    toiletName:
      data.toilet?.name ??
      "화장실 정보 없음",

    nickname:
      data.nickname ??
      "익명",

    title:
      data.title ??
      "제목 없음",

    content:
      data.content ?? "",

    commentCount:
      data.comment_count ?? 0,

    createdAt:
      data.created_at,

    updatedAt:
      data.updated_at,
  };
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const loadPost = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const response =
      await getCommunityPostDetail(
        postId.value,
      );

    post.value =
      normalizePost(response);
  } catch (error) {
    post.value = null;

    loadError.value =
      error instanceof Error
        ? error.message
        : "게시글을 불러오지 못했습니다.";
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push({
    name: "community",
  });
};

const goToEdit = () => {
  router.push({
    name: "community-edit",
    params: {
      postId: postId.value,
    },
  });
};

const openDeleteModal = () => {
  deletePassword.value = "";
  deleteError.value = "";
  deleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  if (deleting.value) {
    return;
  }

  deleteModalOpen.value = false;
  deletePassword.value = "";
  deleteError.value = "";
};

const submitDelete = async () => {
  if (!deletePassword.value.trim()) {
    deleteError.value =
      "게시글 비밀번호를 입력해주세요.";

    return;
  }

  deleting.value = true;
  deleteError.value = "";

  try {
    await deleteCommunityPost(
      postId.value,
      deletePassword.value,
    );

    window.alert(
      "게시글이 삭제되었습니다.",
    );

    await router.replace({
      name: "community",
    });
  } catch (error) {
    deleteError.value =
      error instanceof Error
        ? error.message
        : "게시글 삭제에 실패했습니다.";
  } finally {
    deleting.value = false;
  }
};

const openMap = () => {
  if (!post.value?.toiletName) {
    return;
  }

  const keyword =
    encodeURIComponent(
      post.value.toiletName,
    );

  window.open(
    `https://map.kakao.com/link/search/${keyword}`,
    "_blank",
    "noopener,noreferrer",
  );
};

watch(
  postId,
  () => {
    deleteModalOpen.value = false;
    loadPost();
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <AppShell active="community">
    <main class="detail-page">
      <section
        v-if="loading"
        class="detail-card detail-status"
      >
        <div class="loading-spinner" />

        <strong>
          게시글을 불러오는 중입니다.
        </strong>
      </section>

      <section
        v-else-if="loadError"
        class="
          detail-card
          detail-status
          detail-status--error
        "
      >
        <strong>
          게시글을 불러오지 못했습니다.
        </strong>

        <p>
          {{ loadError }}
        </p>

        <button
          type="button"
          class="primary-button"
          @click="loadPost"
        >
          다시 시도
        </button>
      </section>

      <section
        v-else-if="post"
        class="detail-card"
      >
        <div class="detail-top-row">
          <button
            type="button"
            class="back-button"
            @click="goBack"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M15 5L8 12L15 19"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            목록
          </button>

          <div class="detail-actions">
            <button
              type="button"
              class="edit-button"
              @click="goToEdit"
            >
              수정
            </button>

            <button
              type="button"
              class="delete-button"
              @click="openDeleteModal"
            >
              삭제
            </button>
          </div>
        </div>

        <header class="detail-header">
          <span class="category-chip">
            이용 제보
          </span>

          <h1>
            {{ post.title }}
          </h1>

          <div class="post-meta">
            <span>
              {{ post.nickname }}
            </span>

            <span class="meta-divider">
              ·
            </span>

            <time
              :datetime="post.createdAt"
            >
              {{
                formatDate(
                  post.createdAt,
                )
              }}
            </time>

            <template
              v-if="
                post.updatedAt &&
                post.updatedAt !==
                  post.createdAt
              "
            >
              <span class="meta-divider">
                ·
              </span>

              <span>
                수정됨
              </span>
            </template>
          </div>
        </header>

        <div class="detail-divider" />

        <article class="detail-content">
          {{ post.content }}
        </article>

        <section class="toilet-summary">
          <div class="toilet-information">
            <span class="toilet-label">
              연결된 화장실
            </span>

            <strong>
              {{ post.toiletName }}
            </strong>

            <small
              v-if="post.toiletId"
            >
              화장실 ID:
              {{ post.toiletId }}
            </small>
          </div>

          <button
            type="button"
            class="map-button"
            @click="openMap"
          >
            지도 보기
          </button>
        </section>

        <section class="comment-section">
          <h2>
            댓글
            {{ post.commentCount }}
          </h2>

          <div
            v-if="comments.length > 0"
            class="comment-list"
          >
            <article
              v-for="comment in comments"
              :key="comment.id"
              class="comment-card"
            >
              <p>
                {{ comment.content }}
              </p>

              <small>
                {{ comment.nickname }}
                ·
                {{
                  formatDate(
                    comment.createdAt,
                  )
                }}
              </small>
            </article>
          </div>

          <div
            v-else
            class="comment-empty"
          >
            <p>
              아직 표시할 댓글이 없습니다.
            </p>
          </div>
        </section>
      </section>

      <div
        v-if="deleteModalOpen"
        class="modal-backdrop"
        @click.self="closeDeleteModal"
      >
        <section
          class="delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div class="modal-header">
            <div>
              <span>
                PASSWORD CHECK
              </span>

              <h2 id="delete-title">
                게시글 삭제
              </h2>
            </div>

            <button
              type="button"
              class="modal-close"
              :disabled="deleting"
              aria-label="삭제 창 닫기"
              @click="closeDeleteModal"
            >
              ×
            </button>
          </div>

          <p class="modal-description">
            작성할 때 설정한 비밀번호를 입력해주세요.
            삭제한 게시글은 복구할 수 없습니다.
          </p>

          <form
            class="delete-form"
            @submit.prevent="submitDelete"
          >
            <label>
              <span>
                비밀번호
              </span>

              <input
                v-model="deletePassword"
                type="password"
                autocomplete="current-password"
                placeholder="게시글 비밀번호"
                :disabled="deleting"
              />
            </label>

            <small
              v-if="deleteError"
              class="delete-error"
            >
              {{ deleteError }}
            </small>

            <div class="modal-actions">
              <button
                type="button"
                class="modal-cancel-button"
                :disabled="deleting"
                @click="closeDeleteModal"
              >
                취소
              </button>

              <button
                type="submit"
                class="modal-delete-button"
                :disabled="deleting"
              >
                {{
                  deleting
                    ? "삭제 중..."
                    : "삭제하기"
                }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.detail-page {
  width: min(
    920px,
    calc(100% - 40px)
  );
  padding: 48px 0 100px;
  margin: 0 auto;
}

.detail-card {
  padding: 34px 38px 38px;
  border: 1px solid
    var(
      --color-border,
      #d5e7e3
    );
  border-radius: 24px;
  background: #ffffff;
}

.detail-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.back-button {
  display: inline-flex;
  height: 38px;
  padding: 0 16px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: #e3f8f3;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
}

.back-button svg {
  width: 16px;
  height: 16px;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.edit-button,
.delete-button {
  min-width: 76px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
}

.edit-button {
  border: 1px solid
    var(
      --color-border,
      #cfe3df
    );
  background: #ffffff;
  color:
    var(
      --color-text,
      #173b38
    );
}

.delete-button {
  border: 1px solid #ffe1e1;
  background: #fff0f0;
  color: #e45454;
}

.edit-button:hover {
  border-color:
    var(
      --color-primary,
      #0d9f8c
    );
  color:
    var(
      --color-primary,
      #0d9f8c
    );
}

.delete-button:hover {
  border-color: #e45454;
}

.detail-header {
  margin-top: 28px;
}

.category-chip {
  display: inline-flex;
  height: 30px;
  padding: 0 13px;
  align-items: center;
  border-radius: 999px;
  background: #e3f8f3;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 11px;
  font-weight: 800;
}

.detail-header h1 {
  margin: 17px 0 10px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size:
    clamp(
      26px,
      4vw,
      38px
    );
  line-height: 1.3;
  letter-spacing: -0.045em;
  overflow-wrap: anywhere;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color:
    var(
      --color-text-muted,
      #8c9b98
    );
  font-size: 11px;
}

.meta-divider {
  color: #b5c0be;
}

.detail-divider {
  height: 1px;
  margin: 28px 0 0;
  background:
    var(
      --color-border,
      #dce9e6
    );
}

.detail-content {
  min-height: 170px;
  padding: 32px 0 38px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.toilet-summary {
  display: flex;
  padding: 20px 22px;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      #e9faf6 0%,
      #dcf6f0 100%
    );
}

.toilet-information {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.toilet-label {
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 10px;
  font-weight: 800;
}

.toilet-information strong {
  overflow: hidden;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toilet-information small {
  color:
    var(
      --color-text-muted,
      #7f918e
    );
  font-size: 10px;
}

.map-button {
  min-width: 100px;
  height: 42px;
  padding: 0 19px;
  flex-shrink: 0;
  border: 1px solid #d7ece7;
  border-radius: 999px;
  background: #ffffff;
  color:
    var(
      --color-text,
      #173b38
    );
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
}

.map-button:hover {
  border-color:
    var(
      --color-primary,
      #0d9f8c
    );
  color:
    var(
      --color-primary,
      #0d9f8c
    );
}

.comment-section {
  margin-top: 34px;
}

.comment-section h2 {
  margin: 0 0 16px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 15px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.comment-card,
.comment-empty {
  padding: 16px 18px;
  border-radius: 12px;
  background: #f8fcfb;
}

.comment-card p,
.comment-empty p {
  margin: 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 12px;
  line-height: 1.6;
}

.comment-card small {
  display: block;
  margin-top: 6px;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 10px;
}

.comment-empty {
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
}

.comment-empty p {
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
}

.detail-status {
  display: flex;
  min-height: 420px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  text-align: center;
}

.detail-status strong {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 15px;
}

.detail-status p {
  margin: 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 12px;
}

.detail-status--error {
  border-color:
    rgba(
      220,
      90,
      90,
      0.3
    );
}

.primary-button {
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background:
    var(
      --color-primary,
      #0d9f8c
    );
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-weight: 800;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #dce9e6;
  border-top-color:
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 50%;
  animation:
    detail-spin
    0.8s linear infinite;
}

.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  padding: 20px;
  align-items: center;
  justify-content: center;
  background:
    rgba(
      13,
      43,
      40,
      0.48
    );
}

.delete-modal {
  width: min(
    100%,
    460px
  );
  padding: 28px;
  border: 1px solid #dce9e6;
  border-radius: 22px;
  background: #ffffff;
  box-shadow:
    0 24px 60px
    rgba(
      14,
      50,
      46,
      0.2
    );
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.modal-header span {
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 10px;
  font-weight: 800;
}

.modal-header h2 {
  margin: 9px 0 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 23px;
}

.modal-close {
  padding: 0;
  border: 0;
  background: transparent;
  color: #849693;
  cursor: pointer;
  font-size: 28px;
  line-height: 1;
}

.modal-description {
  margin: 20px 0;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 12px;
  line-height: 1.7;
}

.delete-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.delete-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-form label span {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 12px;
  font-weight: 800;
}

.delete-form input {
  width: 100%;
  height: 48px;
  padding: 0 15px;
  border: 1px solid #cfe3df;
  border-radius: 12px;
  outline: none;
  font-family: inherit;
}

.delete-form input:focus {
  border-color:
    var(
      --color-primary,
      #0d9f8c
    );
  box-shadow:
    0 0 0 3px
    rgba(
      13,
      159,
      140,
      0.1
    );
}

.delete-error {
  color: #c54848;
  font-size: 11px;
}

.modal-actions {
  display: flex;
  margin-top: 6px;
  justify-content: flex-end;
  gap: 10px;
}

.modal-cancel-button,
.modal-delete-button {
  min-width: 94px;
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
}

.modal-cancel-button {
  border: 1px solid #cfe3df;
  background: #ffffff;
  color: #173b38;
}

.modal-delete-button {
  border: 1px solid #e45454;
  background: #e45454;
  color: #ffffff;
}

.modal-cancel-button:disabled,
.modal-delete-button:disabled,
.modal-close:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@keyframes detail-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .detail-page {
    width: min(
      100% - 24px,
      920px
    );
    padding: 28px 0 80px;
  }

  .detail-card {
    padding: 24px 20px 28px;
    border-radius: 20px;
  }

  .detail-top-row {
    align-items: stretch;
    flex-direction: column;
  }

  .detail-actions {
    width: 100%;
  }

  .edit-button,
  .delete-button {
    flex: 1;
  }

  .detail-content {
    min-height: 130px;
  }

  .toilet-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .toilet-information strong {
    white-space: normal;
  }

  .map-button {
    width: 100%;
  }

  .modal-actions {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .modal-cancel-button,
  .modal-delete-button {
    width: 100%;
    min-width: 0;
  }
}
</style>