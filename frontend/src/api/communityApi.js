const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://toiletspot.onrender.com"
).replace(/\/$/, "");

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return data.detail
        .map((error) => {
          const field =
            error.loc?.at(-1);

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
    // 응답 본문이 없거나 JSON이 아닌 경우
  }

  if (response.status === 404) {
    return "게시글을 찾을 수 없습니다.";
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    return "비밀번호가 일치하지 않습니다.";
  }

  if (response.status === 422) {
    return "입력한 내용을 다시 확인해 주세요.";
  }

  return "서버 요청을 처리하지 못했습니다.";
};

const request = async (
  path,
  options = {},
) => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    options,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get(
      "content-type",
    );

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
 * 게시글 목록 조회
 * GET /api/v1/posts
 */
export const getCommunityPosts = async ({
  toiletId = null,
  keyword = "",
  page = 1,
  size = 20,
} = {}) => {
  const params =
    new URLSearchParams();

  if (
    toiletId !== null &&
    toiletId !== undefined &&
    toiletId !== ""
  ) {
    params.set(
      "toilet_id",
      String(toiletId),
    );
  }

  const trimmedKeyword =
    String(keyword).trim();

  if (trimmedKeyword) {
    params.set(
      "keyword",
      trimmedKeyword,
    );
  }

  params.set(
    "page",
    String(page),
  );

  params.set(
    "size",
    String(size),
  );

  return request(
    `/api/v1/posts?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
};

/**
 * 게시글 작성
 * POST /api/v1/posts
 */
export const createCommunityPost = async ({
  toiletId,
  nickname,
  password,
  title,
  content,
}) => {
  return request("/api/v1/posts", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      toilet_id: Number(toiletId),
      nickname: nickname.trim(),
      password,
      title: title.trim(),
      content: content.trim(),
    }),
  });
};

/**
 * 게시글 상세 조회
 * GET /api/v1/posts/{post_id}
 */
export const getCommunityPostDetail =
  async (postId) => {
    if (!postId) {
      throw new Error(
        "게시글 ID가 없습니다.",
      );
    }

    return request(
      `/api/v1/posts/${encodeURIComponent(
        postId,
      )}`,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
      },
    );
  };

/**
 * 게시글 수정
 * PATCH /api/v1/posts/{post_id}
 */
export const updateCommunityPost =
  async (
    postId,
    {
      password,
      title,
      content,
    },
  ) => {
    if (!postId) {
      throw new Error(
        "게시글 ID가 없습니다.",
      );
    }

    return request(
      `/api/v1/posts/${encodeURIComponent(
        postId,
      )}`,
      {
        method: "PATCH",
        headers: {
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          password,
          title:
            title.trim(),
          content:
            content.trim(),
        }),
      },
    );
  };

/**
 * 게시글 삭제
 * DELETE /api/v1/posts/{post_id}
 */
export const deleteCommunityPost =
  async (
    postId,
    password,
  ) => {
    if (!postId) {
      throw new Error(
        "게시글 ID가 없습니다.",
      );
    }

    return request(
      `/api/v1/posts/${encodeURIComponent(
        postId,
      )}`,
      {
        method: "DELETE",
        headers: {
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      },
    );
  };