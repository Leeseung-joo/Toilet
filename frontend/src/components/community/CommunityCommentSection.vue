<script setup>
import {
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from "vue";

import {
  createPostComment,
  deletePostComment,
  getPostComments,
  updatePostComment,
} from "../../api/commentApi.js";

const props = defineProps({
  postId: {
    type: [Number, String],
    required: true,
  },
});

const emit = defineEmits([
  "count-change",
]);

const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref("");

const createSubmitting = ref(false);
const createError = ref("");

const createForm = reactive({
  nickname: "",
  password: "",
  content: "",
});

const modalOpen = ref(false);
const modalMode = ref(null);
const selectedComment = ref(null);

const modalSubmitting = ref(false);
const modalError = ref("");

const modalForm = reactive({
  password: "",
  content: "",
});

/*
 * 성공 토스트
 */
const toast = reactive({
  visible: false,
  message: "",
});

let toastTimer = null;

const showToast = (message) => {
  window.clearTimeout(toastTimer);

  toast.message = message;
  toast.visible = true;

  toastTimer = window.setTimeout(() => {
    toast.visible = false;
    toast.message = "";
  }, 1800);
};

const hideToast = () => {
  window.clearTimeout(toastTimer);

  toast.visible = false;
  toast.message = "";
};

/*
 * 댓글 응답 데이터 정규화
 */
const normalizeComment = (
  comment = {},
) => {
  return {
    id:
      comment?.comment_id ??
      comment?.id ??
      null,

    nickname:
      comment?.nickname ??
      "익명",

    content:
      comment?.content ??
      "",

    createdAt:
      comment?.created_at ??
      comment?.createdAt ??
      null,

    updatedAt:
      comment?.updated_at ??
      comment?.updatedAt ??
      null,

    postId:
      comment?.post_id ??
      comment?.postId ??
      props.postId,
  };
};

const formatDate = (
  dateString,
) => {
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

const updateCommentCount = () => {
  emit(
    "count-change",
    comments.value.length,
  );
};

/*
 * 댓글 목록 조회
 */
const loadComments = async () => {
  commentsLoading.value = true;
  commentsError.value = "";

  try {
    const response =
      await getPostComments(
        props.postId,
      );

    comments.value =
      response.map(
        normalizeComment,
      );

    updateCommentCount();
  } catch (error) {
    comments.value = [];

    commentsError.value =
      error instanceof Error
        ? error.message
        : "댓글을 불러오지 못했습니다.";

    updateCommentCount();
  } finally {
    commentsLoading.value = false;
  }
};

/*
 * 댓글 등록 검증
 */
const validateCreateForm = () => {
  if (!createForm.nickname.trim()) {
    return "닉네임을 입력해주세요.";
  }

  if (!createForm.password.trim()) {
    return "비밀번호를 입력해주세요.";
  }

  if (!createForm.content.trim()) {
    return "댓글 내용을 입력해주세요.";
  }

  return "";
};

/*
 * 댓글 등록
 */
const submitCreateComment = async () => {
  createError.value =
    validateCreateForm();

  if (createError.value) {
    return;
  }

  createSubmitting.value = true;

  try {
    const created =
      await createPostComment(
        props.postId,
        {
          nickname:
            createForm.nickname,
          password:
            createForm.password,
          content:
            createForm.content,
        },
      );

    /*
     * 서버가 생성한 댓글 객체를 반환하는 경우
     */
    if (created) {
      const normalized =
        normalizeComment(created);

      comments.value.push(
        normalized,
      );

      updateCommentCount();
    } else {
      /*
       * 서버가 204 또는 빈 응답을 반환하는 경우
       * 댓글 목록을 다시 조회한다.
       */
      await loadComments();
    }

    /*
     * 연속 작성이 편하도록 닉네임은 유지
     */
    createForm.password = "";
    createForm.content = "";

    createError.value = "";

    showToast(
      "댓글이 등록되었습니다.",
    );
  } catch (error) {
    createError.value =
      error instanceof Error
        ? error.message
        : "댓글 등록에 실패했습니다.";
  } finally {
    createSubmitting.value = false;
  }
};

/*
 * 댓글 수정 모달 열기
 */
const openEditModal = (
  comment,
) => {
  selectedComment.value =
    comment;

  modalMode.value = "edit";

  modalForm.password = "";
  modalForm.content =
    comment.content;

  modalError.value = "";
  modalOpen.value = true;
};

/*
 * 댓글 삭제 모달 열기
 */
const openDeleteModal = (
  comment,
) => {
  selectedComment.value =
    comment;

  modalMode.value = "delete";

  modalForm.password = "";
  modalForm.content = "";

  modalError.value = "";
  modalOpen.value = true;
};

/*
 * 수정·삭제 모달 닫기
 *
 * force가 true이면 API 요청 중이어도
 * 성공 처리 후 강제로 모달을 닫는다.
 */
const closeModal = (
  force = false,
) => {
  if (
    modalSubmitting.value &&
    !force
  ) {
    return;
  }

  modalOpen.value = false;
  modalMode.value = null;
  selectedComment.value = null;

  modalForm.password = "";
  modalForm.content = "";
  modalError.value = "";
};

const validateModalForm = () => {
  if (!modalForm.password.trim()) {
    return "댓글 작성 시 설정한 비밀번호를 입력해주세요.";
  }

  if (
    modalMode.value === "edit" &&
    !modalForm.content.trim()
  ) {
    return "수정할 댓글 내용을 입력해주세요.";
  }

  return "";
};

/*
 * 댓글 수정·삭제
 */
const submitModal = async () => {
  modalError.value =
    validateModalForm();

  if (modalError.value) {
    return;
  }

  if (!selectedComment.value) {
    modalError.value =
      "선택한 댓글이 없습니다.";

    return;
  }

  /*
   * 비동기 요청 도중 모달 상태가 초기화되어도
   * 사용할 수 있도록 필요한 값을 미리 저장
   */
  const selectedCommentId =
    selectedComment.value.id;

  const currentModalMode =
    modalMode.value;

  const previousComment = {
    ...selectedComment.value,
  };

  const editedContent =
    modalForm.content.trim();

  modalSubmitting.value = true;

  try {
    /*
     * 댓글 수정
     */
    if (
      currentModalMode ===
      "edit"
    ) {
      const updated =
        await updatePostComment(
          selectedCommentId,
          {
            password:
              modalForm.password,
            content:
              editedContent,
          },
        );

      /*
       * 수정 API가 댓글 객체를 반환하면 해당 값 사용
       * 빈 응답이면 기존 데이터에 수정 내용을 반영
       */
      const normalized =
        updated
          ? normalizeComment(
              updated,
            )
          : {
              ...previousComment,
              content:
                editedContent,
              updatedAt:
                new Date().toISOString(),
            };

      comments.value =
        comments.value.map(
          (comment) => {
            return (
              String(comment.id) ===
              String(
                selectedCommentId,
              )
            )
              ? normalized
              : comment;
          },
        );

      closeModal(true);

      showToast(
        "댓글이 수정되었습니다.",
      );

      return;
    }

    /*
     * 댓글 삭제
     */
    await deletePostComment(
      selectedCommentId,
      modalForm.password,
    );

    comments.value =
      comments.value.filter(
        (comment) => {
          return (
            String(comment.id) !==
            String(
              selectedCommentId,
            )
          );
        },
      );

    updateCommentCount();

    closeModal(true);

    showToast(
      "댓글이 삭제되었습니다.",
    );
  } catch (error) {
    modalError.value =
      error instanceof Error
        ? error.message
        : currentModalMode ===
            "edit"
          ? "댓글 수정에 실패했습니다."
          : "댓글 삭제에 실패했습니다.";
  } finally {
    modalSubmitting.value = false;
  }
};

/*
 * 게시글이 변경되면 댓글 다시 조회
 */
watch(
  () => props.postId,
  () => {
    comments.value = [];
    commentsError.value = "";
    createError.value = "";

    closeModal(true);
    hideToast();

    void loadComments();
  },
  {
    immediate: true,
  },
);

onBeforeUnmount(() => {
  window.clearTimeout(
    toastTimer,
  );
});
</script>

<template>
  <section class="comment-section">
    <div class="comment-header">
      <h2>
        댓글
        {{ comments.length }}
      </h2>

      <button
        v-if="commentsError"
        type="button"
        class="reload-button"
        @click="loadComments"
      >
        다시 불러오기
      </button>
    </div>

    <Transition
      name="comment-panel"
      mode="out-in"
    >
      <div
        v-if="commentsLoading"
        key="loading"
        class="comment-status"
      >
        <div class="comment-spinner" />

        <span>
          댓글을 불러오는 중입니다.
        </span>
      </div>

      <div
        v-else-if="commentsError"
        key="error"
        class="
          comment-status
          comment-status--error
        "
      >
        <p>
          {{ commentsError }}
        </p>
      </div>

      <TransitionGroup
        v-else-if="
          comments.length > 0
        "
        key="list"
        name="comment-card"
        tag="div"
        class="comment-list"
      >
      <article
        v-for="comment in comments"
        :key="comment.id"
        class="comment-card"
      >
        <div class="comment-card__body">
          <p>
            {{ comment.content }}
          </p>

          <div class="comment-meta">
            <strong>
              {{ comment.nickname }}
            </strong>

            <span>·</span>

            <time
              :datetime="
                comment.createdAt
              "
            >
              {{
                formatDate(
                  comment.createdAt,
                )
              }}
            </time>

            <span
              v-if="
                comment.updatedAt &&
                comment.updatedAt !==
                  comment.createdAt
              "
            >
              · 수정됨
            </span>
          </div>
        </div>

        <div class="comment-actions">
          <button
            type="button"
            @click="
              openEditModal(
                comment,
              )
            "
          >
            수정
          </button>

          <button
            type="button"
            class="
              comment-delete-button
            "
            @click="
              openDeleteModal(
                comment,
              )
            "
          >
            삭제
          </button>
        </div>
      </article>
      </TransitionGroup>

      <div
        v-else
        key="empty"
        class="comment-empty"
      >
        <strong>
          아직 등록된 댓글이 없습니다.
        </strong>

        <p>
          첫 번째 댓글을 남겨보세요.
        </p>
      </div>
    </Transition>

    <form
      class="comment-create-form"
      @submit.prevent="
        submitCreateComment
      "
    >
      <h3>
        댓글 작성하기
      </h3>

      <div class="create-form-row">
        <label class="comment-field">
          <span>
            닉네임
          </span>

          <input
            v-model="
              createForm.nickname
            "
            type="text"
            maxlength="30"
            placeholder="익명 닉네임"
            :disabled="
              createSubmitting
            "
          />
        </label>

        <label class="comment-field">
          <span>
            비밀번호
          </span>

          <input
            v-model="
              createForm.password
            "
            type="password"
            autocomplete="new-password"
            placeholder="수정·삭제용 비밀번호"
            :disabled="
              createSubmitting
            "
          />
        </label>
      </div>

      <label class="comment-field">
        <span>
          댓글 내용
        </span>

        <textarea
          v-model="
            createForm.content
          "
          rows="4"
          maxlength="500"
          placeholder="댓글 내용을 입력해주세요."
          :disabled="
            createSubmitting
          "
        />
      </label>

      <p
        v-if="createError"
        class="form-error"
      >
        {{ createError }}
      </p>

      <div class="create-form-actions">
        <button
          type="submit"
          class="create-button"
          :disabled="
            createSubmitting
          "
        >
          {{
            createSubmitting
              ? "등록 중..."
              : "댓글 등록"
          }}
        </button>
      </div>
    </form>

    <!-- 댓글 수정·삭제 비밀번호 모달 -->
    <Transition name="comment-modal">
      <div
        v-if="modalOpen"
        class="
          comment-modal-backdrop
        "
        @click.self="closeModal"
      >
        <section
          class="comment-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="
            modalMode === 'edit'
              ? 'comment-edit-title'
              : 'comment-delete-title'
          "
        >
          <div
            class="
              comment-modal__header
            "
          >
            <div>
              <span
                class="modal-eyebrow"
              >
                PASSWORD CHECK
              </span>

              <h2
                v-if="
                  modalMode ===
                  'edit'
                "
                id="comment-edit-title"
              >
                댓글 수정
              </h2>

              <h2
                v-else
                id="comment-delete-title"
              >
                댓글 삭제
              </h2>
            </div>

            <button
              type="button"
              class="
                modal-close-button
              "
              :disabled="
                modalSubmitting
              "
              aria-label="창 닫기"
              @click="closeModal"
            >
              ×
            </button>
          </div>

          <p class="modal-description">
            {{
              modalMode === "edit"
                ? "댓글 작성 시 설정한 비밀번호를 입력하고 내용을 수정해주세요."
                : "댓글 작성 시 설정한 비밀번호를 입력해주세요. 삭제한 댓글은 복구할 수 없습니다."
            }}
          </p>

          <form
            class="modal-form"
            @submit.prevent="
              submitModal
            "
          >
            <label
              v-if="
                modalMode === 'edit'
              "
              class="comment-field"
            >
              <span>
                수정할 내용
              </span>

              <textarea
                v-model="
                  modalForm.content
                "
                rows="5"
                maxlength="500"
                placeholder="수정할 댓글 내용을 입력해주세요."
                :disabled="
                  modalSubmitting
                "
              />
            </label>

            <label class="comment-field">
              <span>
                비밀번호
              </span>

              <input
                v-model="
                  modalForm.password
                "
                type="password"
                autocomplete="current-password"
                placeholder="댓글 비밀번호"
                :disabled="
                  modalSubmitting
                "
              />
            </label>

            <p
              v-if="modalError"
              class="form-error"
            >
              {{ modalError }}
            </p>

            <div class="modal-actions">
              <button
                type="button"
                class="
                  modal-cancel-button
                "
                :disabled="
                  modalSubmitting
                "
                @click="closeModal"
              >
                취소
              </button>

              <button
                type="submit"
                :class="
                  modalMode ===
                  'delete'
                    ? 'modal-delete-button'
                    : 'modal-submit-button'
                "
                :disabled="
                  modalSubmitting
                "
              >
                {{
                  modalSubmitting
                    ? modalMode ===
                        "edit"
                      ? "수정 중..."
                      : "삭제 중..."
                    : modalMode ===
                        "edit"
                      ? "수정하기"
                      : "삭제하기"
                }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>

    <!-- 성공 토스트 -->
    <Teleport to="body">
      <Transition name="success-toast">
        <div
          v-if="toast.visible"
          class="success-toast"
          role="status"
          aria-live="polite"
        >
          <span
            class="
              success-toast__icon
            "
          >
            ✓
          </span>

          <strong>
            {{ toast.message }}
          </strong>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.comment-section {
  margin-top: 34px;
}

.comment-header {
  display: flex;
  margin-bottom: 16px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.comment-header h2 {
  margin: 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 15px;
}

.reload-button {
  height: 32px;
  padding: 0 13px;
  border: 1px solid
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 999px;
  background: #ffffff;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.comment-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.comment-card {
  display: flex;
  padding: 16px 18px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid
    var(
      --color-border,
      #edf3f1
    );
  border-radius: 13px;
  background: #f8fcfb;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.22s ease,
    transform 0.22s ease;
}

.comment-card__body {
  min-width: 0;
  flex: 1;
}

.comment-card__body p {
  margin: 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.comment-meta {
  display: flex;
  margin-top: 7px;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 10px;
}

.comment-meta strong {
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 10px;
}

.comment-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.comment-actions button {
  height: 30px;
  padding: 0 11px;
  border: 1px solid
    var(
      --color-border,
      #d8e7e4
    );
  border-radius: 999px;
  background: #ffffff;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.comment-actions button:hover {
  border-color:
    var(
      --color-primary,
      #0d9f8c
    );
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  transform: translateY(-1px);
}

.comment-actions
  .comment-delete-button:hover {
  border-color: #df6060;
  color: #d34d4d;
}

.comment-empty,
.comment-status {
  display: flex;
  min-height: 90px;
  padding: 18px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  border: 1px solid
    var(
      --color-border,
      #edf3f1
    );
  border-radius: 13px;
  background: #f8fcfb;
  text-align: center;
}

.comment-empty strong {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 12px;
}

.comment-empty p,
.comment-status p {
  margin: 0;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 10px;
}

.comment-status span {
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  font-size: 10px;
}

.comment-status--error {
  border-color:
    rgba(
      212,
      77,
      77,
      0.2
    );
  background: #fff5f5;
}

.comment-status--error p {
  color: #c54848;
}

.comment-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #dce9e6;
  border-top-color:
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 50%;
  animation:
    comment-spin
    0.8s linear infinite;
}

.comment-create-form {
  display: flex;
  padding: 20px;
  margin-top: 22px;
  flex-direction: column;
  gap: 15px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 16px;
  background: #ffffff;
}

.comment-create-form h3 {
  margin: 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 14px;
}

.create-form-row {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 12px;
}

.comment-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.comment-field > span {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 11px;
  font-weight: 800;
}

.comment-field input,
.comment-field textarea {
  display: block;
  width: 100%;
  border: 1px solid
    var(
      --color-border,
      #cfe3df
    );
  outline: none;
  background: #fbfefd;
  color:
    var(
      --color-text,
      #173b38
    );
  font-family: inherit;
  font-size: 12px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.comment-field input {
  height: 44px;
  padding: 0 13px;
  border-radius: 11px;
}

.comment-field textarea {
  min-height: 96px;
  padding: 12px 13px;
  border-radius: 11px;
  line-height: 1.65;
  resize: vertical;
}

.comment-field input:focus,
.comment-field textarea:focus {
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
      0.09
    );
}

.comment-field input:disabled,
.comment-field textarea:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.form-error {
  padding: 11px 13px;
  margin: 0;
  border-radius: 10px;
  background: #fff3f3;
  color: #c54848;
  font-size: 10px;
  line-height: 1.5;
  white-space: pre-line;
}

.create-form-actions {
  display: flex;
  justify-content: flex-end;
}

.create-button {
  min-width: 104px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 999px;
  background:
    var(
      --color-primary,
      #0d9f8c
    );
  color: #ffffff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.create-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.create-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/*
 * 수정·삭제 모달
 */
.comment-modal-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: flex;
  padding: 20px;
  align-items: center;
  justify-content: center;
  background:
    rgba(
      13,
      43,
      40,
      0.5
    );
}

.comment-modal {
  width: min(
    100%,
    480px
  );
  padding: 28px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 22px;
  background: #ffffff;
  box-shadow:
    0 25px 70px
    rgba(
      14,
      50,
      46,
      0.22
    );
  transition:
    opacity 0.22s ease,
    transform 0.22s
      cubic-bezier(
        0.2,
        0.8,
        0.2,
        1
      );
}

.comment-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.modal-eyebrow {
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 10px;
  font-weight: 800;
}

.comment-modal__header h2 {
  margin: 9px 0 0;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 23px;
}

.modal-close-button {
  padding: 0;
  border: 0;
  background: transparent;
  color:
    var(
      --color-text-muted,
      #8fa09d
    );
  cursor: pointer;
  font-size: 28px;
  line-height: 1;
}

.modal-description {
  margin: 20px 0;
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 12px;
  line-height: 1.7;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-actions {
  display: flex;
  margin-top: 4px;
  justify-content: flex-end;
  gap: 10px;
}

.modal-cancel-button,
.modal-submit-button,
.modal-delete-button {
  min-width: 96px;
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.modal-cancel-button:hover:not(:disabled),
.modal-submit-button:hover:not(:disabled),
.modal-delete-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.modal-cancel-button {
  border: 1px solid
    var(
      --color-border,
      #cfe3df
    );
  background: #ffffff;
  color:
    var(
      --color-text,
      #173b38
    );
}

.modal-submit-button {
  border: 1px solid
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

.modal-delete-button {
  border: 1px solid #df5858;
  background: #df5858;
  color: #ffffff;
}

.modal-cancel-button:disabled,
.modal-submit-button:disabled,
.modal-delete-button:disabled,
.modal-close-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/*
 * 성공 토스트
 */
.success-toast {
  position: fixed;
  z-index: 3000;
  bottom: 34px;
  left: 50%;
  display: flex;
  min-width: 230px;
  min-height: 52px;
  padding: 0 20px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid
    rgba(
      13,
      159,
      140,
      0.24
    );
  border-radius: 999px;
  background:
    rgba(
      23,
      59,
      56,
      0.96
    );
  color: #ffffff;
  box-shadow:
    0 16px 40px
    rgba(
      13,
      43,
      40,
      0.24
    );
  transform: translateX(-50%);
}

.success-toast__icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    var(
      --color-primary,
      #0d9f8c
    );
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.success-toast strong {
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.comment-panel-enter-active,
.comment-panel-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.comment-panel-enter-from,
.comment-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.comment-card-enter-active,
.comment-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.comment-card-move {
  transition: transform 0.22s ease;
}

.comment-card-enter-from,
.comment-card-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.comment-card-leave-active {
  position: absolute;
  width: 100%;
}

.comment-modal-enter-active,
.comment-modal-leave-active {
  transition:
    background-color 0.22s ease,
    opacity 0.22s ease;
}

.comment-modal-enter-from,
.comment-modal-leave-to {
  opacity: 0;
}

.comment-modal-enter-from .comment-modal,
.comment-modal-leave-to .comment-modal {
  opacity: 0;
  transform:
    translateY(14px)
    scale(0.98);
}

.success-toast-enter-active,
.success-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.success-toast-enter-from,
.success-toast-leave-to {
  opacity: 0;
  transform:
    translate(
      -50%,
      12px
    );
}

@keyframes comment-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .comment-card {
    flex-direction: column;
  }

  .comment-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .create-form-row {
    grid-template-columns: 1fr;
  }

  .create-button {
    width: 100%;
  }

  .modal-actions {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .modal-cancel-button,
  .modal-submit-button,
  .modal-delete-button {
    width: 100%;
    min-width: 0;
  }

  .success-toast {
    bottom: 24px;
    width:
      calc(
        100% - 40px
      );
    min-width: 0;
  }
}
</style>
