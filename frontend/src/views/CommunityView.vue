<script setup>
import {
  computed,
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
const STORAGE_KEY = "toilet-community-posts";

const router = useRouter();

const filters = [
  {
    value: "ALL",
    label: "전체",
  },
  {
    value: "CLEAN",
    label: "청결",
  },
  {
    value: "CROWDED",
    label: "혼잡",
  },
  {
    value: "TISSUE",
    label: "휴지",
  },
  {
    value: "BROKEN",
    label: "시설 고장",
  },
  {
    value: "SAFETY",
    label: "안전",
  },
];

const defaultPosts = [
  {
    id: 1,
    author: "익명 이용자",
    createdAt: "10분 전",
    category: "CLEAN",
    title: "대전역 동광장 화장실 깨끗해요",
    content:
      "방금 이용했는데 바닥이 깨끗했고 휴지도 충분했습니다. 대전역 근처에서 급하신 분들은 동광장 쪽을 이용해보세요.",
    toiletName: "대전역 동광장 공중화장실",
    likeCount: 18,
    commentCount: 4,
    liked: false,
  },
  {
    id: 2,
    author: "익명 이용자",
    createdAt: "25분 전",
    category: "CROWDED",
    title: "은행동 화장실 지금 사람이 많아요",
    content:
      "현재 줄이 조금 길어요. 급한 분들은 중앙로역 쪽 화장실을 이용하는 게 더 빠를 것 같습니다.",
    toiletName: "은행동 으능정이 공중화장실",
    likeCount: 11,
    commentCount: 7,
    liked: true,
  },
  {
    id: 3,
    author: "익명 이용자",
    createdAt: "42분 전",
    category: "TISSUE",
    title: "휴지가 거의 없어요",
    content:
      "여자 화장실 첫 번째 칸에 휴지가 거의 없습니다. 관리하시는 분이 확인해주시면 좋겠습니다.",
    toiletName: "서대전공원 공중화장실",
    likeCount: 8,
    commentCount: 2,
    liked: false,
  },
  {
    id: 4,
    author: "익명 이용자",
    createdAt: "1시간 전",
    category: "BROKEN",
    title: "세면대 하나가 고장 난 것 같아요",
    content:
      "왼쪽 세면대에서 물이 나오지 않습니다. 나머지 세면대는 정상적으로 이용할 수 있어요.",
    toiletName: "한밭수목원 동원 화장실",
    likeCount: 6,
    commentCount: 3,
    liked: false,
  },
  {
    id: 5,
    author: "익명 이용자",
    createdAt: "2시간 전",
    category: "SAFETY",
    title: "야간에도 주변이 밝아서 이용하기 편했어요",
    content:
      "입구와 주변 가로등이 밝고 사람이 다니는 길과 가까워서 늦은 시간에도 비교적 안심됐습니다.",
    toiletName: "대전시청 남문 공중화장실",
    likeCount: 24,
    commentCount: 5,
    liked: true,
  },
  {
    id: 6,
    author: "익명 이용자",
    createdAt: "3시간 전",
    category: "CLEAN",
    title: "청소 직후라 상태가 좋아요",
    content:
      "관리하시는 분이 방금 청소를 마치셔서 전체적으로 깨끗합니다. 기저귀 교환대도 정돈되어 있었어요.",
    toiletName: "엑스포시민광장 공중화장실",
    likeCount: 15,
    commentCount: 1,
    liked: false,
  },
];

const posts = ref([]);
const selectedFilter = ref("ALL");
const sortOption = ref("LATEST");
const searchKeyword = ref("");

const readStoredPosts = () => {
  try {
    const rawValue =
      window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "[커뮤니티 게시글 불러오기 실패]",
      error,
    );

    return [];
  }
};

const loadPosts = () => {
  const storedPosts = readStoredPosts();

  const storedIds = new Set(
    storedPosts.map((post) =>
      String(post.id),
    ),
  );

  posts.value = [
    ...storedPosts,
    ...defaultPosts.filter(
      (post) =>
        !storedIds.has(String(post.id)),
    ),
  ];
};

const filteredPosts = computed(() => {
  const keyword =
    searchKeyword.value
      .trim()
      .toLowerCase();

  let result = posts.value.filter((post) => {
    const category =
      post.category ?? "CLEAN";

    const matchesFilter =
      selectedFilter.value === "ALL" ||
      category === selectedFilter.value;

    const title =
      String(post.title ?? "").toLowerCase();

    const content =
      String(post.content ?? "").toLowerCase();

    const toiletName =
      String(post.toiletName ?? "").toLowerCase();

    const matchesKeyword =
      !keyword ||
      title.includes(keyword) ||
      content.includes(keyword) ||
      toiletName.includes(keyword);

    return (
      matchesFilter &&
      matchesKeyword
    );
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
  const post = posts.value.find(
    (item) =>
      String(item.id) ===
      String(postId),
  );

  if (!post) {
    return;
  }

  post.liked = !post.liked;
  post.likeCount =
    Number(post.likeCount ?? 0) +
    (post.liked ? 1 : -1);
};

const openCreatePage = () => {
  router.push({
    name: "community-create",
  });
};

const openEditPage = (post) => {
  router.push({
    name: "community-edit",
    params: {
      postId: post.id,
    },
  });
};

onMounted(() => {
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
            청결도, 혼잡도, 휴지 여부와 시설 고장 정보를
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
            placeholder="화장실명이나 제보 내용 검색"
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
          @open="openEditPage"
        />
      </section>

      <BaseCard
        v-else
        class="community-empty"
      >
        <strong>
          조건에 맞는 제보가 없습니다.
        </strong>

        <p>
          다른 필터를 선택하거나 새로운 제보를 작성해보세요.
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
  width: min(1120px, calc(100% - 40px));
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
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.community-hero p {
  max-width: 580px;
  margin: 0;
  color:
    var(--color-text-subtle, #657976);
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
    0 0 0 3px rgba(13, 159, 140, 0.1);
}

.community-search svg {
  width: 18px;
  height: 18px;
  color:
    var(--color-text-muted, #8fa09d);
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
    var(--color-text-subtle, #657976);
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
    repeat(2, minmax(0, 1fr));
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
    var(--color-text-muted, #8fa09d);
  font-size: 12px;
}

@media (max-width: 760px) {
  .community-view {
    width: min(100% - 28px, 1120px);
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
