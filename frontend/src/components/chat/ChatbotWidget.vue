<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import {
  useRouter,
} from "vue-router";

import {
  sendChatMessage,
} from "../../api/chatApi.js";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const router = useRouter();

const quickQuestions = [
  "가장 가까운 화장실 알려줘",
  "지금 운영 중인 화장실 알려줘",
  "장애인 화장실 찾아줘",
  "깨끗한 화장실 추천해줘",
];

const messages = ref([
  {
    id: "welcome",
    role: "assistant",
    content:
      "안녕하세요! 현재 위치 주변의 화장실을 찾아드릴게요.",
    places: [],
    isError: false,
  },
]);

const inputMessage = ref("");
const sending = ref(false);
const currentLocation = ref(null);
const conversationId = ref("");
const messageListRef = ref(null);
const inputRef = ref(null);

let messageId = 0;
let requestController = null;

const canSend = computed(() => {
  return (
    inputMessage.value.trim().length > 0 &&
    !sending.value
  );
});

const createMessage = ({
  role,
  content,
  places = [],
  isError = false,
}) => {
  messageId += 1;

  return {
    id: `${Date.now()}-${messageId}`,
    role,
    content,
    places,
    isError,
  };
};

const scrollToBottom = async () => {
  await nextTick();

  if (!messageListRef.value) {
    return;
  }

  messageListRef.value.scrollTop =
    messageListRef.value.scrollHeight;
};

const focusInput = async () => {
  await nextTick();
  inputRef.value?.focus();
};

const closeWidget = () => {
  emit("close");
};

const getLocationErrorMessage = (
  error,
) => {
  if (error?.code === 1) {
    return "위치 권한이 거부되었습니다. 브라우저에서 위치 권한을 허용해주세요.";
  }

  if (error?.code === 3) {
    return "현재 위치 확인 시간이 초과되었습니다.";
  }

  return "현재 위치를 확인할 수 없습니다.";
};

const getCurrentLocation = () => {
  if (currentLocation.value) {
    return Promise.resolve(
      currentLocation.value,
    );
  }

  if (!navigator.geolocation) {
    return Promise.reject(
      new Error(
        "현재 위치를 확인할 수 없습니다.",
      ),
    );
  }

  return new Promise(
    (resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { coords } =
            position;

          currentLocation.value = {
            latitude: Number(
              coords.latitude,
            ),
            longitude: Number(
              coords.longitude,
            ),
          };

          resolve(
            currentLocation.value,
          );
        },
        (error) => {
          reject(
            new Error(
              getLocationErrorMessage(
                error,
              ),
            ),
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        },
      );
    },
  );
};

const normalizePlaceType = (place) => {
  const rawPlaceType =
    place.place_type ??
    place.placeType ??
    place.type ??
    place.category ??
    "";

  const placeType = String(
    rawPlaceType,
  ).toUpperCase();

  if (
    placeType === "PUBLIC_TOILET" ||
    placeType === "TOILET"
  ) {
    return "PUBLIC_TOILET";
  }

  if (
    placeType ===
      "PRIVATE_FACILITY_CANDIDATE" ||
    placeType === "CANDIDATE"
  ) {
    return "PRIVATE_FACILITY_CANDIDATE";
  }

  if (placeType === "RESTAURANT") {
    return "RESTAURANT";
  }

  if (
    place.toilet_id != null ||
    place.toiletId != null
  ) {
    return "PUBLIC_TOILET";
  }

  if (
    place.candidate_id != null ||
    place.candidateId != null
  ) {
    return "PRIVATE_FACILITY_CANDIDATE";
  }

  if (
    place.restaurant_id != null ||
    place.restaurantId != null
  ) {
    return "RESTAURANT";
  }

  return "";
};

const normalizePlaceId = (place) => {
  return (
    place.place_id ??
    place.placeId ??
    place.toilet_id ??
    place.toiletId ??
    place.candidate_id ??
    place.candidateId ??
    place.restaurant_id ??
    place.restaurantId ??
    place.id ??
    null
  );
};

const normalizePlace = (place) => {
  return {
    placeType:
      normalizePlaceType(place),
    placeId: normalizePlaceId(place),
    name:
      place.name ??
      "이름 없는 장소",
    latitude:
      Number(place.latitude),
    longitude:
      Number(place.longitude),
    distanceMeters:
      place.distance_meters ??
      place.distanceMeters ??
      null,
    candidateConfidence:
      place.candidate_confidence ??
      place.candidateConfidence ??
      "",
    verificationStatus:
      place.verification_status ??
      place.verificationStatus ??
      "",
  };
};

