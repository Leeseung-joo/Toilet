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
import BaseCard from "../components/common/BaseCard.vue";

import {
  createCommunityPost,
  getCommunityPostDetail,
  updateCommunityPost,
} from "../api/communityApi.js";

import {
  getNearbyToilets,
} from "../api/toiletApi.js";

const route = useRoute();
const router = useRouter();

const isEditMode = computed(
  () => route.name === "community-edit",
);

const loading = ref(false);
const isSubmitting = ref(false);
const submitError = ref("");
const errors = ref({});

const nearbyLoading = ref(false);
const nearbyError = ref("");
const nearbyToilets = ref([]);
const selectedToiletId = ref(null);

const form = ref({
  nickname: "",
  title: "",
  content: "",
  password: "",
});

const pageTitle = computed(() =>
  isEditMode.value
    ? "작성한 정보를 수정해주세요"
    : "새로운 정보를 나눠주세요",
);

const pageDescription = computed(() =>
  isEditMode.value
    ? "게시글 비밀번호를 입력하고 내용을 수정해주세요."
    : "내 주변 화장실을 선택하고 실시간 정보를 익명으로 나눠주세요.",
);

const selectedToilet = computed(() =>
  nearbyToilets.value.find(
    (toilet) =>
      Number(toilet.toilet_id) ===
      Number(selectedToiletId.value),
  ),
);

const formatDistance = (distanceMeters) => {
  const distance = Number(distanceMeters);

  if (!Number.isFinite(distance)) {
    return "";
  }

  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }

  return `${(distance / 1000).toFixed(1)}km`;
};

const getToiletAddress = (toilet) => {
  return (
    toilet.road_address ||
    toilet.lot_address ||
    "주소 정보 없음"
  );
};

const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "현재 위치 기능을 지원하지 않는 브라우저입니다.",
        ),
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
};

const getLocationErrorMessage = (error) => {
  if (error?.code === 1) {
    return "현재 위치 권한이 필요합니다. 브라우저에서 위치 권한을 허용해주세요.";
  }

  if (error?.code === 2) {
    return "현재 위치를 확인할 수 없습니다.";
  }

  if (error?.code === 3) {
    return "현재 위치 확인 시간이 초과되었습니다.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "현재 위치를 가져오지 못했습니다.";
};

const loadNearbyToilets = async () => {
  nearbyLoading.value = true;
  nearbyError.value = "";
  nearbyToilets.value = [];
  selectedToiletId.value = null;

  try {
    const position =
      await getCurrentPosition();

    const toilets =
      await getNearbyToilets({
        latitude:
          position.coords.latitude,
        longitude:
          position.coords.longitude,
        radiusMeters: 3000,
        limit: 6,
      });

    nearbyToilets.value = toilets;

    if (toilets.length > 0) {
      selectedToiletId.value =
        toilets[0].toilet_id;
    } else {
      nearbyError.value =
        "반경 3km 내에 조회된 화장실이 없습니다.";
    }
  } catch (error) {
    nearbyError.value =
      getLocationErrorMessage(error);
  } finally {
    nearbyLoading.value = false;
  }
};

const selectToilet = (toiletId) => {
  if (isEditMode.value) {
    return;
  }

  selectedToiletId.value =
    toiletId;

  if (errors.value.toilet) {
    errors.value = {
      ...errors.value,
      toilet: "",
    };
  }
};

const loadEditPost = async () => {
  if (!isEditMode.value) {
    await loadNearbyToilets();
    return;
  }

  loading.value = true;
  submitError.value = "";

  try {
    const post =
      await getCommunityPostDetail(
        route.params.postId,
      );

    form.value = {
      nickname:
        post.nickname ?? "",
      title:
        post.title ?? "",
      content:
        post.content ?? "",
      password: "",
    };

    if (post.toilet) {
      nearbyToilets.value = [
        {
          toilet_id:
            post.toilet.toilet_id,
          name:
            post.toilet.name ??
            "화장실 정보 없음",
          road_address:
            post.toilet.road_address ??
            "",
          lot_address:
            post.toilet.lot_address ??
            "",
          distance_meters: null,
        },
      ];

      selectedToiletId.value =
        post.toilet.toilet_id;
    }
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : "게시글을 불러오지 못했습니다.",
    );

    await router.replace({
      name: "community",
    });
  } finally {
    loading.value = false;
  }
};

