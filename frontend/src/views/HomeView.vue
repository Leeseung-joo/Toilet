<script setup>
import { computed, ref } from "vue";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseCard from "../components/common/BaseCard.vue";
import BaseChip from "../components/common/BaseChip.vue";
import KakaoMap from "../components/map/KakaoMap.vue";

/*
 * 백엔드 개발 전에는 true로 둡니다.
 * 백엔드 API가 완성되면 false로 바꾸면 됩니다.
 */
const USE_MOCK_DATA = true;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "";

const FALLBACK_LOCATION = {
  latitude: 36.3504,
  longitude: 127.3845,
};

const searchKeyword = ref("");
const selectedToiletId = ref(null);
const kakaoMapRef = ref(null);

const currentLocation = ref(null);
const locationStatus = ref("loading");
const locationMessage = ref("");

const toiletStatus = ref("idle");
const toiletMessage = ref("");
const toilets = ref([]);

const selectedToilet = computed(() => {
  return (
    toilets.value.find(
      (toilet) =>
        String(toilet.id) ===
        String(selectedToiletId.value),
    ) ?? null
  );
});

const filteredToilets = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase();

  if (!keyword) {
    return [];
  }

  return toilets.value.filter((toilet) => {
    return (
      toilet.name.toLowerCase().includes(keyword) ||
      toilet.address.toLowerCase().includes(keyword)
    );
  });
});

const formattedDistance = computed(() => {
  const distance = selectedToilet.value?.distanceMeters;

  if (!Number.isFinite(distance)) {
    return "정보 없음";
  }

  if (distance < 1000) {
    return `${distance}m`;
  }

  return `${(distance / 1000).toFixed(1)}km`;
});

const areaLabel = computed(() => {
  if (locationStatus.value === "loading") {
    return "현재 위치 확인 중";
  }

  if (locationStatus.value === "success") {
    return "현재 위치 기준";
  }

  return "대전 기준 샘플 화면";
});

const nearbyLabel = computed(() => {
  if (locationStatus.value === "loading") {
    return "현재 위치를 확인하고 있어요";
  }

  if (toiletStatus.value === "loading") {
    return "주변 화장실을 불러오고 있어요";
  }

  if (toiletStatus.value === "error") {
    return "주변 화장실을 불러오지 못했어요";
  }

  if (locationStatus.value === "error") {
    return `대전 기준 샘플 화장실 ${toilets.value.length}곳`;
  }

  if (USE_MOCK_DATA) {
    return `현재 위치 기준 샘플 화장실 ${toilets.value.length}곳`;
  }

  return `현재 위치 주변 화장실 ${toilets.value.length}곳`;
});

const toRadians = (degree) => {
  return degree * (Math.PI / 180);
};

const calculateDistance = (
  startLatitude,
  startLongitude,
  endLatitude,
  endLongitude,
) => {
  const earthRadius = 6371000;

  const latitudeDifference = toRadians(
    endLatitude - startLatitude,
  );

  const longitudeDifference = toRadians(
    endLongitude - startLongitude,
  );

  const startLatitudeRadian =
    toRadians(startLatitude);

  const endLatitudeRadian =
    toRadians(endLatitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(startLatitudeRadian) *
      Math.cos(endLatitudeRadian) *
      Math.sin(longitudeDifference / 2) ** 2;

  return Math.round(
    earthRadius *
      2 *
      Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine),
      ),
  );
};

/*
 * 현재 위치 주변에 샘플 화장실을 생성합니다.
 * 백엔드가 없어도 "현재 위치 → 주변 화장실 → 지도 표시" 흐름을
 * 그대로 테스트할 수 있습니다.
 */
