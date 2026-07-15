<script setup>
import {
  computed,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useRouter } from "vue-router";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseCard from "../components/common/BaseCard.vue";
import BaseChip from "../components/common/BaseChip.vue";

import {
  getCommunityPostDetail,
  getCommunityPosts,
} from "../api/communityApi.js";

const router = useRouter();

const posts = ref([]);
const searchKeyword = ref("");
const appliedKeyword = ref("");

const loading = ref(false);
const errorMessage = ref("");

const pagination = reactive({
  page: 1,
  size: 20,
  totalElements: 0,
  totalPages: 0,
});

const visiblePageNumbers = computed(() => {
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;

  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  let startPage = Math.max(
    1,
    currentPage - 2,
  );

  let endPage = Math.min(
    totalPages,
    startPage + 4,
  );

  if (endPage - startPage < 4) {
    startPage = Math.max(
      1,
      endPage - 4,
    );
  }

  return Array.from(
    {
      length:
        endPage -
        startPage +
        1,
    },
    (_, index) =>
      startPage + index,
  );
});

const normalizePost = (post) => {
  return {
    id: post.post_id,

    toiletId:
      post.toilet?.toilet_id ??
      null,

    toiletName:
      post.toilet?.name ??
      "화장실 정보 없음",

    nickname:
      post.nickname ??
      "익명",

    title:
      post.title ??
      "제목 없음",

    content:
      post.content ??
      "",

    commentCount:
      post.comment_count ?? 0,

    createdAt:
      post.created_at,

    updatedAt:
      post.updated_at,
  };
};

const loadPosts = async (page = 1) => {
  if (loading.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response =
      await getCommunityPosts({
        keyword:
          appliedKeyword.value,
        page,
        size: pagination.size,
      });

    const normalizedPosts = (
      response?.items ?? []
    ).map(normalizePost);

    posts.value = await Promise.all(
      normalizedPosts.map(
        async (post) => {
          if (post.content) {
            return post;
          }

          try {
            const detail =
              await getCommunityPostDetail(
                post.id,
              );

            return normalizePost({
              ...detail,
              comment_count:
                detail?.comment_count ??
                post.commentCount,
            });
          } catch {
            return post;
          }
        },
      ),
    );

    const pageInfo =
      response?.pagination ?? {};

    pagination.page =
      pageInfo.page ?? page;

    pagination.size =
      pageInfo.size ??
      pagination.size;

    pagination.totalElements =
      pageInfo.total_elements ?? 0;

    pagination.totalPages =
      pageInfo.total_pages ?? 0;
  } catch (error) {
    posts.value = [];

    pagination.totalElements = 0;
    pagination.totalPages = 0;

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "게시글을 불러오지 못했습니다.";
  } finally {
    loading.value = false;
  }
};

const searchPosts = () => {
  appliedKeyword.value =
    searchKeyword.value.trim();

  loadPosts(1);
};

const resetSearch = () => {
  searchKeyword.value = "";
  appliedKeyword.value = "";

  loadPosts(1);
};