const validateForm = () => {
  const nextErrors = {};

  if (
    !isEditMode.value &&
    !selectedToilet.value
  ) {
    nextErrors.toilet =
      "게시글을 작성할 화장실을 선택해주세요.";
  }

  if (
    !isEditMode.value &&
    !form.value.nickname.trim()
  ) {
    nextErrors.nickname =
      "닉네임을 입력해주세요.";
  }

  if (!form.value.title.trim()) {
    nextErrors.title =
      "제목을 입력해주세요.";
  }

  if (!form.value.content.trim()) {
    nextErrors.content =
      "내용을 입력해주세요.";
  }

  if (!form.value.password.trim()) {
    nextErrors.password =
      "비밀번호를 입력해주세요.";
  }

  errors.value = nextErrors;

  return (
    Object.keys(nextErrors).length === 0
  );
};

const cancel = () => {
  if (isEditMode.value) {
    router.push({
      name: "community-detail",
      params: {
        postId: route.params.postId,
      },
    });

    return;
  }

  router.push({
    name: "community",
  });
};

const submitPost = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;
  submitError.value = "";

  try {
    if (isEditMode.value) {
      const updated =
        await updateCommunityPost(
          route.params.postId,
          {
            password:
              form.value.password,
            title:
              form.value.title,
            content:
              form.value.content,
          },
        );

      window.alert(
        "게시글이 수정되었습니다.",
      );

      await router.push({
        name: "community-detail",
        params: {
          postId:
            updated?.post_id ??
            route.params.postId,
        },
      });

      return;
    }

    const created =
      await createCommunityPost({
        toiletId:
          selectedToilet.value.toilet_id,
        nickname:
          form.value.nickname,
        password:
          form.value.password,
        title:
          form.value.title,
        content:
          form.value.content,
      });

    window.alert(
      "게시글이 등록되었습니다.",
    );

    await router.push({
      name: "community-detail",
      params: {
        postId: created.post_id,
      },
    });
  } catch (error) {
    submitError.value =
      error instanceof Error
        ? error.message
        : isEditMode.value
          ? "게시글 수정에 실패했습니다."
          : "게시글 등록에 실패했습니다.";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(loadEditPost);
</script>

<template>
  <AppShell active="community">
    <main class="form-page">
      <BaseCard
        v-if="loading"
        class="form-card form-loading"
      >
        <div class="loading-spinner" />

        <strong>
          게시글을 불러오는 중입니다.
        </strong>
      </BaseCard>

      <BaseCard
        v-else
        class="form-card"
      >
        <header class="form-header">
          <span class="form-eyebrow">
            {{
              isEditMode
                ? "ANONYMOUS POST EDIT"
                : "ANONYMOUS POST"
            }}
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
          <fieldset class="toilet-section">
            <legend>
              {{
                isEditMode
                  ? "연결된 화장실"
                  : "내 주변 화장실"
              }}
            </legend>

            <div
              v-if="nearbyLoading"
              class="nearby-status"
            >
              <div class="small-spinner" />

              <span>
                현재 위치를 기준으로 주변 화장실을 찾고 있습니다.
              </span>
            </div>

            <div
              v-else-if="nearbyError"
              class="nearby-error"
            >
              <p>
                {{ nearbyError }}
              </p>

              <button
                v-if="!isEditMode"
                type="button"
                class="retry-button"
                @click="loadNearbyToilets"
              >
                위치 다시 확인
              </button>
            </div>

            <div
              v-else-if="nearbyToilets.length > 0"
              class="toilet-toggle-list"
            >
              <button
                v-for="toilet in nearbyToilets"
                :key="toilet.toilet_id"
                type="button"
                class="toilet-toggle"
                :class="{
                  'toilet-toggle--selected':
                    Number(selectedToiletId) ===
                    Number(toilet.toilet_id),
                }"
                :aria-pressed="
                  Number(selectedToiletId) ===
                  Number(toilet.toilet_id)
                "
                :disabled="isEditMode"
                @click="
                  selectToilet(
                    toilet.toilet_id,
                  )
                "
              >
                <span class="toilet-toggle__top">
                  <strong>
                    {{ toilet.name }}
                  </strong>

                  <em
                    v-if="
                      toilet.distance_meters != null
                    "
                  >
                    {{
                      formatDistance(
                        toilet.distance_meters,
                      )
                    }}
                  </em>
                </span>

                <small>
                  {{
                    getToiletAddress(
                      toilet,
                    )
                  }}
                </small>
              </button>
            </div>

            <small
              v-if="errors.toilet"
              class="field-error"
            >
              {{ errors.toilet }}
            </small>
          </fieldset>

          <label
            v-if="!isEditMode"
            class="form-field"
          >
            <span class="field-label">
              닉네임
            </span>

            <input
              v-model="form.nickname"
              type="text"
              maxlength="30"
              placeholder="익명 닉네임을 입력해주세요"
              :class="{
                'field-control--error':
                  errors.nickname,
              }"
            />

            <small
              v-if="errors.nickname"
              class="field-error"
            >
              {{ errors.nickname }}
            </small>
          </label>

          <div
            v-else
            class="author-info"
          >
            <span>작성자</span>

            <strong>
              {{ form.nickname || "익명" }}
            </strong>
          </div>

          <label class="form-field">
            <span class="field-label">
              제목
            </span>

            <input
              v-model="form.title"
              type="text"
              maxlength="100"
              placeholder="제목을 입력해주세요"
              :class="{
                'field-control--error':
                  errors.title,
              }"
            />

            <small
              v-if="errors.title"
              class="field-error"
            >
              {{ errors.title }}
            </small>
          </label>

          <label class="form-field">
            <span class="field-label">
              내용
            </span>

            <textarea
              v-model="form.content"
              rows="6"
              placeholder="현재 이용 가능 여부, 청결 상태, 휴지 유무 등 도움이 될 정보를 적어주세요."
              :class="{
                'field-control--error':
                  errors.content,
              }"
            />

            <small
              v-if="errors.content"
              class="field-error"
            >
              {{ errors.content }}
            </small>
          </label>

          <label class="form-field">
            <span class="field-label">
              {{
                isEditMode
                  ? "게시글 비밀번호"
                  : "수정·삭제용 비밀번호"
              }}
            </span>

            <input
              v-model="form.password"
              type="password"
              :autocomplete="
                isEditMode
                  ? 'current-password'
                  : 'new-password'
              "
              placeholder="비밀번호를 입력해주세요"
              :class="{
                'field-control--error':
                  errors.password,
              }"
            />

            <small
              v-if="errors.password"
              class="field-error"
            >
              {{ errors.password }}
            </small>

            <small
              v-else-if="!isEditMode"
              class="field-help"
            >
              게시글 수정과 삭제 시 사용됩니다.
            </small>
          </label>

          <p
            v-if="submitError"
            class="submit-error"
          >
            {{ submitError }}
          </p>

          <div class="form-actions">
            <button
              type="button"
              class="cancel-button"
              :disabled="isSubmitting"
              @click="cancel"
            >
              취소
            </button>

            <button
              type="submit"
              class="submit-button"
              :disabled="
                isSubmitting ||
                nearbyLoading
              "
            >
              {{
                isSubmitting
                  ? isEditMode
                    ? "수정 중..."
                    : "등록 중..."
                  : isEditMode
                    ? "수정하기"
                    : "등록하기"
              }}
            </button>
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

