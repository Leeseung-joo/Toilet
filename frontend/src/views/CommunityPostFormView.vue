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
import {
  CATEGORY_OPTIONS,
  createCommunityPost,
  getCommunityPostById,
  updateCommunityPost,
} from "../stores/communityStore.js";
const STORAGE_KEY = "toilet-community-posts";

const route = useRoute();
const router = useRouter();

const categories = [
  {
    value: "REPORT",
    label: "이용 제보",
  },
  {
    value: "QUESTION",
    label: "질문",
  },
  {
    value: "REVIEW",
    label: "후기",
  },
];

const isEditMode = computed(() => {
  return route.name === "community-edit";
});

const pageEyebrow = computed(() => {
  return isEditMode.value
    ? "ANONYMOUS POST EDIT"
    : "ANONYMOUS POST";
});

const pageTitle = computed(() => {
  return isEditMode.value
    ? "작성한 정보를 수정해주세요"
    : "새로운 정보를 나눠주세요";
});

const pageDescription = computed(() => {
  return isEditMode.value
    ? "작성한 제보 내용을 확인하고 필요한 부분을 수정해주세요."
    : "주변 화장실의 이용을 더 편리하게 만드는 실시간 정보를 익명으로 나눠주세요.";
});

const submitLabel = computed(() => {
  return isEditMode.value
    ? "수정하기"
    : "등록하기";
});

const form = ref({
  category: "REPORT",
  toiletName: "",
  title: "",
  content: "",
  password: "",
});

const errors = ref({
  toiletName: "",
  title: "",
  content: "",
  password: "",
});

const isSubmitting = ref(false);

const getStoredPosts = () => {
  try {
    const rawValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "[커뮤니티 저장 데이터 파싱 실패]",
      error,
    );

    return [];
  }
};

const saveStoredPosts = (posts) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(posts),
  );
};

const getMockEditPost = (
  postId,
) => {
  const mockPosts = [
    {
      id: 1,
      category: "REPORT",
      toiletName:
        "대전역 동광장 공중화장실",
      title:
        "대전역 동광장 화장실 깨끗해요",
      content:
        "방금 이용했는데 바닥이 깨끗했고 휴지도 충분했습니다.",
      password: "1234",
    },
    {
      id: 2,
      category: "QUESTION",
      toiletName:
        "은행동 으능정이 공중화장실",
      title:
        "현재 사람이 많이 붐비나요?",
      content:
        "30분 안에 방문하려고 하는데 현재 혼잡도가 궁금합니다.",
      password: "1234",
    },
  ];

  return mockPosts.find(
    (post) =>
      String(post.id) ===
      String(postId),
  );
};

const loadEditPost = () => {
  if (!isEditMode.value) {
    return;
  }

  const postId = route.params.postId;

  const storedPost =
    getStoredPosts().find(
      (post) =>
        String(post.id) ===
        String(postId),
    );

  const post =
    storedPost ??
    getMockEditPost(postId);

  if (!post) {
    window.alert(
      "수정할 게시글을 찾지 못했습니다.",
    );

    router.replace({
      name: "community",
    });

    return;
  }

  form.value = {
    category:
      post.category ?? "REPORT",
    toiletName:
      post.toiletName ?? "",
    title:
      post.title ?? "",
    content:
      post.content ?? "",
    password: "",
  };
};

const clearErrors = () => {
  errors.value = {
    toiletName: "",
    title: "",
    content: "",
    password: "",
  };
};

const validateForm = () => {
  clearErrors();

  const toiletName =
    form.value.toiletName.trim();

  const title =
    form.value.title.trim();

  const content =
    form.value.content.trim();

  const password =
    form.value.password.trim();

  let valid = true;

  if (!toiletName) {
    errors.value.toiletName =
      "연관 화장실을 입력해주세요.";
    valid = false;
  }

  if (!title) {
    errors.value.title =
      "제목을 입력해주세요.";
    valid = false;
  }

  if (!content) {
    errors.value.content =
      "내용을 입력해주세요.";
    valid = false;
  }

  if (!/^\d{4,}$/.test(password)) {
    errors.value.password =
      "숫자 4자리 이상 입력해주세요.";
    valid = false;
  }

  return valid;
};