const createMockToilets = (
  latitude,
  longitude,
) => {
  const mockItems = [
    {
      id: 1,
      name: "가까운 공중화장실",
      address: "현재 위치 인근 샘플 주소 1",
      latitude: latitude + 0.0018,
      longitude: longitude + 0.0012,
      rating: 4.7,
      reviewCount: 38,
      cleanliness: 4.6,
      operationHours: "매일 05:00 ~ 24:00",
      operationStatus: "현재 운영 중",
      facilities: [
        "장애인 화장실",
        "기저귀 교환대",
        "휴지 있음",
      ],
      report:
        "최근 이용자가 깨끗하고 휴지가 충분하다고 제보했어요.",
    },
    {
      id: 2,
      name: "시민편의 공중화장실",
      address: "현재 위치 인근 샘플 주소 2",
      latitude: latitude - 0.0021,
      longitude: longitude + 0.0015,
      rating: 4.5,
      reviewCount: 25,
      cleanliness: 4.3,
      operationHours: "매일 06:00 ~ 23:00",
      operationStatus: "현재 운영 중",
      facilities: [
        "장애인 화장실",
        "휴지 있음",
      ],
      report:
        "관리 상태가 좋고 비교적 이용하기 편리해요.",
    },
    {
      id: 3,
      name: "공원 공중화장실",
      address: "현재 위치 인근 샘플 주소 3",
      latitude: latitude + 0.0025,
      longitude: longitude - 0.0019,
      rating: 4.2,
      reviewCount: 17,
      cleanliness: 4.1,
      operationHours: "매일 08:00 ~ 22:00",
      operationStatus: "현재 운영 중",
      facilities: ["휴지 있음"],
      report:
        "주말에는 이용자가 많을 수 있어요.",
    },
    {
      id: 4,
      name: "24시간 공중화장실",
      address: "현재 위치 인근 샘플 주소 4",
      latitude: latitude - 0.0014,
      longitude: longitude - 0.0027,
      rating: 4.0,
      reviewCount: 14,
      cleanliness: 3.9,
      operationHours: "24시간",
      operationStatus: "24시간 운영",
      facilities: ["장애인 화장실"],
      report:
        "늦은 시간에도 이용할 수 있는 샘플 화장실이에요.",
    },
    {
      id: 5,
      name: "가족안심 공중화장실",
      address: "현재 위치 인근 샘플 주소 5",
      latitude: latitude + 0.0004,
      longitude: longitude - 0.0032,
      rating: 4.4,
      reviewCount: 21,
      cleanliness: 4.2,
      operationHours: "매일 06:00 ~ 22:00",
      operationStatus: "현재 운영 중",
      facilities: [
        "장애인 화장실",
        "기저귀 교환대",
      ],
      report:
        "가족 단위 이용자에게 편리한 시설이 있어요.",
    },
  ];

  return mockItems
    .map((toilet) => ({
      ...toilet,
      distanceMeters: calculateDistance(
        latitude,
        longitude,
        toilet.latitude,
        toilet.longitude,
      ),
    }))
    .sort(
      (first, second) =>
        first.distanceMeters -
        second.distanceMeters,
    );
};

const normalizeToilet = (
  toilet,
  latitude,
  longitude,
) => {
  const toiletLatitude = Number(
    toilet.latitude ?? toilet.lat,
  );

  const toiletLongitude = Number(
    toilet.longitude ?? toilet.lng,
  );

  const backendDistance = Number(
    toilet.distanceMeters ?? toilet.distance,
  );

  return {
    id: toilet.id,
    name:
      toilet.name ??
      toilet.toiletName ??
      "이름 없는 화장실",
    address: toilet.address ?? "",
    latitude: toiletLatitude,
    longitude: toiletLongitude,
    distanceMeters: Number.isFinite(
      backendDistance,
    )
      ? backendDistance
      : calculateDistance(
          latitude,
          longitude,
          toiletLatitude,
          toiletLongitude,
        ),
    rating: Number(toilet.rating ?? 0),
    reviewCount: Number(
      toilet.reviewCount ?? 0,
    ),
    cleanliness: Number(
      toilet.cleanliness ?? 0,
    ),
    operationHours:
      toilet.operationHours ?? "운영 정보 없음",
    operationStatus:
      toilet.operationStatus ?? "운영 정보 확인 필요",
    facilities: Array.isArray(toilet.facilities)
      ? toilet.facilities
      : [],
    report:
      toilet.report ??
      toilet.latestReport ??
      "최근 이용 제보가 없습니다.",
  };
};

/*
 * 이 함수만 나중에 실제 백엔드 API와 연결하면 됩니다.
 *
 * 예상 요청:
 * GET /api/v1/toilets/nearby
 *   ?latitude=36.3504
 *   &longitude=127.3845
 *   &radius=2000
 */
