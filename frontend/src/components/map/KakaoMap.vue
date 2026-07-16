<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import {
  getNearbyRestaurants,
} from "../../api/toiletApi.js";

const props = defineProps({
  toilets: {
    type: Array,
    default: () => [],
  },

  selectedToiletId: {
    type: [Number, String],
    default: null,
  },

  /*
   * HomeView에서 현재 위치를 전달하는 경우 사용합니다.
   * 전달하지 않아도 컴포넌트 내부에서 위치를 조회합니다.
   */
  currentLocation: {
    type: Object,
    default: null,
  },

  selectedCategory: {
    type: String,
    default: "toilet",
  },
});

const emit = defineEmits([
  "select",
  "select-restaurant",
  "update-category",
  "location-success",
  "location-error",
  "ready",
]);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://toiletspot.onrender.com"
).replace(/\/$/, "");

const FALLBACK_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};

const DEFAULT_FOCUS_LEVEL = 3;

const mapContainer = ref(null);

const isLoading = ref(true);
const errorMessage = ref("");

const routeLoading = ref(false);
const routeError = ref("");
const routeSummary = ref(null);
const restaurantStatus = ref("idle");
const restaurantMessage = ref("");

let map = null;
let toiletMarkers = [];
let restaurantMarkers = [];
let restaurants = [];
let selectedRestaurantId = null;
let restaurantRequestSequence = 0;
let currentLocationImage = null;

let infoWindow = null;
let currentLocationMarker = null;

let currentRouteLocation = null;
let pendingRouteToilet = null;
let activeRouteToiletId = null;

let routePolyline = null;
let routeAbortController = null;

let resizeObserver = null;

const getKakao = () => {
  return window.kakao;
};

/*
 * 카카오맵 SDK 불러오기
 */
const loadKakaoMapSdk = () => {
  if (
    getKakao()?.maps?.Map &&
    getKakao()?.maps?.services
  ) {
    return Promise.resolve(
      getKakao(),
    );
  }

  if (getKakao()?.maps?.load) {
    return new Promise((resolve) => {
      getKakao().maps.load(() => {
        resolve(getKakao());
      });
    });
  }

  if (window.__kakaoMapSdkPromise) {
    return window.__kakaoMapSdkPromise;
  }

  const appKey =
    import.meta.env.VITE_KAKAO_MAP_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error(
        "VITE_KAKAO_MAP_KEY가 없습니다. frontend/.env.local을 확인해주세요.",
      ),
    );
  }

  window.__kakaoMapSdkPromise =
    new Promise((resolve, reject) => {
      const finishLoading = () => {
        if (
          !getKakao()?.maps?.load
        ) {
          reject(
            new Error(
              "카카오맵 SDK 객체를 찾지 못했습니다.",
            ),
          );

          return;
        }

        getKakao().maps.load(() => {
          if (
            !getKakao()?.maps
              ?.services
          ) {
            reject(
              new Error(
                "카카오맵 services 라이브러리를 찾지 못했습니다.",
              ),
            );

            return;
          }

          resolve(getKakao());
        });
      };

      const existingScript =
        document.getElementById(
          "kakao-map-sdk",
        );

      if (existingScript) {
        if (getKakao()?.maps?.load) {
          finishLoading();
          return;
        }

        existingScript.addEventListener(
          "load",
          finishLoading,
          {
            once: true,
          },
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "카카오맵 SDK 로딩에 실패했습니다.",
              ),
            );
          },
          {
            once: true,
          },
        );

        return;
      }

      const script =
        document.createElement(
          "script",
        );

      script.id = "kakao-map-sdk";
      script.async = true;

      script.src =
        "https://dapi.kakao.com/v2/maps/sdk.js" +
        `?appkey=${encodeURIComponent(
          appKey,
        )}` +
        "&autoload=false&libraries=services";

      script.addEventListener(
        "load",
        finishLoading,
        {
          once: true,
        },
      );

      script.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "카카오맵 SDK를 불러오지 못했습니다. JavaScript 키와 SDK 도메인을 확인해주세요.",
            ),
          );
        },
        {
          once: true,
        },
      );

      document.head.appendChild(
        script,
      );
    }).catch((error) => {
      window.__kakaoMapSdkPromise =
        null;

      throw error;
    });

  return window.__kakaoMapSdkPromise;
};

/*
 * 기본 데이터 접근 함수
 */
const getToiletId = (toilet) => {
  return (
    toilet?.id ??
    toilet?.toilet_id ??
    null
  );
};

const getToiletName = (toilet) => {
  return (
    toilet?.name ??
    toilet?.toiletName ??
    "이름 없는 화장실"
  );
};

const getToiletLatitude = (
  toilet,
) => {
  return Number(
    toilet?.latitude ??
      toilet?.lat,
  );
};

const getToiletLongitude = (
  toilet,
) => {
  return Number(
    toilet?.longitude ??
      toilet?.lng,
  );
};

const getToiletAddress = (
  toilet,
) => {
  return (
    toilet?.address ??
    toilet?.roadAddress ??
    toilet?.road_address ??
    toilet?.lotAddress ??
    toilet?.lot_address ??
    "주소 정보 없음"
  );
};

const getOperationStatus = (
  toilet,
) => {
  return (
    toilet?.operationStatus ??
    toilet?.openingHoursText ??
    toilet?.opening_hours_text ??
    ""
  );
};

const getPlaceType = (toilet) => {
  return (
    toilet?.placeType ??
    toilet?.place_type ??
    "PUBLIC_TOILET"
  );
};

const toPositiveIntegerOrNull = (
  value,
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalizedValue =
    typeof value === "string" &&
    value.includes(":")
      ? value.split(":").at(-1)
      : value;

  const number =
    Number(normalizedValue);

  return Number.isInteger(number) &&
    number >= 1
    ? number
    : null;
};

const getRoutePlaceId = (toilet) => {
  const placeType =
    getPlaceType(toilet);

  const placeId =
    placeType ===
    "PRIVATE_FACILITY_CANDIDATE"
      ? toilet?.candidateId ??
        toilet?.candidate_id
      : toilet?.placeId ??
        toilet?.place_id ??
        toilet?.toiletId ??
        toilet?.toilet_id;

  return toPositiveIntegerOrNull(
    placeId ?? getToiletId(toilet),
  );
};