const cancel = () => {
  router.push({
    name: "community",
  });
};

const submitPost = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const posts = getStoredPosts();

    const payload = {
      category:
        form.value.category,
      toiletName:
        form.value.toiletName.trim(),
      title:
        form.value.title.trim(),
      content:
        form.value.content.trim(),
      password:
        form.value.password.trim(),
    };

    if (isEditMode.value) {
      const postId =
        String(route.params.postId);

      const targetIndex =
        posts.findIndex(
          (post) =>
            String(post.id) ===
            postId,
        );

      if (targetIndex >= 0) {
        posts[targetIndex] = {
          ...posts[targetIndex],
          ...payload,
          updatedAt:
            new Date().toISOString(),
        };
      } else {
        posts.unshift({
          id:
            Number(route.params.postId) ||
            Date.now(),
          author: "익명 이용자",
          createdAt: "수정됨",
          likeCount: 0,
          commentCount: 0,
          liked: false,
          ...payload,
          updatedAt:
            new Date().toISOString(),
        });
      }

      saveStoredPosts(posts);

      window.alert(
        "게시글이 수정되었습니다.",
      );
    } else {
      posts.unshift({
        id: Date.now(),
        author: "익명 이용자",
        createdAt: "방금 전",
        likeCount: 0,
        commentCount: 0,
        liked: false,
        ...payload,
      });

      saveStoredPosts(posts);

      window.alert(
        "게시글이 등록되었습니다.",
      );
    }

    router.push({
      name: "community",
    });
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  loadEditPost();
});
</script>

<template>
  <AppShell active="community">
    <main class="post-form-page">
      <BaseCard class="post-form-card">
        <header class="post-form-header">
          <span class="post-form-eyebrow">
            {{ pageEyebrow }}
          </span>

          <h1>
            {{ pageTitle }}
          </h1>

          <p>
            {{ pageDescription }}
          </p>
        </header>

        <form
          class="post-form"
          @submit.prevent="submitPost"
        >
          <fieldset class="form-fieldset">
            <legend>카테고리</legend>

            <div class="category-list">
              <button
                v-for="category in categories"
                :key="category.value"
                type="button"
                class="category-button"
                :class="{
                  'category-button--active':
                    form.category ===
                    category.value,
                }"
                @click="
                  form.category =
                    category.value
                "
              >
                {{ category.label }}
              </button>
            </div>
          </fieldset>

          <label class="form-field">
            <span class="form-label">
              연관 화장실
            </span>

            <input
              v-model="form.toiletName"
              type="text"
              placeholder="대전역 동광장 공중화장실"
              :aria-invalid="
                Boolean(errors.toiletName)
              "
            />

            <small
              v-if="errors.toiletName"
              class="form-error"
            >
              {{ errors.toiletName }}
            </small>
          </label>

          <label class="form-field">
            <span class="form-label">
              제목
            </span>

            <input
              v-model="form.title"
              type="text"
              maxlength="60"
              placeholder="제목을 입력하세요"
              :aria-invalid="
                Boolean(errors.title)
              "
            />

            <small class="form-count">
              {{ form.title.length }} / 60
            </small>

            <small
              v-if="errors.title"
              class="form-error"
            >
              {{ errors.title }}
            </small>
          </label>

          <label class="form-field">
            <span class="form-label">
              내용
            </span>

            <textarea
              v-model="form.content"
              rows="8"
              maxlength="500"
              placeholder="현재 이용 가능 여부, 청결 상태, 휴지 유무 등 도움이 될 정보를 적어주세요."
              :aria-invalid="
                Boolean(errors.content)
              "
            />

            <small class="form-count">
              {{ form.content.length }} / 500
            </small>

            <small
              v-if="errors.content"
              class="form-error"
            >
              {{ errors.content }}
            </small>
          </label>

          <label class="form-field">
            <span class="form-label">
              수정용 비밀번호
            </span>

            <input
              v-model="form.password"
              type="password"
              inputmode="numeric"
              autocomplete="new-password"
              placeholder="숫자 4자리 이상 입력"
              :aria-invalid="
                Boolean(errors.password)
              "
            />

            <small class="form-help">
              게시글을 수정하거나 삭제할 때
              사용합니다.
            </small>

            <small
              v-if="errors.password"
              class="form-error"
            >
              {{ errors.password }}
            </small>
          </label>

          <div class="post-form-actions">
            <BaseButton
              type="button"
              variant="secondary"
              @click="cancel"
            >
              취소
            </BaseButton>

            <BaseButton
              type="submit"
              :disabled="isSubmitting"
            >
              {{
                isSubmitting
                  ? "처리 중..."
                  : submitLabel
              }}
            </BaseButton>
          </div>
        </form>
      </BaseCard>
    </main>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.post-form-page {
  min-height: calc(
    100vh - var(--header-height, 72px)
  );
  padding: 34px 20px 70px;
  background:
    linear-gradient(
      180deg,
      #f1faf8 0%,
      #edf7f5 100%
    );
}