const normalizePlaces = (places) => {
  if (!Array.isArray(places)) {
    return [];
  }

  return places.map(normalizePlace);
};

const getResponseConversationId = (
  response,
) => {
  const nextConversationId =
    response?.conversationId ??
    response?.conversation_id ??
    response?.conversation?.id ??
    response?.threadId ??
    response?.thread_id ??
    "";

  return nextConversationId
    ? String(nextConversationId)
    : "";
};

const formatDistance = (distance) => {
  const meters = Number(distance);

  if (!Number.isFinite(meters)) {
    return "";
  }

  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
};

const getPlaceTypeLabel = (
  placeType,
) => {
  const labels = {
    PUBLIC_TOILET: "공공화장실",
    PRIVATE_FACILITY_CANDIDATE:
      "민간시설 후보",
  };

  return labels[placeType] || "화장실";
};

const openPlaceOnMap = (place) => {
  const placeType =
    place.placeType ||
    "PUBLIC_TOILET";

  if (
    place.placeId &&
    placeType !== "RESTAURANT"
  ) {
    router.push({
      name: "home",
      query: {
        placeId: String(place.placeId),
        toiletId: String(place.placeId),
        placeType,
        name: place.name,
        latitude: String(place.latitude),
        longitude: String(place.longitude),
      },
    });

    closeWidget();
    return;
  }

  if (
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude)
  ) {
    return;
  }

  const name = encodeURIComponent(
    place.name,
  );

  window.open(
    `https://map.kakao.com/link/map/${name},${place.latitude},${place.longitude}`,
    "_blank",
    "noopener,noreferrer",
  );
};

const addAssistantError = async (
  content,
) => {
  messages.value.push(
    createMessage({
      role: "assistant",
      content:
        content ||
        "죄송해요. 정보를 불러오지 못했습니다. 잠시 후 다시 질문해주세요.",
      places: [],
      isError: true,
    }),
  );

  await scrollToBottom();
};