const isValidCoordinate = (
  latitude,
  longitude,
) => {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

const isInsideKoreaMapArea = (
  latitude,
  longitude,
) => {
  return (
    latitude >= 32 &&
    latitude <= 39.5 &&
    longitude >= 123 &&
    longitude <= 132.5
  );
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDistance = (
  distanceValue,
) => {
  const distance =
    Number(distanceValue);

  if (!Number.isFinite(distance)) {
    return "";
  }

  if (distance < 1000) {
    return `${Math.round(
      distance,
    )}m`;
  }

  return `${(
    distance / 1000
  ).toFixed(1)}km`;
};

const formatDuration = (
  secondsValue,
) => {
  const seconds =
    Number(secondsValue);

  if (!Number.isFinite(seconds)) {
    return "";
  }

  const totalMinutes =
    Math.max(
      1,
      Math.round(
        seconds / 60,
      ),
    );

  if (totalMinutes < 60) {
    return `약 ${totalMinutes}분`;
  }

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  if (minutes === 0) {
    return `약 ${hours}시간`;
  }

  return `약 ${hours}시간 ${minutes}분`;
};

const normalizeRestaurant = (
  restaurant,
) => {
  const latitude = Number(
    restaurant?.latitude,
  );
  const longitude = Number(
    restaurant?.longitude,
  );
  const restaurantId =
    restaurant?.restaurant_id ??
    restaurant?.id ??
    null;

  return {
    id:
      restaurantId != null
        ? restaurantId
        : `${restaurant?.name}-${restaurant?.longitude}-${restaurant?.latitude}`,
    restaurantId,
    name:
      restaurant?.name ??
      "이름 없는 음식점",
    category:
      restaurant?.category ??
      "음식점",
    address:
      restaurant?.road_address ||
      restaurant?.address ||
      "주소 정보 없음",
    roadAddress:
      restaurant?.road_address ??
      "",
    latitude,
    longitude,
    distanceMeters:
      Number(
        restaurant?.distance_meters,
      ),
    imageUrl: "",
  };
};

const getRestaurantSearchLocation =
  () => {
    const location =
      currentRouteLocation ??
      props.currentLocation;

    const latitude = Number(
      location?.latitude,
    );
    const longitude = Number(
      location?.longitude,
    );

    if (
      isValidCoordinate(
        latitude,
        longitude,
      )
    ) {
      return {
        latitude,
        longitude,
      };
    }

    if (!map || !getKakao()?.maps) {
      return FALLBACK_CENTER;
    }

    const center =
      map.getCenter();

    return {
      latitude: center.getLat(),
      longitude: center.getLng(),
    };
  };

/*
 * 백엔드 오류 메시지 변환
 */
const parseApiError = async (
  response,
) => {
  try {
    const data =
      await response.json();

    if (
      typeof data?.detail ===
      "string"
    ) {
      return data.detail;
    }

    if (
      Array.isArray(
        data?.detail,
      )
    ) {
      return data.detail
        .map((item) => {
          return item?.msg ??
            "요청 값이 올바르지 않습니다.";
        })
        .join("\n");
    }

    if (
      typeof data?.message ===
      "string"
    ) {
      return data.message;
    }
  } catch {
    // 응답 본문이 JSON이 아닌 경우
  }

  if (response.status === 404) {
    return "선택한 목적지를 찾을 수 없습니다.";
  }

  if (response.status === 422) {
    return "경로 요청 값을 다시 확인해주세요.";
  }

  return "경로를 불러오지 못했습니다.";
};

/*
 * 백엔드 points 데이터 정규화
 */
const normalizeRoutePoints = (
  points,
) => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point) => {
      const latitude =
        Number(
          point?.latitude ??
            point?.lat,
        );

      const longitude =
        Number(
          point?.longitude ??
            point?.lng,
        );

      return {
        latitude,
        longitude,
      };
    })
    .filter((point) => {
      return isValidCoordinate(
        point.latitude,
        point.longitude,
      );
    });
};

/*
 * 기존 Polyline만 지도에서 제거
 */
const removeRoutePolyline = () => {
  if (!routePolyline) {
    return;
  }

  routePolyline.setMap(null);
  routePolyline = null;
};

/*
 * 현재 진행 중인 API 요청과 경로 상태 제거
 */
const clearRoute = () => {
  routeAbortController?.abort();
  routeAbortController = null;

  removeRoutePolyline();

  routeLoading.value = false;
  routeError.value = "";
  routeSummary.value = null;

  pendingRouteToilet = null;
  activeRouteToiletId = null;
};

/*
 * 백엔드가 반환한 여러 points를
 * 순서대로 Polyline으로 연결
 */
const drawRoutePolyline = (
  points,
) => {
  if (
    !map ||
    !getKakao()?.maps
  ) {
    return;
  }

  const normalizedPoints =
    normalizeRoutePoints(
      points,
    );

  if (
    normalizedPoints.length <
    2
  ) {
    throw new Error(
      "백엔드에서 경로 좌표를 충분히 반환하지 않았습니다.",
    );
  }

  const kakao = getKakao();

  const path =
    normalizedPoints.map(
      (point) => {
        return new kakao.maps.LatLng(
          point.latitude,
          point.longitude,
        );
      },
    );

  removeRoutePolyline();

  routePolyline =
    new kakao.maps.Polyline({
      map,
      path,

      /*
       * 실제 도보 경로를 나타내는 초록 선
       */
      strokeWeight: 7,
      strokeColor: "#148453",
      strokeOpacity: 0.92,
      strokeStyle: "solid",

      /*
       * 선 끝과 꺾이는 지점을 부드럽게 표시
       */
      endArrow: false,
    });

  routePolyline.setMap(map);

  /*
   * 경로 전체가 지도 안에 들어오도록 조절
   */
  const bounds =
    new kakao.maps.LatLngBounds();

  path.forEach((position) => {
    bounds.extend(position);
  });

  map.setBounds(
    bounds,
    90,
    90,
    90,
    90,
  );
};

/*
 * GET /api/v1/routes 호출
 */
