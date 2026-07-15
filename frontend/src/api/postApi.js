const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://toiletspot.onrender.com"
).replace(/\/$/, "");

const parseErrorMessage = async (response) => {
  try {
    const errorData = await response.json();

    if (typeof errorData.detail === "string") {
      return errorData.detail;
    }

    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map((error) => {
          const field = error.loc?.at(-1);
          return field ? `${field}: ${error.msg}` : error.msg;
        })
        .join("\n");
    }

    return errorData.message || "요청 처리 중 오류가 발생했습니다.";
  } catch {
    return "서버 요청에 실패했습니다.";
  }
};

/**
 * 게시글 목록 조회
 *
 * GET /api/v1/posts
 *
 * @param {Object} params
 * @param {number|null} params.toiletId 특정 화장실 ID
 * @param {string|null} params.keyword 검색어
 * @param {number} params.page 페이지 번호
 * @param {number} params.size 페이지 크기
 */
export const getPosts = async ({
  toiletId = null,
  keyword = "",
  page = 1,
  size = 20,
} = {}) => {
  const searchParams = new URLSearchParams();

  if (toiletId !== null && toiletId !== undefined && toiletId !== "") {
    searchParams.append("toilet_id", String(toiletId));
  }

  const trimmedKeyword = keyword.trim();

  if (trimmedKeyword) {
    searchParams.append("keyword", trimmedKeyword);
  }

  searchParams.append("page", String(page));
  searchParams.append("size", String(size));

  const response = await fetch(
    `${API_BASE_URL}/api/v1/posts?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};

/**
 * 게시글 작성
 *
 * POST /api/v1/posts
 *
 * @param {Object} postData
 * @param {number} postData.toiletId
 * @param {string} postData.nickname
 * @param {string} postData.password
 * @param {string} postData.title
 * @param {string} postData.content
 */
export const createPost = async ({
  toiletId,
  nickname,
  password,
  title,
  content,
}) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
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

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};