const changePage = (page) => {
  if (
    loading.value ||
    page < 1 ||
    page > pagination.totalPages ||
    page === pagination.page
  ) {
    return;
  }

  loadPosts(page);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const openCreatePage = () => {
  router.push({
    name: "community-create",
  });
};

const openDetailPage = (post) => {
  router.push({
    name: "community-detail",
    params: {
      postId: post.id,
    },
  });
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  const date =
    new Date(dateString);

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

onMounted(() => {
  loadPosts(1);
});
</script>

<template>
  <AppShell active="community">
    <main class="community-view">
      <section class="community-hero">
        <div>
          <BaseChip tone="soft">
            실시간 익명 제보
          </BaseChip>

          <h1>
            지금, 화장실은 어때요?
          </h1>

          <p>
            현재 이용 가능 여부와 이용 후기를
            익명으로 공유할 수 있습니다.
          </p>
        </div>

        <BaseButton
          size="large"
          @click="openCreatePage"
        >
          제보 작성하기
        </BaseButton>
      </section>

      <form
        class="community-toolbar"
        @submit.prevent="searchPosts"
      >
        <div class="community-search">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />

            <path
              d="M16 16L21 21"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>

          <input
            v-model="searchKeyword"
            type="search"
            maxlength="100"
            placeholder="제목 또는 내용 검색"
          />
        </div>

        <BaseButton
          type="submit"
          :disabled="loading"
        >
          검색
        </BaseButton>

        <button
          v-if="appliedKeyword"
          type="button"
          class="community-reset-button"
          :disabled="loading"
          @click="resetSearch"
        >
          초기화
        </button>
      </form>

      <div
        v-if="appliedKeyword"
        class="community-search-result"
      >
        <strong>
          ‘{{ appliedKeyword }}’
        </strong>

        검색 결과
        {{ pagination.totalElements }}건
      </div>

      <BaseCard
        v-if="loading"
        class="community-status"
      >
        <div class="loading-spinner" />

        <strong>
          게시글을 불러오는 중입니다.
        </strong>

        <p>
          Render 서버가 처음 실행되는 경우
          잠시 시간이 걸릴 수 있습니다.
        </p>
      </BaseCard>

      <BaseCard
        v-else-if="errorMessage"
        class="
          community-status
          community-status--error
        "
      >
        <strong>
          게시글을 불러오지 못했습니다.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <BaseButton
          @click="loadPosts(pagination.page || 1)"
        >
          다시 시도
        </BaseButton>
      </BaseCard>

      <section
        v-else-if="posts.length > 0"
        class="community-post-list"
      >
        <article
          v-for="post in posts"
          :key="post.id"
          class="community-post-card"
          tabindex="0"
          role="button"
          @click="openDetailPage(post)"
          @keydown.enter="openDetailPage(post)"
          @keydown.space.prevent="openDetailPage(post)"
        >
          <div class="community-post-header">
            <span class="community-toilet-name">
              {{ post.toiletName }}
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
          </div>

          <h2>
            {{ post.title }}
          </h2>

          <p
            v-if="post.content"
            class="community-post-content"
          >
            {{ post.content }}
          </p>

          <div class="community-post-footer">
            <span class="community-nickname">
              {{ post.nickname }}
            </span>

            <span class="community-comment-count">
              댓글
              {{ post.commentCount }}
            </span>
          </div>
        </article>
      </section>

      <BaseCard
        v-else
        class="community-empty"
      >
        <strong>
          등록된 게시글이 없습니다.
        </strong>

        <p>
          첫 번째 이용 후기를 작성해보세요.
        </p>

        <BaseButton
          @click="openCreatePage"
        >
          제보 작성하기
        </BaseButton>
      </BaseCard>

      <nav
        v-if="
          !loading &&
          !errorMessage &&
          pagination.totalPages > 1
        "
        class="community-pagination"
        aria-label="게시글 페이지"
      >
        <button
          type="button"
          :disabled="
            pagination.page <= 1
          "
          @click="
            changePage(
              pagination.page - 1,
            )
          "
        >
          이전
        </button>

        <button
          v-for="pageNumber in visiblePageNumbers"
          :key="pageNumber"
          type="button"
          :class="{
            'community-pagination--active':
              pageNumber ===
              pagination.page,
          }"
          @click="
            changePage(pageNumber)
          "
        >
          {{ pageNumber }}
        </button>

        <button
          type="button"
          :disabled="
            pagination.page >=
            pagination.totalPages
          "
          @click="
            changePage(
              pagination.page + 1,
            )
          "
        >
          다음
        </button>
      </nav>
    </main>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.community-view {
  width: min(
    1120px,
    calc(100% - 40px)
  );
  padding: 48px 0 80px;
  margin: 0 auto;
}

.community-hero {
  display: flex;
  padding: 36px 40px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 28px;
  background:
    linear-gradient(
      135deg,
      #f2fbf9 0%,
      #e8f7f3 100%
    );
}

.community-hero h1 {
  margin: 15px 0 12px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size:
    clamp(
      30px,
      4vw,
      46px
    );
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.community-hero p {
  max-width: 580px;
  margin: 0;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 14px;
  line-height: 1.7;
}

.community-toolbar {
  display: flex;
  margin-top: 30px;
  align-items: center;
  gap: 12px;
}

.community-search {
  display: flex;
  height: 48px;
  padding: 0 16px;
  flex: 1;
  align-items: center;
  gap: 10px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 15px;
  background: #ffffff;
}

.community-search:focus-within {
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

.community-search svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
}

.community-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 13px;
}

.community-reset-button {
  height: 48px;
  padding: 0 16px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 14px;
  background: #ffffff;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  cursor: pointer;
  font-weight: 700;
}

.community-reset-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.community-search-result {
  margin: 18px 2px;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 13px;
}

.community-search-result strong {
  color:
    var(
      --color-primary,
      #0d9f8c
    );
}

.community-post-list {
  display: grid;
  margin-top: 24px;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 18px;
}

.community-post-card {
  min-width: 0;
  padding: 24px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 20px;
  background: #ffffff;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.community-post-card:hover {
  border-color:
    rgba(
      13,
      159,
      140,
      0.45
    );
  box-shadow:
    0 14px 32px
    rgba(
      23,
      59,
      56,
      0.08
    );
  transform:
    translateY(-2px);
}

.community-post-card:focus-visible {
  outline: 3px solid
    rgba(
      13,
      159,
      140,
      0.2
    );
}

.community-post-header {
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 12px;
}

.community-toilet-name {
  overflow: hidden;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-post-header time {
  flex-shrink: 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 11px;
}

.community-post-card h2 {
  display: -webkit-box;
  overflow: hidden;
  min-height: 52px;
  margin: 18px 0 10px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 18px;
  line-height: 1.45;
  letter-spacing: -0.02em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.community-post-content {
  display: -webkit-box;
  overflow: hidden;
  min-height: 44px;
  margin: 0 0 22px;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.community-post-footer {
  display: flex;
  padding-top: 16px;
  align-items: center;
  justify-content:
    space-between;
  border-top: 1px solid
    var(
      --color-border,
      #edf3f2
    );
}

.community-nickname {
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 12px;
  font-weight: 700;
}

.community-comment-count {
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 12px;
}

.community-status,
.community-empty {
  display: flex;
  min-height: 240px;
  margin-top: 24px;
  padding: 48px 24px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.community-status strong,
.community-empty strong {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 16px;
}

.community-status p,
.community-empty p {
  margin: 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 12px;
  line-height: 1.6;
}

.community-status--error {
  border-color:
    rgba(
      220,
      70,
      70,
      0.25
    );
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid
    #dce9e6;
  border-top-color:
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 50%;
  animation:
    community-spin
    0.8s linear infinite;
}

.community-pagination {
  display: flex;
  margin-top: 32px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.community-pagination button {
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 11px;
  background: #ffffff;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.community-pagination button:hover:not(
    :disabled
  ),
.community-pagination
  .community-pagination--active {
  border-color:
    var(
      --color-primary,
      #0d9f8c
    );
  background:
    var(
      --color-primary,
      #0d9f8c
    );
  color: #ffffff;
}

.community-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

@keyframes community-spin {
  to {
    transform:
      rotate(360deg);
  }
}

@media (max-width: 760px) {
  .community-view {
    width: min(
      100% - 28px,
      1120px
    );
    padding-top: 28px;
  }

  .community-hero {
    padding: 28px 24px;
    align-items: stretch;
    flex-direction: column;
  }

  .community-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .community-toolbar
    > button {
    width: 100%;
  }

  .community-post-list {
    grid-template-columns: 1fr;
  }
}
</style>
