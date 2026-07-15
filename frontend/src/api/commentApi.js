const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://toiletspot.onrender.com"
).replace(/\/$/, "");

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return data.detail
        .map((error) => {
          const field = error.loc?.at(-1);

          return field
            ? `${field}: ${error.msg}`
            : error.msg;
        })
        .join("\n");
    }

    if (typeof data.message === "string") {
      return data.message;
    }
  } catch {
    // 응답 본문이 없거나 JSON 형식이 아닌 경우
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    return "비밀번호가 일치하지 않습니다.";
  }

  if (response.status === 404) {
    return "댓글 또는 게시글을 찾을 수 없습니다.";
  }

  if (response.status === 422) {
    return "입력한 내용을 다시 확인해주세요.";
  }

  return "댓글 요청을 처리하지 못했습니다.";
};

const request = async (
  path,
  options = {},
) => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response),
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type");

  if (
    !contentType?.includes(
      "application/json",
    )
  ) {
    return null;
  }

  return response.json();
};

/**
 * 댓글 목록 조회
 *
 * GET /api/v1/posts/{post_id}/comments
 */
export const getPostComments = async (
  postId,
) => {
  if (
    postId === null ||
    postId === undefined ||
    postId === ""
  ) {
    throw new Error(
      "게시글 ID가 없습니다.",
    );
  }

  const response = await request(
    `/api/v1/posts/${encodeURIComponent(
      postId,
    )}/comments`,
    {
      method: "GET",
    },
  );

  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response?.items)
    ? response.items
    : [];
};

/**
 * 댓글 작성
 *
 * POST /api/v1/posts/{post_id}/comments
 */
export const createPostComment = async (
  postId,
  {
    nickname,
    password,
    content,
  },
) => {
  return request(
    `/api/v1/posts/${encodeURIComponent(
      postId,
    )}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname: nickname.trim(),
        password,
        content: content.trim(),
      }),
    },
  );
};

/**
 * 댓글 수정
 *
 * PATCH /api/v1/comments/{comment_id}
 */
export const updatePostComment = async (
  commentId,
  {
    password,
    content,
  },
) => {
  if (
    commentId === null ||
    commentId === undefined ||
    commentId === ""
  ) {
    throw new Error(
      "댓글 ID가 없습니다.",
    );
  }

  return request(
    `/api/v1/comments/${encodeURIComponent(
      commentId,
    )}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        content: content.trim(),
      }),
    },
  );
};

/**
 * 댓글 삭제
 *
 * DELETE /api/v1/comments/{comment_id}
 */
export const deletePostComment = async (
  commentId,
  password,
) => {
  if (
    commentId === null ||
    commentId === undefined ||
    commentId === ""
  ) {
    throw new Error(
      "댓글 ID가 없습니다.",
    );
  }

  return request(
    `/api/v1/comments/${encodeURIComponent(
      commentId,
    )}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    },
  );
};