const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://toiletspot.onrender.com"
).replace(/\/$/, "");

const parseErrorMessage = async (
  response,
) => {
  try {
    const data = await response.json();

    if (
      typeof data.detail === "string"
    ) {
      if (
        response.status === 503 &&
        data.detail.includes(
          "OpenAI API Key",
        )
      ) {
        return "챗봇 서버 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.";
      }

      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      const detailMessage = data.detail
        .map((error) => {
          const field =
            error.loc?.at(-1);

          return field
            ? `${field}: ${error.msg}`
            : error.msg;
        })
        .filter(Boolean)
        .join("\n");

      if (detailMessage) {
        return detailMessage;
      }
    }
  } catch {
    // 응답 본문이 없거나 JSON 파싱이 실패한 경우 기본 오류 메시지를 사용합니다.
  }

  return "챗봇 응답을 불러오지 못했습니다.";
};

export const sendChatMessage = async ({
  message,
  latitude,
  longitude,
  signal,
}) => {
  const trimmedMessage =
    String(message ?? "").trim();

  if (!trimmedMessage) {
    throw new Error(
      "메시지를 입력해주세요.",
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/chat`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          latitude,
          longitude,
        }),
        signal,
      },
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "챗봇 응답을 불러오지 못했습니다.",
    );
  }

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response),
    );
  }

  return response.json();
};