const fetchNearbyToilets = async (
  latitude,
  longitude,
) => {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 250);
    });

    return createMockToilets(
      latitude,
      longitude,
    );
  }

  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: "2000",
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/toilets/nearby?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `주변 화장실 조회 실패: ${response.status}`,
    );
  }

  const data = await response.json();
  const items = Array.isArray(data)
    ? data
    : data.items ?? data.content ?? [];

  return items
    .map((toilet) =>
      normalizeToilet(
        toilet,
        latitude,
        longitude,
      ),
    )
    .sort(
      (first, second) =>
        first.distanceMeters -
        second.distanceMeters,
    );
};

const loadNearbyToilets = async (
  latitude,
  longitude,
) => {
  toiletStatus.value = "loading";
  toiletMessage.value = "";

  try {
    const nearbyToilets =
      await fetchNearbyToilets(
        latitude,
        longitude,
      );

    toilets.value = nearbyToilets;
    selectedToiletId.value =
      nearbyToilets[0]?.id ?? null;

    toiletStatus.value = "success";
  } catch (error) {
    console.error(error);

    toilets.value = [];
    selectedToiletId.value = null;
    toiletStatus.value = "error";
    toiletMessage.value =
      error instanceof Error
        ? error.message
        : "주변 화장실을 불러오지 못했습니다.";
  }
};

const handleLocationSuccess = async ({
  latitude,
  longitude,
  accuracy,
}) => {
  currentLocation.value = {
    latitude,
    longitude,
    accuracy,
  };

  locationStatus.value = "success";
  locationMessage.value = "";

  await loadNearbyToilets(
    latitude,
    longitude,
  );
};

const handleLocationError = async ({
  message,
  requestedByUser = false,
}) => {
  console.error("[현재 위치 조회 실패]", message);

  locationStatus.value = "error";
  locationMessage.value = message;

  if (requestedByUser) {
    window.alert(message);
  }

  /*
   * 위치 확인에 실패하더라도 화면을 테스트할 수 있도록
   * 대전 중심의 샘플 데이터를 표시합니다.
   */
  if (USE_MOCK_DATA && toilets.value.length === 0) {
    await loadNearbyToilets(
      FALLBACK_LOCATION.latitude,
      FALLBACK_LOCATION.longitude,
    );
  }
};

const selectToilet = (toilet) => {
  selectedToiletId.value = toilet.id;
  searchKeyword.value = "";
};

const selectToiletFromSearch = (toilet) => {
  selectToilet(toilet);
  kakaoMapRef.value?.focusToilet(toilet.id);
};

const searchToilet = () => {
  const toilet = filteredToilets.value[0];

  if (!toilet) {
    return;
  }

  selectToiletFromSearch(toilet);
};

const moveToCurrentLocation = () => {
  locationStatus.value = "loading";
  locationMessage.value = "";

  kakaoMapRef.value?.requestCurrentLocation({
    requestedByUser: true,
  });
};