.post-form-card {
  width: min(720px, 100%);
  padding: 34px 40px 30px;
  margin: 0 auto;
  border: 1px solid
    var(--color-border, #dce9e6);
  border-radius: 22px;
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(31, 81, 74, 0.07);
}

.post-form-eyebrow {
  color:
    var(--color-primary, #0d9f8c);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.post-form-header h1 {
  margin: 8px 0 7px;
  color:
    var(--color-text, #173b38);
  font-size: 27px;
  letter-spacing: -0.04em;
}

.post-form-header p {
  margin: 0;
  color:
    var(--color-text-subtle, #718380);
  font-size: 12px;
  line-height: 1.65;
}

.post-form {
  display: grid;
  margin-top: 30px;
  gap: 21px;
}

.form-fieldset {
  padding: 0;
  margin: 0;
  border: 0;
}

.form-fieldset legend,
.form-label {
  display: block;
  margin-bottom: 9px;
  color:
    var(--color-text, #173b38);
  font-size: 12px;
  font-weight: 800;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-button {
  height: 34px;
  padding: 0 17px;
  border: 1px solid transparent;
  border-radius: 999px;
  background:
    var(--color-mint-100, #e8f7f3);
  color:
    var(--color-primary, #0d9f8c);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.category-button:hover {
  border-color:
    var(--color-primary, #0d9f8c);
}

.category-button--active {
  background:
    var(--color-text, #173b38);
  color: #ffffff;
}

.form-field {
  position: relative;
  display: grid;
}

.form-field input,
.form-field textarea {
  width: 100%;
  border: 1px solid
    var(--color-border, #d6e6e2);
  border-radius: 12px;
  outline: none;
  background:
    var(--color-surface-soft, #fbfefd);
  color:
    var(--color-text, #173b38);
  font: inherit;
  font-size: 13px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.form-field input {
  height: 46px;
  padding: 0 14px;
}

.form-field textarea {
  min-height: 150px;
  padding: 14px;
  resize: vertical;
  line-height: 1.65;
}

.form-field input:focus,
.form-field textarea:focus {
  border-color:
    var(--color-primary, #0d9f8c);
  box-shadow:
    0 0 0 3px rgba(13, 159, 140, 0.1);
}

.form-field input[aria-invalid="true"],
.form-field textarea[aria-invalid="true"] {
  border-color: #d85c5c;
}

.form-count {
  margin-top: 6px;
  color:
    var(--color-text-muted, #9aa8a5);
  font-size: 9px;
  text-align: right;
}

.form-help {
  margin-top: 7px;
  color:
    var(--color-text-muted, #91a09d);
  font-size: 10px;
}

.form-error {
  margin-top: 7px;
  color: #c64a4a;
  font-size: 10px;
}

.post-form-actions {
  display: flex;
  margin-top: 2px;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .post-form-page {
    padding: 20px 14px 50px;
  }

  .post-form-card {
    padding: 26px 20px 22px;
  }

  .post-form-header h1 {
    font-size: 23px;
  }

  .post-form-actions {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}
</style>
