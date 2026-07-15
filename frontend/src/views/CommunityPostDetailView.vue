<script setup>
import {
  computed,
  onMounted,
  ref,
} from "vue";
import {
  useRoute,
  useRouter,
} from "vue-router";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseCard from "../components/common/BaseCard.vue";
import BaseChip from "../components/common/BaseChip.vue";

import {
  deleteCommunityPost,
  getCommunityPostById,
  toggleCommunityPostLike,
  verifyCommunityPostPassword,
} from "../stores/communityStore.js";

const route = useRoute();
const router = useRouter();

const post = ref(null);

const actionMode = ref(null);
const password = ref("");
const passwordError = ref("");

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
  };

  return (
    labels[post.value?.category] ??
    "이용 제보"
  );
});

const comments = computed(() => {
  return Array.isArray(
    post.value?.comments,
  )
    ? post.value.comments
    : [];
});

const modalTitle = computed(() => {
  return actionMode.value === "delete"
    ? "게시글 삭제"
    : "게시글 수정";
});

const modalDescription = computed(() => {
  return actionMode.value === "delete"
    ? "게시글을 삭제하려면 작성할 때 설정한 비밀번호를 입력해주세요."
    : "게시글을 수정하려면 작성할 때 설정한 비밀번호를 입력해주세요.";
});

const loadPost = () => {
  const foundPost =
    getCommunityPostById(
      route.params.postId,
    );

  if (!foundPost) {
    window.alert(
      "게시글을 찾지 못했습니다.",
    );

    router.replace({
      name: "community",
    });

    return;
  }

  post.value = foundPost;
};

const goToList = () => {
  router.push({
    name: "community",
  });
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
  const valid =
    verifyCommunityPostPassword(
      route.params.postId,
      password.value.trim(),
    );

  if (!valid) {
    passwordError.value =
      "비밀번호가 일치하지 않습니다.";

    return;
  }

  if (actionMode.value === "delete") {
    const confirmed =
      window.confirm(
        "정말 게시글을 삭제할까요?",
      );

    if (!confirmed) {
      return;
    }

    deleteCommunityPost(
      route.params.postId,
    );

    window.alert(
      "게시글이 삭제되었습니다.",
    );

    router.push({
      name: "community",
    });

    return;
  }

  window.sessionStorage.setItem(
    `community-edit-authorized:${route.params.postId}`,
    "true",
  );

  router.push({
    name: "community-edit",
    params: {
      postId: route.params.postId,
    },
  });
};

const toggleLike = () => {
  const updatedPost =
    toggleCommunityPostLike(
      route.params.postId,
    );

  if (updatedPost) {
    post.value = updatedPost;
  }
};

const openToiletMap = () => {
  const toiletName =
    post.value?.toiletName;

  if (!toiletName) {
    return;
  }

  const keyword =
    encodeURIComponent(toiletName);

  window.open(
    `https://map.kakao.com/link/search/${keyword}`,
    "_blank",
    "noopener,noreferrer",
  );
};

onMounted(() => {
  loadPost();
});
</script>

<template>
  <AppShell active="community">
    <main
      v-if="post"
      class="detail-page"
    >
      <BaseCard class="detail-card">
        <div class="detail-top">
          <button
            type="button"
            class="back-button"
            @click="goToList"
          >
            ← 목록
          </button>

          <div class="detail-actions">
            <button
              type="button"
              class="edit-button"
              @click="
                openPasswordModal('edit')
              "
            >
              수정
            </button>

            <button
              type="button"
              class="delete-button"
              @click="
                openPasswordModal('delete')
              "
            >
              삭제
            </button>
          </div>
        </div>

        <header class="detail-header">
          <BaseChip tone="soft">
            {{ categoryLabel }}
          </BaseChip>

          <h1>
            {{ post.title }}
          </h1>

          <p>
            익명 · {{ post.createdAt }}
          </p>
        </header>

        <div class="detail-divider" />

        <article class="detail-content">
          {{ post.content }}
        </article>

        <section class="toilet-card">
          <div class="toilet-card__information">
            <span>
              연관된 화장실
            </span>

            <strong>
              {{ post.toiletName }}
            </strong>

            <small>
              ★
              {{
                Number(
                  post.rating ?? 0,
                ).toFixed(1)
              }}
              ·
              {{
                post.operationStatus ??
                "운영 정보 확인 필요"
              }}
            </small>
          </div>

          <BaseButton
            variant="secondary"
            @click="openToiletMap"
          >
            지도 보기
          </BaseButton>
        </section>

        <div class="like-area">
          <button
            type="button"
            class="like-button"
            :class="{
              'like-button--active':
                post.liked,
            }"
            @click="toggleLike"
          >
            ♡ 공감
            {{ post.likeCount ?? 0 }}
          </button>
        </div>

        <section class="comment-section">
          <h2>
            댓글 {{ comments.length }}
          </h2>

          <div
            v-if="comments.length > 0"
            class="comment-list"
          >
            <article
              v-for="comment in comments"
              :key="comment.id"
              class="comment-item"
            >
              <strong>
                {{
                  comment.author ??
                  "익명 이용자"
                }}
              </strong>

              <p>
                {{ comment.content }}
              </p>

              <small>
                {{ comment.createdAt }}
              </small>
            </article>
          </div>

          <div
            v-else
            class="comment-empty"
          >
            아직 등록된 댓글이 없습니다.
          </div>
        </section>
      </BaseCard>

      <div
        v-if="actionMode"
        class="password-backdrop"
        @click.self="
          closePasswordModal
        "
      >
        <BaseCard class="password-modal">
          <div class="password-modal__header">
            <div>
              <span>
                PASSWORD CHECK
              </span>

              <h2>
                {{ modalTitle }}
              </h2>
            </div>

            <button
              type="button"
              class="password-modal__close"
              @click="
                closePasswordModal
              "
            >
              ×
            </button>
          </div>

          <p>
            {{ modalDescription }}
          </p>

          <form
            @submit.prevent="
              confirmPassword
            "
          >
            <input
              v-model="password"
              type="password"
              inputmode="numeric"
              placeholder="비밀번호 입력"
              autocomplete="current-password"
            />

            <small
              v-if="passwordError"
              class="password-error"
            >
              {{ passwordError }}
            </small>

            <div class="password-actions">
              <BaseButton
                type="button"
                variant="secondary"
                @click="
                  closePasswordModal
                "
              >
                취소
              </BaseButton>

              <BaseButton type="submit">
                확인
              </BaseButton>
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
  min-height: calc(
    100vh - var(--header-height, 72px)
  );
  padding: 38px 20px 75px;
  background:
    linear-gradient(
      180deg,
      #f1faf8 0%,
      #edf7f5 100%
    );
}