const sendMessage = async (
  content = inputMessage.value,
) => {
  const message = String(content).trim();

  if (!message || sending.value) {
    return;
  }

  if (requestController) {
    requestController.abort();
  }

  inputMessage.value = "";
  sending.value = true;

  messages.value.push(
    createMessage({
      role: "user",
      content: message,
    }),
  );

  const loadingMessage =
    createMessage({
      role: "assistant",
      content: "답변을 준비하고 있어요...",
    });

  messages.value.push(
    loadingMessage,
  );

  await scrollToBottom();

  try {
    const {
      latitude,
      longitude,
    } = await getCurrentLocation();

    requestController =
      new AbortController();

    console.log("[챗봇 API 요청]", {
      message,
      latitude,
      longitude,
      conversationId:
        conversationId.value ||
        null,
    });

    const response =
      await sendChatMessage({
        message,
        latitude,
        longitude,
        conversationId:
          conversationId.value ||
          undefined,
        signal:
          requestController.signal,
      });

    console.log("[챗봇 API 응답]", response);

    const nextConversationId =
      getResponseConversationId(
        response,
      );

    if (nextConversationId) {
      conversationId.value =
        nextConversationId;
    }

    const responseMessage =
      typeof response?.message ===
        "string" &&
      response.message.trim()
        ? response.message
        : "응답 메시지가 없습니다.";

    const index =
      messages.value.findIndex(
        (item) =>
          item.id ===
          loadingMessage.id,
      );

    if (index >= 0) {
      messages.value[index] =
        createMessage({
          role: "assistant",
          content: responseMessage,
          places: normalizePlaces(
            response?.places,
          ),
        });
    }
  } catch (error) {
    const index =
      messages.value.findIndex(
        (item) =>
          item.id ===
          loadingMessage.id,
      );

    if (error?.name === "AbortError") {
      if (index >= 0) {
        messages.value.splice(
          index,
          1,
        );
      }

      return;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "죄송해요. 정보를 불러오지 못했습니다. 잠시 후 다시 질문해주세요.";

    if (index >= 0) {
      messages.value[index] =
        createMessage({
          role: "assistant",
          content: errorMessage,
          places: [],
          isError: true,
        });
    } else {
      await addAssistantError(
        errorMessage,
      );
    }
  } finally {
    sending.value = false;
    requestController = null;
    await scrollToBottom();
    await focusInput();
  }
};

const handleSubmit = () => {
  sendMessage();
};

const handleKeydown = (event) => {
  if (
    event.key === "Escape" &&
    props.open
  ) {
    closeWidget();
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener(
        "keydown",
        handleKeydown,
      );
      scrollToBottom();
      focusInput();
    } else {
      document.removeEventListener(
        "keydown",
        handleKeydown,
      );
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  requestController?.abort();
  document.removeEventListener(
    "keydown",
    handleKeydown,
  );
});
</script>

<template>
  <Teleport to="body">
    <section
      v-if="open"
      class="chatbot-widget"
      role="dialog"
      aria-modal="false"
      aria-labelledby="chatbot-title"
    >
      <header class="chatbot-widget__header">
        <div>
          <h2 id="chatbot-title">
            AI 챗봇
          </h2>

          <p>
            주변 화장실을 찾아드릴게요
          </p>
        </div>

        <button
          type="button"
          class="chatbot-widget__close"
          aria-label="챗봇 닫기"
          @click="closeWidget"
        >
          ×
        </button>
      </header>

      <div
        class="chatbot-widget__quick"
        aria-label="빠른 질문"
      >
        <button
          v-for="question in quickQuestions"
          :key="question"
          type="button"
          :disabled="sending"
          @click="sendMessage(question)"
        >
          {{ question }}
        </button>
      </div>

      <div
        ref="messageListRef"
        class="chatbot-widget__messages"
        aria-live="polite"
      >
        <article
          v-for="message in messages"
          :key="message.id"
          class="chatbot-message"
          :class="[
            `chatbot-message--${message.role}`,
            {
              'chatbot-message--error':
                message.isError,
            },
          ]"
        >
          <div class="chatbot-message__bubble">
            {{ message.content }}
          </div>

          <div
            v-if="
              message.places &&
              message.places.length > 0
            "
            class="chatbot-places"
          >
            <article
              v-for="place in message.places"
              :key="`${place.placeType}-${place.placeId}-${place.name}`"
              class="chatbot-place"
            >
              <div class="chatbot-place__main">
                <strong>
                  {{ place.name }}
                </strong>

                <span
                  v-if="
                    formatDistance(
                      place.distanceMeters,
                    )
                  "
                >
                  {{
                    formatDistance(
                      place.distanceMeters,
                    )
                  }}
                </span>
              </div>

              <p>
                {{
                  getPlaceTypeLabel(
                    place.placeType,
                  )
                }}
              </p>

              <dl class="chatbot-place__meta">
                <div
                  v-if="
                    place.verificationStatus
                  "
                >
                  <dt>검증</dt>
                  <dd>
                    {{
                      place.verificationStatus
                    }}
                  </dd>
                </div>

                <div
                  v-if="
                    place.candidateConfidence
                  "
                >
                  <dt>신뢰도</dt>
                  <dd>
                    {{
                      place.candidateConfidence
                    }}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                class="chatbot-place__map"
                @click="
                  openPlaceOnMap(place)
                "
              >
                지도에서 보기
              </button>
            </article>
          </div>
        </article>
      </div>

      <form
        class="chatbot-widget__form"
        @submit.prevent="handleSubmit"
      >
        <input
          ref="inputRef"
          v-model="inputMessage"
          type="text"
          maxlength="300"
          placeholder="화장실을 물어보세요"
          :disabled="sending"
        />

        <button
          type="submit"
          aria-label="메시지 전송"
          :disabled="!canSend"
        >
          전송
        </button>
      </form>
    </section>
  </Teleport>
</template>

<style scoped>
.chatbot-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  display: flex;
  width: min(400px, calc(100vw - 48px));
  height: min(650px, calc(100vh - 48px));
  overflow: hidden;
  flex-direction: column;
  border: 1px solid
    rgba(13, 159, 140, 0.18);
  border-radius: 22px;
  background: #f7fbfa;
  box-shadow:
    0 24px 70px
      rgba(5, 51, 46, 0.24),
    0 0 0 1px
      rgba(255, 255, 255, 0.7);
}

