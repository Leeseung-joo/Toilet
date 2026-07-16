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
    // JSON이 아닌 오류 응답
  }

  if (response.status === 404) {
    return "화장실 정보를 찾을 수 없습니다.";
  }

  if (response.status === 422) {
    return "위치 또는 화장실 ID를 확인해주세요.";
  }

  return "화장실 정보를 불러오지 못했습니다.";
};

const requestJson = async (
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

  return response.json();
};

/**
 * 현재 위치 기준 주변 화장실 조회
 *
 * GET /api/v1/toilets/nearby
 */
export const getNearbyToilets = async ({
  latitude,
  longitude,
  radiusMeters = 3000,
  limit = 20,
}) => {
  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    throw new Error(
      "현재 위치 정보가 올바르지 않습니다.",
    );
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius_meters: String(radiusMeters),
    limit: String(limit),
  });

  const data = await requestJson(
    `/api/v1/toilets/nearby?${params.toString()}`,
    {
      method: "GET",
    },
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.toilets)) {
    return data.toilets;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

/**
 * 현재 위치 기준 주변 음식점 조회
 *
 * GET /api/v1/restaurants/nearby
 */
export const getNearbyRestaurants = async ({
  latitude,
  longitude,
  radiusMeters = 3000,
  limit = 5,
}) => {
  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    throw new Error(
      "현재 위치 정보가 올바르지 않습니다.",
    );
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius_meters: String(radiusMeters),
    limit: String(limit),
  });

  const data = await requestJson(
    `/api/v1/restaurants/nearby?${params.toString()}`,
    {
      method: "GET",
    },
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.restaurants)) {
    return data.restaurants;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

/**
 * 화장실 상세 조회
 *
 * GET /api/v1/toilets/{toilet_id}
 */
export const getToiletDetail = async (
  toiletId,
) => {
  if (
    toiletId === null ||
    toiletId === undefined ||
    toiletId === ""
  ) {
    throw new Error(
      "화장실 ID가 없습니다.",
    );
  }

  return requestJson(
    `/api/v1/toilets/${encodeURIComponent(
      toiletId,
    )}`,
    {
      method: "GET",
    },
  );
};