const requestRouteToToilet = async (
  toilet,
) => {
  const selectedToiletId =
    getToiletId(toilet);

  const placeId =
    getRoutePlaceId(toilet);

  if (
    placeId === null
  ) {
    routeError.value =
      "장소 ID가 올바르지 않습니다.";

    return;
  }

  const destinationLatitude =
    getToiletLatitude(toilet);

  const destinationLongitude =
    getToiletLongitude(toilet);

  if (
    !isValidCoordinate(
      destinationLatitude,
      destinationLongitude,
    )
  ) {
    routeError.value =
      "화장실 위치 정보가 올바르지 않습니다.";

    return;
  }

  /*
   * 현재 위치를 아직 받지 못했다면
   * 목적지를 임시 저장하고 위치부터 요청
   */
  if (!currentRouteLocation) {
    pendingRouteToilet =
      toilet;

    routeAbortController?.abort();
    routeAbortController = null;

    removeRoutePolyline();

    routeLoading.value = true;
    routeError.value = "";
    routeSummary.value = null;

    requestCurrentLocation({
      requestedByUser: true,
    });

    return;
  }

  const startLatitude =
    Number(
      currentRouteLocation.latitude,
    );

  const startLongitude =
    Number(
      currentRouteLocation.longitude,
    );

  if (
    !isValidCoordinate(
      startLatitude,
      startLongitude,
    )
  ) {
    routeError.value =
      "현재 위치 좌표가 올바르지 않습니다.";

    return;
  }

  /*
   * 이전 요청이 아직 진행 중이면 취소
   */
  routeAbortController?.abort();

  const controller =
    new AbortController();

  routeAbortController =
    controller;

  routeLoading.value = true;
  routeError.value = "";
  routeSummary.value = null;

  /*
   * 이전 목적지 경로선은 새 요청이 시작할 때 제거
   */
  removeRoutePolyline();

  const params =
    new URLSearchParams({
      place_type:
        getPlaceType(toilet),

      place_id:
        String(placeId),

      start_latitude:
        String(startLatitude),

      start_longitude:
        String(startLongitude),

      mode: "WALK",
    });

  const requestUrl =
    `${API_BASE_URL}/api/v1/routes?${params.toString()}`;

  console.log(
    "[경로 API 요청]",
    requestUrl,
  );

  try {
    const response =
      await fetch(
        requestUrl,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          signal:
            controller.signal,
        },
      );

    if (!response.ok) {
      throw new Error(
        await parseApiError(
          response,
        ),
      );
    }

    const data =
      await response.json();

    console.log(
      "[경로 API 응답]",
      data,
    );

    const points =
      normalizeRoutePoints(
        data?.points,
      );

    if (points.length < 2) {
      throw new Error(
        "경로 좌표가 2개 미만이라 Polyline을 그릴 수 없습니다.",
      );
    }

    drawRoutePolyline(
      points,
    );

    activeRouteToiletId =
      selectedToiletId;

    routeSummary.value = {
      name:
        data?.destination?.name ??
        getToiletName(toilet),

      distanceMeters:
        Number(
          data?.distance_meters,
        ),

      durationSeconds:
        Number(
          data?.duration_seconds,
        ),

      mode:
        data?.mode ??
        "WALK",
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "[경로 조회 실패]",
      error,
    );

    removeRoutePolyline();

    routeError.value =
      error instanceof Error
        ? error.message
        : "경로를 불러오지 못했습니다.";
  } finally {
    /*
     * 더 최근 요청이 없을 때만
     * 로딩 상태를 해제합니다.
     */
    if (
      routeAbortController ===
      controller
    ) {
      routeAbortController =
        null;

      routeLoading.value =
        false;
    }
  }
};

/*
 * 현재 위치 마커 이미지
 */