const openExternalMap = () => {
  const toilet = selectedToilet.value;

  if (!toilet) {
    return;
  }

  const url =
    `https://map.kakao.com/link/to/${encodeURIComponent(toilet.name)},` +
    `${toilet.latitude},${toilet.longitude}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );
};
</script>

<template>
  <AppShell active="map" fluid>
    <div class="home-view">
      <div class="home-layout">
        <aside class="detail-panel">
          <div class="search-area">
            <form
              class="search-box"
              @submit.prevent="searchToilet"
            >
              <input
                v-model="searchKeyword"
                type="search"
                placeholder="현재 표시된 화장실 검색"
                aria-label="화장실 검색"
              />

              <button
                type="submit"
                class="search-button"
                aria-label="검색"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M16 16L21 21"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </form>

            <div
              v-if="
                searchKeyword &&
                filteredToilets.length > 0
              "
              class="search-result-list"
            >
              <button
                v-for="toilet in filteredToilets"
                :key="toilet.id"
                type="button"
                class="search-result-item"
                @click="selectToiletFromSearch(toilet)"
              >
                <strong>{{ toilet.name }}</strong>
                <span>
                  {{ toilet.address }}
                  ·
                  {{
                    toilet.distanceMeters < 1000
                      ? `${toilet.distanceMeters}m`
                      : `${(
                          toilet.distanceMeters / 1000
                        ).toFixed(1)}km`
                  }}
                </span>
              </button>
            </div>

            <div
              v-else-if="
                searchKeyword &&
                filteredToilets.length === 0
              "
              class="search-empty"
            >
              검색 결과가 없습니다.
            </div>
          </div>

          <section
            v-if="selectedToilet"
            class="toilet-detail"
          >
            <p class="toilet-detail__eyebrow">
              선택한 화장실
            </p>

            <h1 class="toilet-detail__title">
              {{ selectedToilet.name }}
            </h1>

            <div class="toilet-detail__meta">
              <BaseChip tone="soft">
                {{ selectedToilet.operationStatus }}
              </BaseChip>

              <span>
                현재 위치 기준 · 약
                {{ formattedDistance }}
              </span>
            </div>

            <BaseCard class="rating-card">
              <div class="rating-card__main">
                <strong class="rating-score">
                  {{ selectedToilet.rating.toFixed(1) }}
                </strong>

                <div class="rating-information">
                  <div class="rating-stars">
                    ★★★★★
                  </div>

                  <span>
                    후기
                    {{ selectedToilet.reviewCount }}개
                  </span>
                </div>
              </div>

              <div class="cleanliness">
                <span>청결도</span>
                <strong>
                  {{
                    selectedToilet.cleanliness.toFixed(1)
                  }}
                </strong>
              </div>
            </BaseCard>

            <section class="information-section">
              <h2>이용 정보</h2>

              <dl class="information-list">
                <div>
                  <dt>주소</dt>
                  <dd>{{ selectedToilet.address }}</dd>
                </div>

                <div>
                  <dt>운영</dt>
                  <dd>
                    {{ selectedToilet.operationHours }}
                  </dd>
                </div>

                <div>
                  <dt>거리</dt>
                  <dd>
                    현재 위치에서 직선거리 약
                    {{ formattedDistance }}
                  </dd>
                </div>
              </dl>
            </section>

            <section class="information-section">
              <h2>편의시설</h2>

              <div class="facility-list">
                <BaseChip
                  v-for="facility in selectedToilet.facilities"
                  :key="facility"
                  tone="soft"
                >
                  {{ facility }}
                </BaseChip>

                <span
                  v-if="
                    selectedToilet.facilities.length === 0
                  "
                  class="empty-facility"
                >
                  등록된 편의시설 정보가 없습니다.
                </span>
              </div>
            </section>

            <BaseCard class="report-card">
              <span class="report-card__label">
                최근 이용 제보
              </span>

              <strong>
                {{ selectedToilet.report }}
              </strong>

              <p>
                최근 이용자가 남긴 화장실 정보입니다.
              </p>
            </BaseCard>

            <BaseButton
              block
              size="large"
              @click="openExternalMap"
            >
              외부 지도에서 길찾기
            </BaseButton>

            <p class="detail-notice">
              {{
                USE_MOCK_DATA
                  ? "현재 화장실 정보는 백엔드 연동 전 샘플 데이터입니다."
                  : "실제 운영 정보는 현장 상황과 다를 수 있어요."
              }}
            </p>
          </section>

          <section
            v-else
            class="empty-detail"
          >
            <strong>
              {{
                toiletStatus === "loading"
                  ? "주변 화장실을 찾고 있어요"
                  : "표시할 화장실이 없습니다"
              }}
            </strong>

            <p v-if="toiletMessage">
              {{ toiletMessage }}
            </p>
            <p v-else>
              위치 권한을 허용하면 현재 위치 주변
              화장실을 표시합니다.
            </p>
          </section>

          <p
            v-if="locationStatus === 'error'"
            class="location-error-message"
          >
            {{ locationMessage }}
          </p>
        </aside>

        <section class="map-section">
          <KakaoMap
            ref="kakaoMapRef"
            :toilets="toilets"
            :selected-toilet-id="selectedToiletId"
            @select="selectToilet"
            @location-success="handleLocationSuccess"
            @location-error="handleLocationError"
          />

          <div class="area-name">
            {{ areaLabel }}
          </div>

          <div class="nearby-banner">
            <span>◎</span>
            <strong>
              {{ nearbyLabel }}
            </strong>
          </div>

          <button
            type="button"
            class="location-button"
            aria-label="현재 위치로 이동"
            title="현재 위치로 이동"
            @click="moveToCurrentLocation"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="4"
                fill="currentColor"
              />

              <path
                d="M12 2V6M12 18V22M2 12H6M18 12H22"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.home-view {
  width: 100%;
  min-height: calc(
    100vh - var(--header-height, 72px)
  );
  background: #edf5f3;
}

.home-layout {
  display: grid;
  width: 100%;
  min-height: calc(
    100vh - var(--header-height, 72px)
  );
  grid-template-columns: 365px minmax(0, 1fr);
}

.detail-panel {
  position: relative;
  z-index: 20;
  height: calc(
    100vh - var(--header-height, 72px)
  );
  padding: 27px 24px 22px;
  overflow-y: auto;
  border-right: 1px solid
    var(--color-border, #dce9e6);
  background: #ffffff;
  box-shadow:
    8px 0 25px rgba(30, 73, 68, 0.05);
}

.search-area {
  position: relative;
}

.search-box {
  display: flex;
  height: 48px;
  padding: 0 12px 0 17px;
  align-items: center;
  border: 1px solid
    var(--color-border, #d8e5e2);
  border-radius:
    var(--radius-pill, 999px);
  background: #ffffff;
  transition: 0.2s ease;
}

.search-box:focus-within {
  border-color:
    var(--color-primary, #0d9f8c);
  box-shadow:
    0 0 0 3px rgba(13, 159, 140, 0.1);
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text, #173b38);
  font-size: 13px;
}

.search-box input::placeholder {
  color:
    var(--color-text-muted, #9caaa8);
}

.search-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--color-text, #385b56);
  cursor: pointer;
}

.search-button svg {
  width: 18px;
  height: 18px;
}

.search-result-list,
.search-empty {
  position: absolute;
  z-index: 100;
  top: 55px;
  right: 0;
  left: 0;
  overflow: hidden;
  border: 1px solid
    var(--color-border, #dce9e6);
  border-radius: 15px;
  background: #ffffff;
  box-shadow:
    var(
      --shadow-medium,
      0 12px 30px rgba(21, 69, 63, 0.13)
    );
}

.search-result-item {
  display: flex;
  width: 100%;
  padding: 13px 15px;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
  border: 0;
  border-bottom: 1px solid #edf3f1;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}

.search-result-item:hover {
  background:
    var(--color-mint-50, #f0faf8);
}

.search-result-item:last-child {
  border-bottom: 0;
}

.search-result-item strong {
  color: var(--color-text, #173b38);
  font-size: 13px;
}

.search-result-item span {
  color:
    var(--color-text-subtle, #80918e);
  font-size: 11px;
}

.search-empty {
  padding: 16px;
  color:
    var(--color-text-subtle, #80918e);
  font-size: 12px;
  text-align: center;
}

.toilet-detail {
  padding-top: 31px;
}

.toilet-detail__eyebrow {
  margin: 0 0 7px;
  color:
    var(--color-primary, #0d9f8c);
  font-size: 11px;
  font-weight: 800;
}

.toilet-detail__title {
  margin: 0;
  color: var(--color-text, #173b38);
  font-size: 22px;
  line-height: 1.4;
  word-break: keep-all;
}

.toilet-detail__meta {
  display: flex;
  margin-top: 13px;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.toilet-detail__meta > span {
  color:
    var(--color-text-subtle, #80918e);
  font-size: 11px;
}

.rating-card {
  display: flex;
  padding: 18px;
  margin-top: 20px;
  align-items: center;
  justify-content: space-between;
  border: 0;
  background:
    var(--color-mint-100, #e8f7f3);
  box-shadow: none;
}

.rating-card__main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-score {
  color: var(--color-text, #173b38);
  font-size: 29px;
  line-height: 1;
}

.rating-stars {
  color:
    var(--color-warning, #ffb443);
  font-size: 12px;
  letter-spacing: 1px;
}

.rating-information span {
  display: block;
  margin-top: 3px;
  color:
    var(--color-text-subtle, #80918e);
  font-size: 9px;
}

.cleanliness {
  display: flex;
  align-items: center;
  gap: 5px;
  color:
    var(--color-text-subtle, #80918e);
  font-size: 10px;
}

.cleanliness strong {
  color: var(--color-text, #173b38);
}

.information-section {
  margin-top: 25px;
}

.information-section h2 {
  margin: 0 0 12px;
  color: var(--color-text, #173b38);
  font-size: 13px;
}

.information-list {
  display: grid;
  margin: 0;
  gap: 10px;
}

.information-list > div {
  display: grid;
  grid-template-columns:
    42px minmax(0, 1fr);
  gap: 8px;
}

.information-list dt,
.information-list dd {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}

.information-list dt {
  color: var(--color-text, #173b38);
  font-weight: 700;
}

.information-list dd {
  color:
    var(--color-text-subtle, #80918e);
}

.facility-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.empty-facility {
  color:
    var(--color-text-subtle, #80918e);
  font-size: 11px;
}

.report-card {
  display: flex;
  padding: 15px;
  margin: 21px 0;
  flex-direction: column;
  border: 1px solid
    var(--color-border, #dce9e6);
  background:
    var(--color-surface-soft, #fafdfc);
  box-shadow: none;
}

.report-card__label {
  color:
    var(--color-primary, #0d9f8c);
  font-size: 10px;
  font-weight: 800;
}

.report-card strong {
  margin-top: 7px;
  color: var(--color-text, #274a45);
  font-size: 12px;
  line-height: 1.55;
}

.report-card p {
  margin: 5px 0 0;
  color:
    var(--color-text-muted, #94a29f);
  font-size: 9px;
}

.empty-detail {
  display: flex;
  min-height: 300px;
  padding: 32px 16px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color:
    var(--color-text-subtle, #80918e);
  text-align: center;
}

.empty-detail strong {
  color: var(--color-text, #173b38);
  font-size: 16px;
}

.empty-detail p {
  max-width: 260px;
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
}

.location-error-message {
  margin: 12px 0 0;
  color: #c34b4b;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}

.detail-notice {
  margin: 10px 0 0;
  color:
    var(--color-text-muted, #a1aeac);
  font-size: 9px;
  text-align: center;
}

.map-section {
  position: relative;
  min-width: 0;
  height: calc(
    100vh - var(--header-height, 72px)
  );
  overflow: hidden;
  background: #e5f0ee;
}

.area-name {
  position: absolute;
  z-index: 12;
  top: 24px;
  left: 29px;
  padding: 7px 11px;
  border: 1px solid
    rgba(218, 232, 229, 0.8);
  border-radius:
    var(--radius-pill, 999px);
  background:
    rgba(255, 255, 255, 0.94);
  color: var(--color-text, #294f4a);
  box-shadow:
    var(
      --shadow-small,
      0 8px 20px rgba(25, 76, 70, 0.1)
    );
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}

.nearby-banner {
  position: absolute;
  z-index: 12;
  top: 18px;
  left: 50%;
  display: flex;
  width: min(440px, 58%);
  min-height: 44px;
  padding: 0 18px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid
    rgba(218, 232, 229, 0.8);
  border-radius:
    var(--radius-pill, 999px);
  background:
    rgba(255, 255, 255, 0.95);
  box-shadow:
    var(
      --shadow-medium,
      0 10px 25px rgba(25, 76, 70, 0.12)
    );
  transform: translateX(-50%);
  pointer-events: none;
}

.nearby-banner span {
  color:
    var(--color-primary, #0d9f8c);
  font-size: 17px;
}

.nearby-banner strong {
  color: var(--color-text, #294f4a);
  font-size: 12px;
}

.location-button {
  position: absolute;
  z-index: 12;
  top: 20px;
  right: 25px;
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid
    rgba(218, 232, 229, 0.8);
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.96);
  color:
    var(--color-primary, #0d9f8c);
  box-shadow:
    var(
      --shadow-small,
      0 8px 20px rgba(25, 76, 70, 0.13)
    );
  cursor: pointer;
}

.location-button:hover {
  background: #ffffff;
  transform: translateY(-1px);
}

.location-button svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 900px) {
  .home-layout {
    grid-template-columns:
      315px minmax(0, 1fr);
  }

  .detail-panel {
    padding-right: 18px;
    padding-left: 18px;
  }
}

@media (max-width: 700px) {
  .home-layout {
    display: flex;
    min-height: auto;
    flex-direction: column-reverse;
  }

  .detail-panel {
    width: 100%;
    height: auto;
    overflow: visible;
    border-top: 1px solid
      var(--color-border, #dce9e6);
    border-right: 0;
  }

  .map-section {
    width: 100%;
    height: 55vh;
    min-height: 430px;
  }

  .area-name {
    display: none;
  }

  .nearby-banner {
    left: 18px;
    width: calc(100% - 85px);
    padding: 0 12px;
    transform: none;
  }

  .nearby-banner strong {
    font-size: 10px;
  }
}
</style>
