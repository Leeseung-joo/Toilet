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
          const field =
            error.loc?.at(-1);

          return field
            ? `${field}: ${error.msg}`
            : error.msg;
        })
        .join("\n");
    }

    return (
      data.message ||
      "주변 화장실을 조회하지 못했습니다."
    );
  } catch {
    return "주변 화장실을 조회하지 못했습니다.";
  }
};

export const getNearbyToilets = async ({
  latitude,
  longitude,
  radiusMeters = 3000,
  limit = 6,
}) => {
  if (
    latitude === undefined ||
    longitude === undefined
  ) {
    throw new Error(
      "현재 위치 정보가 없습니다.",
    );
  }

  const params =
    new URLSearchParams({
      latitude:
        String(latitude),
      longitude:
        String(longitude),
      radius_meters:
        String(radiusMeters),
      limit:
        String(limit),
    });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/toilets/nearby?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept:
          "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
      ),
    );
  }

  const data =
    await response.json();

  return Array.isArray(data)
    ? data
    : [];
};