.form-page {
  width: min(
    780px,
    calc(100% - 32px)
  );
  padding: 42px 0 90px;
  margin: 0 auto;
}

.form-card {
  padding: 34px 40px 28px;
  border: 1px solid
    var(
      --color-border,
      #d5e7e3
    );
  border-radius: 20px;
  background: #ffffff;
}

.form-header {
  margin-bottom: 28px;
}

.form-eyebrow {
  display: block;
  margin-bottom: 10px;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 11px;
  font-weight: 800;
}

.form-header h1 {
  margin: 0 0 8px;
  color:
    var(
      --color-text,
      #063d38
    );
  font-size: 30px;
  line-height: 1.25;
  letter-spacing: -0.05em;
}

.form-header p {
  margin: 0;
  color:
    var(
      --color-text-muted,
      #859491
    );
  font-size: 12px;
  line-height: 1.6;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toilet-section {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.toilet-section legend,
.field-label {
  display: block;
  padding: 0;
  margin-bottom: 9px;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 12px;
  font-weight: 800;
}

.toilet-toggle-list {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 10px;
}

.toilet-toggle {
  display: flex;
  min-width: 0;
  min-height: 72px;
  padding: 13px 14px;
  align-items: stretch;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  border: 1px solid #cfe3df;
  border-radius: 13px;
  background: #fbfefd;
  color: #173b38;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.toilet-toggle:hover:not(:disabled) {
  border-color: #0d9f8c;
  background: #f1fbf8;
}

.toilet-toggle--selected {
  border-color: #0d9f8c;
  background: #e8f8f4;
  box-shadow:
    0 0 0 2px
    rgba(
      13,
      159,
      140,
      0.1
    );
}

.toilet-toggle:disabled {
  cursor: default;
}

.toilet-toggle__top {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.toilet-toggle strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toilet-toggle em {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  background: #0d9f8c;
  color: #ffffff;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.toilet-toggle small {
  overflow: hidden;
  color: #82928f;
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nearby-status,
.nearby-error {
  display: flex;
  min-height: 86px;
  padding: 18px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #d7e8e4;
  border-radius: 13px;
  background: #f8fcfb;
  color: #697c79;
  font-size: 11px;
  text-align: center;
}

.nearby-error p {
  margin: 0;
}

.retry-button {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #0d9f8c;
  border-radius: 999px;
  background: #ffffff;
  color: #0d9f8c;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.form-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.form-field input,
.form-field textarea {
  display: block;
  width: 100%;
  border: 1px solid #cfe3df;
  outline: none;
  background: #fbfefd;
  color: #173b38;
  font-family: inherit;
  font-size: 12px;
}

.form-field input {
  height: 48px;
  padding: 0 15px;
  border-radius: 12px;
}

.form-field textarea {
  min-height: 145px;
  padding: 14px 15px;
  border-radius: 12px;
  line-height: 1.7;
  resize: vertical;
}

.form-field input:focus,
.form-field textarea:focus {
  border-color: #0d9f8c;
  background: #ffffff;
  box-shadow:
    0 0 0 3px
    rgba(
      13,
      159,
      140,
      0.09
    );
}

.field-control--error {
  border-color: #d95e5e !important;
}

.field-error {
  display: block;
  margin-top: 7px;
  color: #c54848;
  font-size: 11px;
}

.field-help {
  margin-top: 7px;
  color: #8fa09d;
  font-size: 11px;
}

.author-info {
  display: flex;
  padding: 15px 16px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #d7ece7;
  border-radius: 12px;
  background: #f4fbf9;
}

.author-info span {
  color: #0d9f8c;
  font-size: 11px;
  font-weight: 800;
}

.author-info strong {
  color: #173b38;
  font-size: 12px;
}

.submit-error {
  padding: 12px 14px;
  margin: 0;
  border-radius: 10px;
  background: #fff3f3;
  color: #c54848;
  font-size: 11px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button,
.submit-button {
  min-width: 104px;
  height: 44px;
  padding: 0 22px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
}

.cancel-button {
  border: 1px solid #cfe3df;
  background: #ffffff;
  color: #173b38;
}

.submit-button {
  border: 1px solid #0d9f8c;
  background: #0d9f8c;
  color: #ffffff;
}

.cancel-button:disabled,
.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.form-loading {
  display: flex;
  min-height: 420px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
}

.loading-spinner,
.small-spinner {
  border: 3px solid #dce9e6;
  border-top-color: #0d9f8c;
  border-radius: 50%;
  animation:
    form-spin
    0.8s linear infinite;
}

.loading-spinner {
  width: 28px;
  height: 28px;
}

.small-spinner {
  width: 22px;
  height: 22px;
}

@keyframes form-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .form-page {
    width: min(
      100% - 24px,
      780px
    );
    padding: 26px 0 70px;
  }

  .form-card {
    padding: 28px 20px 22px;
  }

  .toilet-toggle-list {
    grid-template-columns: 1fr;
  }

  .form-actions {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .cancel-button,
  .submit-button {
    width: 100%;
    min-width: 0;
  }
}
</style>