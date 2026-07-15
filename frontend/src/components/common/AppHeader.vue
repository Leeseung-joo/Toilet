<script setup>
import { RouterLink } from "vue-router";

defineProps({
  active: {
    type: String,
    default: "",
  },
});

const navigationItems = [
  {
    key: "chatbot",
    label: "AI 챗봇",
    to: "/chatbot",
  },
  {
    key: "community",
    label: "커뮤니티",
    to: "/community",
  },
  {
    key: "map",
    label: "↔ 내 위치",
    to: "/map",
  },
];
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink to="/" class="app-header__brand">
        <span class="app-header__logo">
          <svg
            class="app-header__toilet-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <!-- 변기 물탱크 -->
            <rect
              x="6"
              y="3"
              width="6"
              height="7"
              rx="1.4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            />

            <!-- 물 내리는 버튼 -->
            <path
              d="M8 5.5H10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />

            <!-- 변기 시트 -->
            <path
              d="M8.2 10H17.7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />

            <!-- 변기 본체 -->
            <path
              d="M8.5 10.2V12.6C8.5 15.1 10.3 17 12.8 17H13.7C16.2 17 18 15.2 18 12.7V11.4C18 10.7 17.4 10.2 16.8 10.2H8.5Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- 변기 받침대 -->
            <path
              d="M12.2 17V20H17"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <span class="app-header__brand-text">
          <strong>싸슈</strong>
          <small>급할수록 가까운 곳부터!</small>
        </span>
      </RouterLink>

      <nav
        class="app-header__navigation"
        aria-label="주요 메뉴"
      >
        <RouterLink
          v-for="item in navigationItems"
          :key="item.key"
          :to="item.to"
          class="app-header__nav-item"
          :class="{
            'app-header__nav-item--active':
              active === item.key,
            'app-header__nav-item--location':
              item.key === 'map',
          }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  z-index: 20;
  height: var(--header-height);
  border-bottom: 1px solid rgba(7, 153, 135, 0.08);
  background: var(--color-surface);
  box-shadow: var(--shadow-small);
}

.app-header__inner {
  display: flex;
  width: min(calc(100% - 40px), var(--page-width));
  height: 100%;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
}

.app-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.app-header__logo {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 4px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  background: var(--color-primary-dark);
  color: #ffffff;
  box-shadow:
    0 8px 20px rgba(4, 91, 80, 0.24),
    0 0 0 1px rgba(7, 153, 135, 0.08);
}

.app-header__toilet-icon {
  width: 23px;
  height: 23px;
}

.app-header__brand-text {
  display: flex;
  flex-direction: column;
}

.app-header__brand-text strong {
  color: var(--color-text);
  font-size: 20px;
  line-height: 1.1;
}

.app-header__brand-text small {
  margin-top: 4px;
  color: var(--color-text-subtle);
  font-size: 10px;
}

.app-header__navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__nav-item {
  display: inline-flex;
  min-width: 86px;
  min-height: 34px;
  padding: 0 18px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--color-mint-100);
  color: var(--color-primary-dark);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.app-header__nav-item:hover {
  background: var(--color-mint-200);
  transform: translateY(-1px);
}

.app-header__nav-item--active,
.app-header__nav-item--location {
  background: var(--color-primary);
  color: #ffffff;
}

.app-header__nav-item--active:hover,
.app-header__nav-item--location:hover {
  background: var(--color-primary-hover);
}

@media (max-width: 680px) {
  .app-header__inner {
    width: calc(100% - 24px);
  }

  .app-header__logo {
    width: 38px;
    height: 38px;
    border-width: 3px;
  }

  .app-header__toilet-icon {
    width: 21px;
    height: 21px;
  }

  .app-header__brand-text small {
    display: none;
  }

  .app-header__navigation {
    gap: 6px;
  }

  .app-header__nav-item {
    min-width: auto;
    min-height: 32px;
    padding: 0 11px;
    font-size: 11px;
  }
}
</style>