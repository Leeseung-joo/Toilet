<script setup>
import { RouterLink } from "vue-router";

defineProps({
  active: {
    type: String,
    default: "",
  },

  chatbotOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-chatbot",
]);

const navigationItems = [
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
      <RouterLink
        to="/"
        class="app-header__brand"
        aria-label="싸슈 홈으로 이동"
      >
        <span class="app-header__logo">
          <img
            src="/image/toilet-logo.svg"
            alt="싸슈 로고"
            class="app-header__logo-image"
          />
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
        <button
          type="button"
          class="app-header__nav-item"
          :class="{
            'app-header__nav-item--active':
              chatbotOpen,
          }"
          :aria-expanded="chatbotOpen"
          aria-controls="chatbot-title"
          @click="
            emit('toggle-chatbot')
          "
        >
          AI 챗봇
        </button>

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
  border-bottom: 1px solid
    rgba(7, 153, 135, 0.08);
  background: var(--color-surface);
  box-shadow: var(--shadow-small);
}

.app-header__inner {
  display: flex;
  width: min(
    calc(100% - 40px),
    var(--page-width)
  );
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
  overflow: hidden;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    0 8px 20px
      rgba(4, 91, 80, 0.2),
    0 0 0 1px
      rgba(7, 153, 135, 0.08);
}

.app-header__logo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  border: 0;
  background: var(--color-mint-100);
  color: var(--color-primary-dark);
  cursor: pointer;
  font-family: inherit;
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