const createCurrentLocationImage =
  () => {
    const kakao = getKakao();

    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="38"
        height="38"
        viewBox="0 0 38 38"
      >
        <circle
          cx="19"
          cy="19"
          r="16"
          fill="#148453"
          fill-opacity="0.18"
        />

        <circle
          cx="19"
          cy="19"
          r="8"
          fill="#148453"
          stroke="white"
          stroke-width="3"
        />
      </svg>
    `;

    return new kakao.maps.MarkerImage(
      "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
          svg,
        ),

      new kakao.maps.Size(
        38,
        38,
      ),

      {
        offset:
          new kakao.maps.Point(
            19,
            19,
          ),
      },
    );
  };

const getCurrentLocationImage = () => {
  if (!currentLocationImage) {
    currentLocationImage =
      createCurrentLocationImage();
  }

  return currentLocationImage;
};

const getToiletMarkerKey = (
  toilet,
) => {
  const toiletId =
    getToiletId(toilet);

  if (
    toiletId !== null &&
    toiletId !== undefined
  ) {
    return String(toiletId);
  }

  return [
    getToiletLatitude(toilet),
    getToiletLongitude(toilet),
    getToiletName(toilet),
  ].join(":");
};

const createToiletMarkerElement = (
  toilet,
) => {
  const element =
    document.createElement("button");

  element.type = "button";
  element.className =
    "toilet-map-marker";
  element.setAttribute(
    "aria-label",
    `${getToiletName(toilet)} 선택`,
  );

  element.innerHTML = `
    <svg
      class="toilet-map-marker__icon"
      viewBox="0 0 50 50"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="14"
          y="10"
          width="10"
          height="10"
          rx="2"
        />

        <path d="M17 14h4" />
        <path d="M21 20v3" />
        <path d="M18 23h17" />
        <path d="M19 24c0 6 3.7 9.5 8.7 9.5 4.8 0 7.3-3.2 7.3-9.5" />
        <path d="M27 33.5V39h8" />
      </g>
    </svg>
  `;

  return element;
};

const updateToiletMarkerElement = ({
  element,
  toilet,
  selected,
}) => {
  element.classList.toggle(
    "toilet-map-marker--selected",
    selected,
  );

  element.setAttribute(
    "aria-label",
    `${getToiletName(toilet)} 선택`,
  );

  element.setAttribute(
    "aria-pressed",
    selected ? "true" : "false",
  );
};

const createRestaurantMarkerElement =
  (restaurant) => {
    const element =
      document.createElement("button");

    element.type = "button";
    element.className =
      "restaurant-map-marker";
    element.setAttribute(
      "aria-label",
      `${restaurant.name} 선택`,
    );

    element.innerHTML = `
      <img
        class="restaurant-map-marker__image"
        src="/image/restaurant-marker.svg"
        alt=""
        aria-hidden="true"
      />
    `;

    return element;
  };

const updateRestaurantMarkerElement =
  ({
    element,
    restaurant,
    selected,
  }) => {
    element.classList.toggle(
      "restaurant-map-marker--selected",
      selected,
    );

    element.setAttribute(
      "aria-label",
      `${restaurant.name} 선택`,
    );

    element.setAttribute(
      "aria-pressed",
      selected ? "true" : "false",
    );

    const image =
      element.querySelector("img");

    if (image) {
      image.src = selected
        ? "/image/restaurant-marker-selected.svg"
        : "/image/restaurant-marker.svg";
    }
  };

/*
 * 기존 화장실 마커 제거
 */
const clearToiletMarkers = () => {
  toiletMarkers.forEach(
    ({ marker }) => {
      marker.setMap(null);
    },
  );

  toiletMarkers = [];

  infoWindow?.close();
};

const clearRestaurantMarkers = () => {
  restaurantMarkers.forEach(
    ({ marker }) => {
      marker.setMap(null);
    },
  );

  restaurantMarkers = [];
};

const renderRestaurantMarkers =
  () => {
    if (
      !map ||
      !getKakao()?.maps ||
      props.selectedCategory !==
        "restaurant"
    ) {
      return;
    }

    const kakao = getKakao();
    const previousMarkers =
      new Map(
        restaurantMarkers.map(
          (markerItem) => [
            markerItem.key,
            markerItem,
          ],
        ),
      );

    const nextMarkers = [];

    restaurants.forEach(
      (restaurant) => {
        if (
          !isValidCoordinate(
            restaurant.latitude,
            restaurant.longitude,
          )
        ) {
          return;
        }

        const selected =
          String(restaurant.id) ===
          String(selectedRestaurantId);

        const position =
          new kakao.maps.LatLng(
            restaurant.latitude,
            restaurant.longitude,
          );

        let markerItem =
          previousMarkers.get(
            String(restaurant.id),
          );

        if (markerItem) {
          previousMarkers.delete(
            String(restaurant.id),
          );

          markerItem.restaurant =
            restaurant;
          markerItem.position =
            position;

          markerItem.marker.setPosition(
            position,
          );
          markerItem.marker.setZIndex(
            selected ? 40 : 15,
          );

          updateRestaurantMarkerElement(
            {
              element:
                markerItem.element,
              restaurant,
              selected,
            },
          );

          markerItem.marker.setMap(map);
        } else {
          const element =
            createRestaurantMarkerElement(
              restaurant,
            );

          updateRestaurantMarkerElement(
            {
              element,
              restaurant,
              selected,
            },
          );

          const marker =
            new kakao.maps.CustomOverlay({
              position,
              content: element,
              yAnchor: 1,
              clickable: true,
              zIndex:
                selected ? 40 : 15,
            });

          marker.setMap(map);

          markerItem = {
            key: String(
              restaurant.id,
            ),
            marker,
            element,
            position,
            restaurant,
          };

          element.addEventListener(
            "click",
            () => {
              const clickedRestaurant =
                markerItem.restaurant;

              selectedRestaurantId =
                clickedRestaurant.id;

              emit(
                "select-restaurant",
                clickedRestaurant,
              );

              renderRestaurantMarkers();
            },
          );
        }

        nextMarkers.push(
          markerItem,
        );
      },
    );

    previousMarkers.forEach(
      ({ marker }) => {
        marker.setMap(null);
      },
    );

    restaurantMarkers =
      nextMarkers;
  };

const loadNearbyRestaurants =
  async () => {
    if (
      !map ||
      !getKakao()?.maps
    ) {
      return;
    }

    const kakao = getKakao();
    const searchLocation =
      getRestaurantSearchLocation();
    const requestSequence =
      restaurantRequestSequence + 1;

    restaurantRequestSequence =
      requestSequence;

    restaurantStatus.value =
      "loading";
    restaurantMessage.value = "";

    try {
      const result =
        await getNearbyRestaurants({
          latitude:
            searchLocation.latitude,
          longitude:
            searchLocation.longitude,
          radiusMeters: 3000,
          limit: 5,
        });

      if (
        props.selectedCategory !==
          "restaurant" ||
        requestSequence !==
          restaurantRequestSequence
      ) {
        return;
      }

      restaurants = result
        .map(normalizeRestaurant)
        .filter((restaurant) => {
          return isValidCoordinate(
            restaurant.latitude,
            restaurant.longitude,
          );
        });

      selectedRestaurantId = null;
      clearRestaurantMarkers();
      renderRestaurantMarkers();

      if (restaurants.length === 0) {
        restaurantStatus.value =
          "empty";
        restaurantMessage.value =
          "주변 음식점을 찾지 못했습니다.";

        return;
      }

      restaurantStatus.value =
        "success";
      restaurantMessage.value = "";

      const bounds =
        new kakao.maps.LatLngBounds();

      restaurants.forEach(
        (restaurant) => {
          bounds.extend(
            new kakao.maps.LatLng(
              restaurant.latitude,
              restaurant.longitude,
            ),
          );
        },
      );

      map.setBounds(
        bounds,
        90,
        90,
        90,
        90,
      );
    } catch (error) {
      if (
        requestSequence !==
        restaurantRequestSequence
      ) {
        return;
      }

      restaurants = [];
      selectedRestaurantId = null;
      clearRestaurantMarkers();

      restaurantStatus.value =
        "error";
      restaurantMessage.value =
        error?.message ||
        "주변 음식점을 불러오지 못했습니다.";
    }
  };

const switchCategory = (
  category,
) => {
  if (
    category ===
    props.selectedCategory
  ) {
    return;
  }

  emit(
    "update-category",
    category,
  );
};

const getSelectedToilet = () => {
  return props.toilets.find(
    (toilet) => {
      return (
        String(
          getToiletId(toilet),
        ) ===
        String(
          props.selectedToiletId,
        )
      );
    },
  );
};

/*
 * 선택한 화장실 정보창 표시
 */
const openSelectedInfoWindow = () => {
  if (!map || !infoWindow) {
    return;
  }

  const toilet =
    getSelectedToilet();

  const markerItem =
    toiletMarkers.find(
      ({
        toilet: markerToilet,
      }) => {
        return (
          String(
            getToiletId(
              markerToilet,
            ),
          ) ===
          String(
            props.selectedToiletId,
          )
        );
      },
    );

  if (!toilet || !markerItem) {
    infoWindow.close();
    return;
  }

  const distance =
    toilet?.distanceMeters ??
    toilet?.distance_meters ??
    toilet?.distance;

  const informationText = [
    formatDistance(distance),
    getOperationStatus(toilet),
  ]
    .filter(Boolean)
    .join(" · ");

  const content = `
    <div style="
      min-width:220px;
      max-width:280px;
      padding:14px 15px;
      box-sizing:border-box;
      font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <strong style="
        display:block;
        color:#173b38;
        font-size:13px;
        line-height:1.4;
        word-break:keep-all;
      ">
        ${escapeHtml(
          getToiletName(
            toilet,
          ),
        )}
      </strong>

      ${
        informationText
          ? `
            <span style="
              display:block;
              margin-top:6px;
              color:#148453;
              font-size:11px;
              font-weight:700;
              line-height:1.4;
            ">
              ${escapeHtml(
                informationText,
              )}
            </span>
          `
          : ""
      }

      <small style="
        display:block;
        margin-top:5px;
        color:#80918e;
        font-size:10px;
        line-height:1.45;
        word-break:keep-all;
      ">
        ${escapeHtml(
          getToiletAddress(
            toilet,
          ),
        )}
      </small>

      <small style="
        display:block;
        margin-top:8px;
        color:#148453;
        font-size:10px;
        font-weight:700;
      ">
        현재 위치부터 도보 경로를 표시합니다.
      </small>
    </div>
  `;

  infoWindow.close();
  infoWindow.setContent(content);

  infoWindow.setPosition(
    markerItem.position,
  );

  infoWindow.open(map);
};

/*
 * 화장실 마커 전체 렌더링
 */
const renderToiletMarkers = () => {
  if (
    !map ||
    !getKakao()?.maps
  ) {
    return;
  }

  if (
    props.selectedCategory !==
    "toilet"
  ) {
    clearToiletMarkers();
    return;
  }

  const kakao = getKakao();
  const previousMarkers =
    new Map(
      toiletMarkers.map(
        (markerItem) => [
          markerItem.key,
          markerItem,
        ],
      ),
    );

  const nextMarkers = [];

  props.toilets.forEach(
    (toilet) => {
      const latitude =
        getToiletLatitude(
          toilet,
        );

      const longitude =
        getToiletLongitude(
          toilet,
        );

      if (
        !isValidCoordinate(
          latitude,
          longitude,
        )
      ) {
        return;
      }

      const toiletId =
        getToiletId(toilet);

      const markerKey =
        getToiletMarkerKey(
          toilet,
        );

      const selected =
        String(toiletId) ===
        String(
          props.selectedToiletId,
        );

      const position =
        new kakao.maps.LatLng(
          latitude,
          longitude,
        );

      const zIndex =
        selected ? 20 : 10;

      let markerItem =
        previousMarkers.get(
          markerKey,
        );

      if (markerItem) {
        previousMarkers.delete(
          markerKey,
        );

        markerItem.toilet = toilet;
        markerItem.position =
          position;

        markerItem.marker.setPosition(
          position,
        );
        markerItem.marker.setZIndex(
          zIndex,
        );

        updateToiletMarkerElement({
          element:
            markerItem.element,
          toilet,
          selected,
        });

        markerItem.marker.setMap(map);
      } else {
        const element =
          createToiletMarkerElement(
            toilet,
          );

        updateToiletMarkerElement({
          element,
          toilet,
          selected,
        });

        const marker =
          new kakao.maps.CustomOverlay({
            position,
            content: element,
            yAnchor: 1,
            clickable: true,
            zIndex,
          });

        marker.setMap(map);

        markerItem = {
          key: markerKey,
          marker,
          element,
          position,
          toilet,
        };

        element.addEventListener(
          "click",
          () => {
            const clickedToilet =
              markerItem.toilet;

            console.log(
              "[화장실 마커 클릭]",
              {
                toiletId:
                  getRoutePlaceId(
                    clickedToilet,
                  ) ??
                  getToiletId(
                    clickedToilet,
                  ),
                name:
                  getToiletName(
                    clickedToilet,
                  ),
              },
            );

            /*
             * 부모 HomeView에 선택 상태 전달
             */
            emit(
              "select",
              clickedToilet,
            );

            /*
             * 마커 클릭 즉시 경로 API 요청
             */
            void requestRouteToToilet(
              clickedToilet,
            );
          },
        );
      }

      nextMarkers.push(
        markerItem,
      );
    },
  );

  previousMarkers.forEach(
    ({ marker }) => {
      marker.setMap(null);
    },
  );

  toiletMarkers = nextMarkers;

  openSelectedInfoWindow();
};

/*
 * 현재 위치 지도에 표시
 */
const renderCurrentLocation = ({
  latitude,
  longitude,
  center = false,
} = {}) => {
  if (
    !map ||
    !getKakao()?.maps
  ) {
    return;
  }

  const numericLatitude =
    Number(latitude);

  const numericLongitude =
    Number(longitude);

  if (
    !isValidCoordinate(
      numericLatitude,
      numericLongitude,
    )
  ) {
    return;
  }

  currentRouteLocation = {
    latitude:
      numericLatitude,

    longitude:
      numericLongitude,
  };

  const kakao = getKakao();

  const position =
    new kakao.maps.LatLng(
      numericLatitude,
      numericLongitude,
    );

  if (!currentLocationMarker) {
    currentLocationMarker =
      new kakao.maps.Marker({
        map,
        position,

        image:
          getCurrentLocationImage(),

        title: "현재 위치",
        zIndex: 30,
      });
  } else {
    currentLocationMarker.setPosition(
      position,
    );
    currentLocationMarker.setImage(
      getCurrentLocationImage(),
    );
    currentLocationMarker.setMap(map);
  }

  currentLocationMarker.setZIndex(
    30,
  );

  if (center) {
    map.setLevel(DEFAULT_FOCUS_LEVEL);
    map.setCenter(position);
  }
};

/*
 * 현재 위치 요청
 */
const requestCurrentLocation = ({
  requestedByUser = false,
} = {}) => {
  if (!map) {
    return;
  }

  if (!navigator.geolocation) {
    pendingRouteToilet = null;

    emit(
      "location-error",
      {
        message:
          "현재 브라우저에서는 위치 정보를 지원하지 않습니다.",

        requestedByUser,
      },
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const latitude =
        Number(
          coords.latitude,
        );

      const longitude =
        Number(
          coords.longitude,
        );

      const accuracy =
        Number(
          coords.accuracy,
        );

      console.log(
        "[현재 위치 수신]",
        {
          latitude,
          longitude,
          accuracy,
        },
      );

      if (
        !isValidCoordinate(
          latitude,
          longitude,
        )
      ) {
        if (pendingRouteToilet) {
          routeLoading.value =
            false;
          routeError.value =
            "브라우저에서 올바른 위치 좌표를 받지 못했습니다.";
        }

        pendingRouteToilet =
          null;

        emit(
          "location-error",
          {
            message:
              "브라우저에서 올바른 위치 좌표를 받지 못했습니다.",

            requestedByUser,
          },
        );

        return;
      }

      if (
        !isInsideKoreaMapArea(
          latitude,
          longitude,
        )
      ) {
        if (pendingRouteToilet) {
          routeLoading.value =
            false;
          routeError.value =
            "브라우저가 대한민국 밖의 위치를 반환했습니다. 위치 설정을 확인해주세요.";
        }

        currentRouteLocation =
          null;

        pendingRouteToilet =
          null;

        emit(
          "location-error",
          {
            message:
              "브라우저가 대한민국 밖의 위치를 반환했습니다. 위치 설정을 확인해주세요.",

            requestedByUser,
          },
        );

        return;
      }

      renderCurrentLocation({
        latitude,
        longitude,
        center: true,
      });

      emit(
        "location-success",
        {
          latitude,
          longitude,
          accuracy,
        },
      );

      /*
       * 위치를 받기 전에 마커를 눌렀다면
       * 위치 확인 직후 자동으로 경로 API 호출
       */
      if (pendingRouteToilet) {
        const targetToilet =
          pendingRouteToilet;

        pendingRouteToilet =
          null;

        void requestRouteToToilet(
          targetToilet,
        );

        return;
      }

      /*
       * 현재 위치 갱신 후 기존 선택 경로가 있다면
       * 새로운 출발지 기준으로 경로를 다시 요청
       */
      if (activeRouteToiletId) {
        const activeToilet =
          props.toilets.find(
            (toilet) => {
              return (
                String(
                  getToiletId(
                    toilet,
                  ),
                ) ===
                String(
                  activeRouteToiletId,
                )
              );
            },
          );

        if (activeToilet) {
          void requestRouteToToilet(
            activeToilet,
          );
        }
      }
    },

    (error) => {
      currentRouteLocation =
        null;

      const messages = {
        1:
          "위치 권한이 거부되었습니다. 브라우저에서 위치 권한을 허용해주세요.",

        2:
          "현재 위치 정보를 가져올 수 없습니다.",

        3:
          "현재 위치 확인 시간이 초과되었습니다. 위치 설정을 확인해주세요.",
      };

      const message =
        messages[
          error.code
        ] ??
        "현재 위치를 불러오지 못했습니다.";

      if (pendingRouteToilet) {
        routeLoading.value =
          false;
        routeError.value =
          message;
      }

      pendingRouteToilet =
        null;

      emit(
        "location-error",
        {
          message,

          requestedByUser,
        },
      );
    },

    {
      enableHighAccuracy: true,

      timeout:
        requestedByUser
          ? 60000
          : 30000,

      maximumAge: 0,
    },
  );
};

/*
 * 특정 화장실로 지도 이동
 * 검색 결과나 상세 패널에서 호출할 때 사용합니다.
 */
const focusToilet = (
  toiletId,
) => {
  if (
    !map ||
    !getKakao()?.maps
  ) {
    return;
  }

  const toilet =
    props.toilets.find(
      (item) => {
        return (
          String(
            getToiletId(item),
          ) ===
          String(toiletId)
        );
      },
    );

  if (!toilet) {
    return;
  }

  const latitude =
    getToiletLatitude(
      toilet,
    );

  const longitude =
    getToiletLongitude(
      toilet,
    );

  if (
    !isValidCoordinate(
      latitude,
      longitude,
    )
  ) {
    return;
  }

  map.setLevel(DEFAULT_FOCUS_LEVEL);

  map.panTo(
    new getKakao().maps.LatLng(
      latitude,
      longitude,
    ),
  );
};

const moveToSelectedToilet = () => {
  if (
    props.selectedToiletId ==
    null
  ) {
    return;
  }

  focusToilet(
    props.selectedToiletId,
  );
};

/*
 * 지도 초기화
 */
const initializeMap = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await loadKakaoMapSdk();
    await nextTick();

    if (!mapContainer.value) {
      throw new Error(
        "카카오맵 표시 영역을 찾지 못했습니다.",
      );
    }

    const kakao = getKakao();

    const initialLocation =
      props.currentLocation ??
      FALLBACK_CENTER;

    map =
      new kakao.maps.Map(
        mapContainer.value,
        {
          center:
            new kakao.maps.LatLng(
              Number(
                initialLocation.latitude,
              ),

              Number(
                initialLocation.longitude,
              ),
            ),

          level: DEFAULT_FOCUS_LEVEL,
        },
      );

    map.setMapTypeId(
      kakao.maps.MapTypeId.ROADMAP,
    );

    map.addControl(
      new kakao.maps.ZoomControl(),

      kakao.maps
        .ControlPosition.RIGHT,
    );

    infoWindow =
      new kakao.maps.InfoWindow({
        removable: false,
        zIndex: 100,
      });

    if (
      props.selectedCategory ===
      "restaurant"
    ) {
      loadNearbyRestaurants();
    } else {
      renderToiletMarkers();
    }

    if (props.currentLocation) {
      renderCurrentLocation({
        ...props.currentLocation,
        center: true,
      });
    } else {
      requestCurrentLocation({
        requestedByUser: false,
      });
    }

    if (
      typeof ResizeObserver !==
      "undefined"
    ) {
      resizeObserver =
        new ResizeObserver(() => {
          if (!map) {
            return;
          }

          const center =
            map.getCenter();

          map.relayout();
          map.setCenter(center);
        });

      resizeObserver.observe(
        mapContainer.value,
      );
    }

    emit("ready");
  } catch (error) {
    console.error(
      "[카카오맵 초기화 실패]",
      error,
    );

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "카카오맵을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

/*
 * 화장실 목록 변경
 */
watch(
  () => props.toilets,
  () => {
    renderToiletMarkers();

    /*
     * 경로 목적지가 목록에서 사라졌다면
     * 기존 경로 제거
     */
    if (activeRouteToiletId) {
      const routeToiletExists =
        props.toilets.some(
          (toilet) => {
            return (
              String(
                getToiletId(
                  toilet,
                ),
              ) ===
              String(
                activeRouteToiletId,
              )
            );
          },
        );

      if (!routeToiletExists) {
        clearRoute();
      }
    }
  },
  {
    deep: true,
  },
);

/*
 * 선택 마커와 정보창 갱신
 */
watch(
  () =>
    props.selectedToiletId,
  () => {
    renderToiletMarkers();
  },
);

watch(
  () => props.selectedCategory,
  (category) => {
    infoWindow?.close();

    if (category === "restaurant") {
      clearRoute();
      clearToiletMarkers();
      selectedRestaurantId = null;

      emit(
        "select-restaurant",
        null,
      );

      loadNearbyRestaurants();

      return;
    }

    restaurants = [];
    selectedRestaurantId = null;
    clearRestaurantMarkers();

    renderToiletMarkers();
  },
);

/*
 * 부모에서 전달하는 현재 위치 변경
 */
watch(
  () => props.currentLocation,
  (location) => {
    if (!location || !map) {
      return;
    }

    renderCurrentLocation({
      ...location,
      center: false,
    });

    if (
      props.selectedCategory ===
      "restaurant"
    ) {
      loadNearbyRestaurants();
    }
  },
  {
    deep: true,
  },
);

onMounted(() => {
  void initializeMap();
});

onBeforeUnmount(() => {
  routeAbortController?.abort();

  clearToiletMarkers();
  clearRestaurantMarkers();
  removeRoutePolyline();

  currentLocationMarker?.setMap(
    null,
  );

  resizeObserver?.disconnect();

  resizeObserver = null;
  routeAbortController = null;

  currentLocationMarker = null;
  currentRouteLocation = null;

  pendingRouteToilet = null;
  activeRouteToiletId = null;

  infoWindow = null;
  map = null;
});

defineExpose({
  requestCurrentLocation,

  moveToCurrentLocation:
    requestCurrentLocation,

  focusToilet,
  moveToSelectedToilet,

  requestRouteToToilet,
  clearRoute,
});
</script>

<template>
  <div class="kakao-map-wrapper">
    <div
      ref="mapContainer"
      class="kakao-map"
      aria-label="현재 위치 주변 공공화장실 지도"
    />

    <div
      class="map-category-toggle"
      aria-label="지도 카테고리"
      role="group"
    >
      <button
        type="button"
        :class="{
          'map-category-toggle__button--active':
            selectedCategory === 'toilet',
        }"
        class="map-category-toggle__button"
        @click="switchCategory('toilet')"
      >
        화장실
      </button>

      <button
        type="button"
        :class="{
          'map-category-toggle__button--active':
            selectedCategory ===
            'restaurant',
        }"
        class="map-category-toggle__button"
        @click="switchCategory('restaurant')"
      >
        음식점
      </button>
    </div>

    <Transition
      name="map-state"
      mode="out-in"
    >
      <div
        v-if="isLoading"
        key="loading"
        class="kakao-map__state"
      >
        카카오맵을 불러오는 중입니다.
      </div>

      <div
        v-else-if="errorMessage"
        key="error"
        class="
          kakao-map__state
          kakao-map__state--error
        "
      >
        <strong>
          지도를 표시하지 못했습니다.
        </strong>

        <span>
          {{ errorMessage }}
        </span>
      </div>
    </Transition>

    <Transition
      name="route-panel"
      mode="out-in"
    >
      <!-- 경로 조회 중 -->
      <div
        v-if="
          selectedCategory ===
            'toilet' && routeLoading
        "
        key="loading"
        class="route-status route-status--loading"
      >
        <span class="route-spinner" />

        <strong>
          도보 경로를 불러오는 중입니다.
        </strong>
      </div>

      <!-- 경로 조회 오류 -->
      <div
        v-else-if="
          selectedCategory ===
            'toilet' && routeError
        "
        key="error"
        class="route-status route-status--error"
      >
        <strong>
          {{ routeError }}
        </strong>

        <button
          type="button"
          aria-label="경로 오류 닫기"
          @click="routeError = ''"
        >
          ×
        </button>
      </div>

      <!-- 경로 요약 -->
      <div
        v-else-if="
          selectedCategory ===
            'toilet' && routeSummary
        "
        key="summary"
        class="route-summary"
      >
        <div class="route-summary__information">
          <strong>
            {{ routeSummary.name }}
          </strong>

          <span>
            {{
              formatDistance(
                routeSummary.distanceMeters,
              )
            }}

            <template
              v-if="
                formatDuration(
                  routeSummary.durationSeconds,
                )
              "
            >
              ·
              {{
                formatDuration(
                  routeSummary.durationSeconds,
                )
              }}
            </template>
          </span>
        </div>

        <button
          type="button"
          class="route-clear-button"
          aria-label="경로 표시 종료"
          @click="clearRoute"
        >
          ×
        </button>
      </div>
    </Transition>

    <Transition
      name="route-panel"
      mode="out-in"
    >
      <div
        v-if="
          selectedCategory ===
            'restaurant' &&
          restaurantStatus ===
            'loading'
        "
        key="restaurant-loading"
        class="route-status route-status--loading"
      >
        <span class="route-spinner" />

        <strong>
          주변 음식점을 불러오는 중입니다.
        </strong>
      </div>

      <div
        v-else-if="
          selectedCategory ===
            'restaurant' &&
          restaurantMessage
        "
        key="restaurant-message"
        class="route-status route-status--error"
      >
        <strong>
          {{ restaurantMessage }}
        </strong>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.kakao-map-wrapper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #e5f0ee;
}

.kakao-map {
  width: 100%;
  height: 100%;
}

/*
 * 전역 이미지 스타일 때문에
 * 카카오 지도 타일이 깨지는 것을 방지합니다.
 */
.kakao-map :deep(img) {
  max-width: none !important;
}

.kakao-map :deep(.toilet-map-marker) {
  position: relative;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: #148453;
  box-shadow:
    0 8px 18px
    rgba(
      13,
      159,
      140,
      0.28
    );
  color: #ffffff;
  cursor: pointer;
  transform:
    translateY(0)
    scale(1);
  transform-origin:
    50% 100%;
  transition:
    transform 220ms
    cubic-bezier(
      0.2,
      0.8,
      0.2,
      1
    ),
    background-color 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
  will-change:
    transform,
    background-color,
    box-shadow;
}

.kakao-map :deep(.toilet-map-marker::after) {
  position: absolute;
  bottom: -7px;
  left: 50%;
  width: 10px;
  height: 10px;
  border-right: 3px solid
    #ffffff;
  border-bottom: 3px solid
    #ffffff;
  background: inherit;
  content: "";
  transform:
    translateX(-50%)
    rotate(45deg);
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.kakao-map :deep(.toilet-map-marker__icon) {
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  pointer-events: none;
}

.kakao-map :deep(.toilet-map-marker--selected) {
  border-color: #ffffff;
  background: #0f6f45;
  box-shadow:
    0 14px 28px
    rgba(
      8,
      110,
      100,
      0.34
    );
  transform:
    translateY(-4px)
    scale(1.22);
}

.kakao-map :deep(.toilet-map-marker:focus-visible) {
  outline: 3px solid
    rgba(
      36,
      119,
      243,
      0.48
    );
  outline-offset: 4px;
}

.kakao-map :deep(.restaurant-map-marker) {
  display: block;
  width: 44px;
  height: 52px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform:
    translateY(0)
    scale(1);
  transform-origin:
    50% 100%;
  transition:
    transform 220ms
      cubic-bezier(
        0.2,
        0.8,
        0.2,
        1
      ),
    filter 220ms ease;
  filter:
    drop-shadow(
      0 10px 18px
        rgba(
          194,
          65,
          12,
          0.28
        )
    );
}

.kakao-map :deep(.restaurant-map-marker__image) {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.kakao-map :deep(.restaurant-map-marker--selected) {
  transform:
    translateY(-6px)
    scale(1.4);
  filter:
    drop-shadow(
      0 16px 28px
        rgba(
          194,
          65,
          12,
          0.38
        )
    );
}

.kakao-map :deep(.restaurant-map-marker:focus-visible) {
  outline: 3px solid
    rgba(
      249,
      115,
      22,
      0.45
    );
  outline-offset: 4px;
}

.map-category-toggle {
  display: none;
  position: absolute;
  z-index: 160;
  top: 20px;
  right: 82px;
  min-height: 42px;
  padding: 4px;
  border: 1px solid
    rgba(
      218,
      232,
      229,
      0.9
    );
  border-radius: 999px;
  background:
    rgba(
      255,
      255,
      255,
      0.96
    );
  box-shadow:
    0 8px 20px
    rgba(
      25,
      76,
      70,
      0.13
    );
}

.map-category-toggle__button {
  min-width: 66px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #657976;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.map-category-toggle__button--active {
  background: #148453;
  color: #ffffff;
  box-shadow:
    0 6px 14px
    rgba(
      20,
      132,
      83,
      0.22
    );
}

.kakao-map__state {
  position: absolute;
  z-index: 30;
  inset: 0;
  display: flex;
  padding: 24px;
  align-items: center;
  justify-content: center;
  background:
    rgba(
      241,
      249,
      247,
      0.94
    );
  color: #56716d;
  font-size: 13px;
  text-align: center;
}

.map-state-enter-active,
.map-state-leave-active {
  transition:
    opacity 0.32s ease,
    backdrop-filter 0.32s ease,
    transform 0.32s
      cubic-bezier(
        0.2,
        0.8,
        0.2,
        1
      );
}

.map-state-enter-from,
.map-state-leave-to {
  opacity: 0;
  transform:
    translateY(8px)
    scale(0.985);
  backdrop-filter:
    blur(0);
}

.kakao-map__state--error {
  flex-direction: column;
  gap: 8px;
}

.kakao-map__state--error strong {
  color: #173b38;
  font-size: 15px;
}

.kakao-map__state--error span {
  max-width: 420px;
  line-height: 1.6;
}

/*
 * 경로 로딩·오류 메시지
 */
.route-status,
.route-summary {
  position: absolute;
  z-index: 150;
  bottom: 24px;
  left: 50%;
  display: flex;
  min-height: 50px;
  padding: 10px 16px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 999px;
  transform:
    translateX(-50%);
  box-shadow:
    0 12px 34px
    rgba(
      23,
      59,
      56,
      0.2
    );
}

.route-status--loading {
  border: 1px solid
    #d8e9e6;
  background:
    rgba(
      255,
      255,
      255,
      0.96
    );
  color: #173b38;
}

.route-status--loading strong {
  font-size: 11px;
}

.route-spinner {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 3px solid
    #d8e9e6;
  border-top-color:
    #148453;
  border-radius: 50%;
  animation:
    route-spin
    0.75s linear infinite;
}

.route-status--error {
  max-width:
    calc(
      100% - 40px
    );
  border: 1px solid
    #f2c6c6;
  background:
    rgba(
      255,
      244,
      244,
      0.97
    );
  color: #c54848;
}

.route-status--error strong {
  font-size: 11px;
  line-height: 1.45;
}

.route-status--error button,
.route-clear-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  padding: 0;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 21px;
  line-height: 1;
}

.route-status--error button {
  color: #c54848;
}

/*
 * 경로 거리·시간 요약
 */
.route-summary {
  min-width: 230px;
  max-width:
    calc(
      100% - 40px
    );
  justify-content:
    space-between;
  border: 1px solid
    rgba(
      20,
      132,
      83,
      0.2
    );
  background:
    rgba(
      255,
      255,
      255,
      0.97
    );
}

.route-summary__information {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.route-summary__information strong {
  overflow: hidden;
  color: #173b38;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-summary__information span {
  color: #148453;
  font-size: 10px;
  font-weight: 800;
}

.route-clear-button {
  color: #708582;
}

.route-clear-button:hover {
  background: #edf3f2;
}

.route-panel-enter-active,
.route-panel-leave-active {
  transition:
    opacity 0.32s ease,
    filter 0.32s ease,
    transform 0.32s
      cubic-bezier(
        0.2,
        0.8,
        0.2,
        1
      );
}

.route-panel-enter-from,
.route-panel-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform:
    translate(
      -50%,
      14px
    )
    scale(0.96);
}

@keyframes route-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .map-category-toggle {
    top: 72px;
    right: 18px;
  }

  .map-category-toggle__button {
    min-width: 58px;
    padding: 0 10px;
    font-size: 11px;
  }

  .route-status,
  .route-summary {
    bottom: 18px;
    width:
      calc(
        100% - 32px
      );
    max-width: none;
  }
}
</style>