.chatbot-widget__header {
  display: flex;
  padding: 20px 20px 18px;
  align-items: flex-start;
  justify-content: space-between;
  background: linear-gradient(
    135deg,
    var(--color-primary, #148453),
    var(--color-primary-hover, #0f6f45)
  );
  color: #ffffff;
}

.chatbot-widget__header h2 {
  margin: 0;
  font-size: 19px;
  line-height: 1.2;
}

.chatbot-widget__header p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
}

.chatbot-widget__close {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 24px;
  line-height: 1;
}

.chatbot-widget__close:hover {
  background: rgba(255, 255, 255, 0.24);
}

.chatbot-widget__quick {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 16px;
  border-bottom: 1px solid
    rgba(13, 159, 140, 0.12);
  background: #ffffff;
}

.chatbot-widget__quick button {
  flex: 0 0 auto;
  border: 1px solid
    rgba(13, 159, 140, 0.22);
  border-radius: 999px;
  background: #e9f8f5;
  color:
    var(
      --color-primary-dark,
      #0b4f33
    );
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 12px;
  white-space: nowrap;
}

.chatbot-widget__quick button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chatbot-widget__messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 18px 16px;
}

.chatbot-message {
  display: flex;
  max-width: 88%;
  flex-direction: column;
  gap: 10px;
}

.chatbot-message--assistant {
  align-self: flex-start;
}

.chatbot-message--user {
  align-self: flex-end;
}

.chatbot-message__bubble {
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.55;
  padding: 11px 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

.chatbot-message--assistant
  .chatbot-message__bubble {
  border: 1px solid
    rgba(13, 159, 140, 0.12);
  background: #ffffff;
  color:
    var(
      --color-text,
      #153d2a
    );
  box-shadow:
    0 8px 22px
      rgba(5, 51, 46, 0.08);
}

.chatbot-message--user
  .chatbot-message__bubble {
  background:
    var(
      --color-primary,
      #148453
    );
  color: #ffffff;
}

.chatbot-message--error
  .chatbot-message__bubble {
  border-color: rgba(220, 66, 66, 0.22);
  background: #fff7f7;
  color: #9f2f2f;
}

.chatbot-places {
  display: grid;
  gap: 10px;
}

.chatbot-place {
  border: 1px solid
    rgba(13, 159, 140, 0.14);
  border-radius: 14px;
  background: #ffffff;
  padding: 13px;
  box-shadow:
    0 8px 20px
      rgba(5, 51, 46, 0.07);
}

.chatbot-place__main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.chatbot-place__main strong {
  color:
    var(
      --color-text,
      #153d2a
    );
  font-size: 14px;
  line-height: 1.35;
}

.chatbot-place__main span {
  flex-shrink: 0;
  color:
    var(
      --color-primary,
      #148453
    );
  font-size: 13px;
  font-weight: 800;
}

.chatbot-place p {
  margin: 6px 0 0;
  color: #55736f;
  font-size: 12px;
}

.chatbot-place__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 0;
}

.chatbot-place__meta div {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  border-radius: 999px;
  background: #edf6f4;
  color: #5d7773;
  font-size: 11px;
  padding: 5px 8px;
}

.chatbot-place__meta dt,
.chatbot-place__meta dd {
  margin: 0;
}

.chatbot-place__meta dt {
  font-weight: 700;
}

.chatbot-place__map {
  width: 100%;
  min-height: 34px;
  margin-top: 12px;
  border: 0;
  border-radius: 10px;
  background:
    var(
      --color-primary,
      #148453
    );
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
}

.chatbot-place__map:hover {
  background:
    var(
      --color-primary-hover,
      #0f6f45
    );
}

.chatbot-widget__form {
  display: flex;
  gap: 8px;
  padding: 14px;
  border-top: 1px solid
    rgba(13, 159, 140, 0.12);
  background: #ffffff;
}

.chatbot-widget__form input {
  min-width: 0;
  flex: 1;
  border: 1px solid
    rgba(13, 159, 140, 0.2);
  border-radius: 12px;
  color:
    var(
      --color-text,
      #153d2a
    );
  font-family: inherit;
  font-size: 14px;
  padding: 0 12px;
}

.chatbot-widget__form input:focus {
  border-color:
    var(
      --color-primary,
      #148453
    );
  outline: 3px solid
    rgba(13, 159, 140, 0.16);
}

.chatbot-widget__form button {
  min-width: 62px;
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  background:
    var(
      --color-primary,
      #148453
    );
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
}

.chatbot-widget__form button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 680px) {
  .chatbot-widget {
    right: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
    max-height: 720px;
    border-radius: 18px;
  }

  .chatbot-message {
    max-width: 94%;
  }
}
</style>