.detail-card {
  width: min(820px, 100%);
  padding: 28px 34px 34px;
  margin: 0 auto;
  border: 1px solid
    var(--color-border, #dce9e6);
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 18px 45px
    rgba(31, 81, 74, 0.07);
}

.detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.back-button,
.edit-button,
.delete-button {
  height: 34px;
  padding: 0 17px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.back-button {
  border: 0;
  background: #e8f7f3;
  color: #0d9f8c;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.edit-button {
  border: 1px solid #dce9e6;
  background: #ffffff;
  color: #173b38;
}

.delete-button {
  border: 1px solid #ffdddd;
  background: #fff5f5;
  color: #d95353;
}

.detail-header {
  margin-top: 25px;
}

.detail-header h1 {
  margin: 13px 0 8px;
  color: #173b38;
  font-size: clamp(
    24px,
    4vw,
    34px
  );
  line-height: 1.35;
  letter-spacing: -0.04em;
}

.detail-header p {
  margin: 0;
  color: #91a09d;
  font-size: 10px;
}

.detail-divider {
  height: 1px;
  margin: 26px 0;
  background: #dce9e6;
}

.detail-content {
  min-height: 125px;
  color: #294b47;
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-line;
}

.toilet-card {
  display: flex;
  padding: 20px;
  margin-top: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-radius: 16px;
  background: #e5f8f4;
}

.toilet-card__information {
  display: grid;
  gap: 5px;
}

.toilet-card__information span {
  color: #0d9f8c;
  font-size: 9px;
  font-weight: 900;
}

.toilet-card__information strong {
  color: #173b38;
  font-size: 13px;
}

.toilet-card__information small {
  color: #0d9f8c;
  font-size: 9px;
  font-weight: 700;
}

.like-area {
  display: flex;
  margin-top: 17px;
  justify-content: flex-end;
}

.like-button {
  height: 34px;
  padding: 0 15px;
  border: 1px solid #dce9e6;
  border-radius: 999px;
  background: #ffffff;
  color: #839390;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.like-button--active {
  border-color: #0d9f8c;
  color: #0d9f8c;
}

.comment-section {
  margin-top: 29px;
}

.comment-section h2 {
  margin: 0 0 14px;
  color: #173b38;
  font-size: 13px;
}

.comment-list {
  display: grid;
  gap: 9px;
}

.comment-item,
.comment-empty {
  padding: 15px 16px;
  border-radius: 12px;
  background: #fafdfc;
}

.comment-item strong {
  color: #173b38;
  font-size: 10px;
}

.comment-item p {
  margin: 7px 0;
  color: #607470;
  font-size: 12px;
  line-height: 1.6;
}

.comment-item small {
  color: #99a6a4;
  font-size: 8px;
}

.comment-empty {
  color: #8fa09d;
  font-size: 11px;
  text-align: center;
}

.password-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  padding: 20px;
  align-items: center;
  justify-content: center;
  background:
    rgba(16, 42, 39, 0.5);
}

.password-modal {
  width: min(420px, 100%);
  padding: 25px;
  border: 0;
}

.password-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.password-modal__header span {
  color: #0d9f8c;
  font-size: 9px;
  font-weight: 900;
}

.password-modal__header h2 {
  margin: 6px 0 0;
  color: #173b38;
  font-size: 22px;
}

.password-modal__close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #eef5f3;
  color: #173b38;
  cursor: pointer;
  font-size: 22px;
}

.password-modal > p {
  margin: 16px 0;
  color: #687b78;
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
  border: 1px solid #dce9e6;
  border-radius: 12px;
  outline: none;
  font-size: 13px;
}

.password-modal input:focus {
  border-color: #0d9f8c;
  box-shadow:
    0 0 0 3px
    rgba(13, 159, 140, 0.1);
}

.password-error {
  color: #c84f4f;
  font-size: 10px;
}

.password-actions {
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

  .toilet-card {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>