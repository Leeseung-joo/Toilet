<script setup>
import {
  computed,
  onActivated,
  onMounted,
  ref,
} from "vue";
import { useRouter } from "vue-router";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseCard from "../components/common/BaseCard.vue";
import BaseChip from "../components/common/BaseChip.vue";
import CommunityPostCard from "../components/community/CommunityPostCard.vue";

import {
  getCommunityPosts,
  toggleCommunityPostLike,
} from "../stores/communityStore.js";

const router = useRouter();

const filters = [
  {
    value: "ALL",
    label: "전체",
  },
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

const posts = ref([]);
const selectedFilter = ref("ALL");
const sortOption = ref("LATEST");
const searchKeyword = ref("");

const loadPosts = () => {
  posts.value = getCommunityPosts();
};

const filteredPosts = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase();

  let result = posts.value.filter((post) => {
    const matchesFilter =
      selectedFilter.value === "ALL" ||
      post.category === selectedFilter.value;

    const searchableText = [
      post.title,
      post.content,
      post.toiletName,
    ]
      .map((value) =>
        String(value ?? "").toLowerCase(),
      )
      .join(" ");

    const matchesKeyword =
      !keyword ||
      searchableText.includes(keyword);

    return matchesFilter && matchesKeyword;
  });

  if (sortOption.value === "POPULAR") {
    result = [...result].sort(
      (first, second) =>
        Number(second.likeCount ?? 0) -
        Number(first.likeCount ?? 0),
    );
  }

  return result;
});

const selectFilter = (filter) => {
  selectedFilter.value = filter;
};

const toggleLike = (postId) => {
  toggleCommunityPostLike(postId);
  loadPosts();
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

onMounted(() => {
  loadPosts();
});

onActivated(() => {
  loadPosts();
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
            현재 이용 가능 여부, 질문과 후기를
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

      <section class="community-toolbar">
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
            placeholder="화장실명이나 게시글 내용 검색"
          />
        </div>

        <select
          v-model="sortOption"
          class="community-sort"
          aria-label="게시글 정렬"
        >
          <option value="LATEST">
            최신순
          </option>

          <option value="POPULAR">
            공감순
          </option>
        </select>
      </section>

      <section class="community-filter-list">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="community-filter"
          :class="{
            'community-filter--active':
              selectedFilter === filter.value,
          }"
          @click="selectFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </section>

      <section
        v-if="filteredPosts.length > 0"
        class="community-post-list"
      >
        <CommunityPostCard
          v-for="post in filteredPosts"
          :key="post.id"
          :post="post"
          @like="toggleLike"
          @open="openDetailPage"
        />
      </section>

      <BaseCard
        v-else
        class="community-empty"
      >
        <strong>
          조건에 맞는 게시글이 없습니다.
        </strong>

        <p>
          다른 필터를 선택하거나 새로운 글을 작성해보세요.
        </p>
      </BaseCard>
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
    var(--color-border, #dce9e6);
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
    var(--color-text, #173b38);
  font-size:
    clamp(30px, 4vw, 46px);
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
    var(--color-border, #dce9e6);
  border-radius: 15px;
  background: #ffffff;
}

.community-search:focus-within {
  border-color:
    var(--color-primary, #0d9f8c);
  box-shadow:
    0 0 0 3px
    rgba(13, 159, 140, 0.1);
}

.community-search svg {
  width: 18px;
  height: 18px;
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
    var(--color-text, #173b38);
  font-size: 13px;
}

.community-sort {
  height: 48px;
  padding: 0 38px 0 15px;
  border: 1px solid
    var(--color-border, #dce9e6);
  border-radius: 15px;
  outline: none;
  background: #ffffff;
  color:
    var(--color-text, #173b38);
  cursor: pointer;
  font-size: 13px;
}

.community-filter-list {
  display: flex;
  margin: 18px 0 24px;
  flex-wrap: wrap;
  gap: 8px;
}

.community-filter {
  height: 36px;
  padding: 0 16px;
  border: 1px solid
    var(--color-border, #dce9e6);
  border-radius: 999px;
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

.community-filter:hover,
.community-filter--active {
  border-color:
    var(--color-primary, #0d9f8c);
  background:
    var(--color-primary, #0d9f8c);
  color: #ffffff;
}

.community-post-list {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 18px;
}

.community-empty {
  padding: 64px 24px;
  text-align: center;
}

.community-empty strong {
  color:
    var(--color-text, #173b38);
  font-size: 16px;
}

.community-empty p {
  margin: 8px 0 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 12px;
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

  .community-sort {
    width: 100%;
  }

  .community-post-list {
    grid-template-columns: 1fr;
  }
}
</style>