<script setup>
import { ref } from "vue";

import ChatbotWidget from "../chat/ChatbotWidget.vue";
import AppHeader from "./AppHeader.vue";

defineProps({
  active: {
    type: String,
    default: "",
  },

  fluid: {
    type: Boolean,
    default: false,
  },
});

const isChatbotOpen = ref(false);

const toggleChatbot = () => {
  isChatbotOpen.value =
    !isChatbotOpen.value;
};

const closeChatbot = () => {
  isChatbotOpen.value = false;
};
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :active="active"
      :chatbot-open="isChatbotOpen"
      @toggle-chatbot="toggleChatbot"
    />

    <main
      class="app-shell__content"
      :class="{ 'app-shell__content--fluid': fluid }"
    >
      <slot />
    </main>

    <ChatbotWidget
      :open="isChatbotOpen"
      @close="closeChatbot"
    />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-background);
}

.app-shell__content {
  width: min(calc(100% - 40px), var(--page-width));
  margin: 0 auto;
  padding: 54px 0 80px;
}

.app-shell__content--fluid {
  width: 100%;
  max-width: none;
  padding: 0;
}

@media (max-width: 680px) {
  .app-shell__content {
    width: calc(100% - 24px);
    padding-top: 32px;
  }

  .app-shell__content--fluid {
    width: 100%;
  }
}
</style>
