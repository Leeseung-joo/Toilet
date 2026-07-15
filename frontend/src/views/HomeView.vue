<script setup>
import {
  computed,
  ref,
} from "vue";

import AppShell from "../components/common/AppShell.vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseChip from "../components/common/BaseChip.vue";
import KakaoMap from "../components/map/KakaoMap.vue";

import {
  getNearbyToilets,
  getToiletDetail,
} from "../api/toiletApi.js";

const searchKeyword = ref("");
const selectedToiletId = ref(null);
const selectedToiletDetail = ref(null);

const kakaoMapRef = ref(null);

const currentLocation = ref(null);
const locationStatus = ref("loading");
const locationMessage = ref("");

const toiletStatus = ref("idle");
const toiletMessage = ref("");
const toilets = ref([]);

const detailStatus = ref("idle");
const detailMessage = ref("");

let detailRequestSequence = 0;

const toNumberOrNull = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const isInsideKorea = (
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

const normalizeNearbyToilet = (
  toilet,
) => {
  const openingHoursText =
    toilet.opening_hours_text ||
    "운영시간 정보 없음";

  return {
    id:
      toilet.toilet_id ??
      toilet.id,

    name:
      toilet.name ??
      "이름 없는 화장실",

    address:
      toilet.road_address ||
      toilet.lot_address ||
      "주소 정보 없음",

    roadAddress:
      toilet.road_address ?? "",

    lotAddress:
      toilet.lot_address ?? "",

    latitude:
      toNumberOrNull(
        toilet.latitude,
      ),

    longitude:
      toNumberOrNull(
        toilet.longitude,
      ),

    distanceMeters:
      toNumberOrNull(
        toilet.distance_meters,
      ),

    openingHoursText,

    toiletType: "",
    managementAgency: "",
    phone: "",
    openingType: "",
    ownershipType: "",

    fixture: {},
    facility: {},
    facilities: [],

    /*
     * 기존 KakaoMap 컴포넌트와 호환하기 위한 값입니다.
     * 지도 컴포넌트가 기존 필드를 사용하더라도 오류가 나지 않습니다.
     */
    rating: 0,
    reviewCount: 0,
    cleanliness: 0,
    operationHours:
      openingHoursText,
    operationStatus:
      openingHoursText,
    report:
      "최근 이용 제보가 없습니다.",
  };
};

const facilityLabelMap = {
  is_safety_facility_target:
    "안전시설 대상",
  has_emergency_bell:
    "비상벨",
  has_cctv:
    "CCTV",
  has_diaper_changing_table:
    "기저귀 교환대",
  has_disabled_access:
    "장애인 편의시설",
  has_disabled_toilet:
    "장애인 화장실",
  has_child_toilet:
    "어린이용 변기",
  has_sink:
    "세면대",
  has_hand_dryer:
    "핸드드라이어",
  has_toilet_paper:
    "화장지",
};

const formatFacilityKey = (key) => {
  return key
    .replace(/^is_/, "")
    .replace(/^has_/, "")
    .split("_")
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
};

const createFacilityLabels = (
  facility,
) => {
  if (
    !facility ||
    typeof facility !== "object"
  ) {
    return [];
  }

  return Object.entries(facility)
    .filter(([, value]) => {
      return value === true;
    })
    .map(([key]) => {
      return (
        facilityLabelMap[key] ||
        formatFacilityKey(key)
      );
    });
};

const normalizeToiletDetail = (
  detail,
  summary,
) => {
  const facility =
    detail.facility ?? {};

  const openingHoursText =
    detail.opening_hours_text ||
    summary?.openingHoursText ||
    "운영시간 정보 없음";

  return {
    ...summary,

    id:
      detail.toilet_id ??
      summary?.id,

    name:
      detail.name ??
      summary?.name ??
      "이름 없는 화장실",

    toiletType:
      detail.toilet_type ??
      "정보 없음",

    address:
      detail.road_address ||
      detail.lot_address ||
      summary?.address ||
      "주소 정보 없음",

    roadAddress:
      detail.road_address ??
      summary?.roadAddress ??
      "",

    lotAddress:
      detail.lot_address ??
      summary?.lotAddress ??
      "",

    latitude:
      toNumberOrNull(
        detail.latitude,
      ) ??
      summary?.latitude,

    longitude:
      toNumberOrNull(
        detail.longitude,
      ) ??
      summary?.longitude,

    managementAgency:
      detail.management_agency ??
      "정보 없음",

    phone:
      detail.phone ??
      "정보 없음",

    openingType:
      detail.opening_type ??
      "운영 정보",

    openingHoursText,

    ownershipType:
      detail.ownership_type ??
      "정보 없음",

    fixture:
      detail.fixture ?? {},

    facility,

    facilities:
      createFacilityLabels(
        facility,
      ),

    operationHours:
      openingHoursText,

    operationStatus:
      detail.opening_type ||
      openingHoursText,
  };
};

const selectedSummaryToilet =
  computed(() => {
    return (
      toilets.value.find(
        (toilet) => {
          return (
            String(toilet.id) ===
            String(
              selectedToiletId.value,
            )
          );
        },
      ) ?? null
    );
  });

const selectedToilet = computed(() => {
  if (
    selectedToiletDetail.value &&
    String(
      selectedToiletDetail.value.id,
    ) ===
      String(
        selectedToiletId.value,
      )
  ) {
    return selectedToiletDetail.value;
  }

  return selectedSummaryToilet.value;
});

const filteredToilets = computed(() => {
  const keyword =
    searchKeyword.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    return [];
  }

  return toilets.value.filter(
    (toilet) => {
      const searchableText = [
        toilet.name,
        toilet.address,
        toilet.roadAddress,
        toilet.lotAddress,
      ]
        .map((value) => {
          return String(
            value ?? "",
          ).toLowerCase();
        })
        .join(" ");

      return searchableText.includes(
        keyword,
      );
    },
  );
});

const formattedDistance = computed(() => {
  const distance =
    selectedToilet.value
      ?.distanceMeters;

  if (!Number.isFinite(distance)) {
    return "정보 없음";
  }

  if (distance < 1000) {
    return `${Math.round(
      distance,
    )}m`;
  }

  return `${(
    distance / 1000
  ).toFixed(1)}km`;
});

const fixtureItems = computed(() => {
  const fixture =
    selectedToilet.value
      ?.fixture ?? {};

  return [
    {
      label: "남성 대변기",
      value:
        fixture.male_toilet_count ??
        0,
    },
    {
      label: "남성 소변기",
      value:
        fixture.male_urinal_count ??
        0,
    },
    {
      label: "남성 장애인 대변기",
      value:
        fixture.male_disabled_toilet_count ??
        0,
    },
    {
      label: "남성 장애인 소변기",
      value:
        fixture.male_disabled_urinal_count ??
        0,
    },
    {
      label: "남성 어린이 대변기",
      value:
        fixture.male_child_toilet_count ??
        0,
    },
    {
      label: "남성 어린이 소변기",
      value:
        fixture.male_child_urinal_count ??
        0,
    },
    {
      label: "여성 대변기",
      value:
        fixture.female_toilet_count ??
        0,
    },
    {
      label: "여성 장애인 대변기",
      value:
        fixture.female_disabled_toilet_count ??
        0,
    },
    {
      label: "여성 어린이 대변기",
      value:
        fixture.female_child_toilet_count ??
        0,
    },
  ];
});

const areaLabel = computed(() => {
  if (
    locationStatus.value ===
    "loading"
  ) {
    return "현재 위치 확인 중";
  }

  if (
    locationStatus.value ===
    "success"
  ) {
    return "현재 위치 기준";
  }

  return "위치 확인 필요";
});

const nearbyLabel = computed(() => {
  if (
    locationStatus.value ===
    "loading"
  ) {
    return "현재 위치를 확인하고 있어요";
  }

  if (
    toiletStatus.value ===
    "loading"
  ) {
    return "주변 화장실을 불러오고 있어요";
  }

  if (
    toiletStatus.value ===
    "error"
  ) {
    return "주변 화장실을 불러오지 못했어요";
  }

  return `현재 위치 주변 화장실 ${toilets.value.length}곳`;
});

const loadToiletDetail = async (
  toiletId,
) => {
  if (
    toiletId === null ||
    toiletId === undefined
  ) {
    return;
  }

  const requestSequence =
    ++detailRequestSequence;

  detailStatus.value =
    "loading";

  detailMessage.value = "";
  selectedToiletDetail.value =
    null;

  try {
    const detail =
      await getToiletDetail(
        toiletId,
      );

    if (
      requestSequence !==
      detailRequestSequence
    ) {
      return;
    }

    const summary =
      toilets.value.find(
        (toilet) => {
          return (
            String(toilet.id) ===
            String(toiletId)
          );
        },
      );

    selectedToiletDetail.value =
      normalizeToiletDetail(
        detail,
        summary,
      );

    detailStatus.value =
      "success";
  } catch (error) {
    if (
      requestSequence !==
      detailRequestSequence
    ) {
      return;
    }

    console.error(
      "[화장실 상세 조회 실패]",
      error,
    );

    detailStatus.value =
      "error";

    detailMessage.value =
      error instanceof Error
        ? error.message
        : "상세 정보를 불러오지 못했습니다.";
  }
};

const loadNearbyToilets = async (
  latitude,
  longitude,
) => {
  toiletStatus.value =
    "loading";

  toiletMessage.value = "";

  try {
    const response =
      await getNearbyToilets({
        latitude,
        longitude,
        radiusMeters: 3000,
        limit: 20,
      });

    const nearbyToilets =
      response
        .map(
          normalizeNearbyToilet,
        )
        .filter((toilet) => {
          return (
            toilet.id != null &&
            toilet.latitude != null &&
            toilet.longitude != null
          );
        })
        .sort(
          (first, second) => {
            return (
              Number(
                first.distanceMeters ??
                  Number.MAX_SAFE_INTEGER,
              ) -
              Number(
                second.distanceMeters ??
                  Number.MAX_SAFE_INTEGER,
              )
            );
          },
        );

    toilets.value =
      nearbyToilets;

    const firstToilet =
      nearbyToilets[0];

    selectedToiletId.value =
      firstToilet?.id ?? null;

    toiletStatus.value =
      "success";

    if (firstToilet) {
      await loadToiletDetail(
        firstToilet.id,
      );

      return;
    }

    selectedToiletDetail.value =
      null;

    toiletMessage.value =
      "반경 3km 내에 조회된 화장실이 없습니다.";
  } catch (error) {
    console.error(
      "[주변 화장실 조회 실패]",
      error,
    );

    toilets.value = [];
    selectedToiletId.value =
      null;

    selectedToiletDetail.value =
      null;

    toiletStatus.value =
      "error";

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
  const currentLatitude =
    Number(latitude);

  const currentLongitude =
    Number(longitude);

  if (
    !Number.isFinite(
      currentLatitude,
    ) ||
    !Number.isFinite(
      currentLongitude,
    )
  ) {
    handleLocationError({
      message:
        "현재 위치 좌표가 올바르지 않습니다.",
      requestedByUser: false,
    });

    return;
  }

  if (
    !isInsideKorea(
      currentLatitude,
      currentLongitude,
    )
  ) {
    handleLocationError({
      message:
        "현재 위치가 대한민국 밖으로 확인됩니다. Chrome Sensors 또는 위치 설정을 확인해주세요.",
      requestedByUser: false,
    });

    return;
  }

  currentLocation.value = {
    latitude:
      currentLatitude,
    longitude:
      currentLongitude,
    accuracy:
      Number(accuracy),
  };

  locationStatus.value =
    "success";

  locationMessage.value = "";

  await loadNearbyToilets(
    currentLatitude,
    currentLongitude,
  );
};

const handleLocationError = ({
  message,
  requestedByUser = false,
}) => {
  console.error(
    "[현재 위치 조회 실패]",
    message,
  );

  locationStatus.value =
    "error";

  locationMessage.value =
    message ||
    "현재 위치를 확인하지 못했습니다.";

  toilets.value = [];
  selectedToiletId.value =
    null;

  selectedToiletDetail.value =
    null;

  toiletStatus.value =
    "idle";

  if (requestedByUser) {
    window.alert(
      locationMessage.value,
    );
  }
};

const selectToilet = async (
  toilet,
) => {
  if (!toilet?.id) {
    return;
  }

  selectedToiletId.value =
    toilet.id;

  searchKeyword.value = "";

  await loadToiletDetail(
    toilet.id,
  );
};

const selectToiletFromSearch =
  async (toilet) => {
    await selectToilet(toilet);

    kakaoMapRef.value?.focusToilet(
      toilet.id,
    );
  };

const searchToilet = async () => {
  const toilet =
    filteredToilets.value[0];

  if (!toilet) {
    return;
  }

  await selectToiletFromSearch(
    toilet,
  );
};

const moveToCurrentLocation = () => {
  locationStatus.value =
    "loading";

  locationMessage.value = "";

  kakaoMapRef.value
    ?.requestCurrentLocation({
      requestedByUser: true,
    });
};

const openExternalMap = () => {
  const toilet =
    selectedToilet.value;

  if (
    !toilet ||
    toilet.latitude == null ||
    toilet.longitude == null
  ) {
    return;
  }

  const url =
    `https://map.kakao.com/link/to/${encodeURIComponent(
      toilet.name,
    )},` +
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
                @click="
                  selectToiletFromSearch(
                    toilet,
                  )
                "
              >
                <strong>
                  {{ toilet.name }}
                </strong>

                <span>
                  {{ toilet.address }}
                  ·
                  {{
                    toilet.distanceMeters <
                    1000
                      ? `${Math.round(
                          toilet.distanceMeters,
                        )}m`
                      : `${(
                          toilet.distanceMeters /
                          1000
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
                {{
                  selectedToilet.openingType ||
                  "운영 정보"
                }}
              </BaseChip>

              <span>
                현재 위치 기준 · 약
                {{ formattedDistance }}
              </span>
            </div>

            <div
              v-if="
                detailStatus ===
                'loading'
              "
              class="detail-loading"
            >
              <div
                class="detail-loading__spinner"
              />

              상세 정보를 불러오는 중입니다.
            </div>

            <div
              v-else-if="
                detailStatus === 'error'
              "
              class="detail-api-error"
            >
              <p>
                {{ detailMessage }}
              </p>

              <button
                type="button"
                @click="
                  loadToiletDetail(
                    selectedToiletId,
                  )
                "
              >
                다시 시도
              </button>
            </div>

            <section class="information-section">
              <h2>
                이용 정보
              </h2>

              <dl class="information-list">
                <div>
                  <dt>주소</dt>

                  <dd>
                    {{
                      selectedToilet.address
                    }}
                  </dd>
                </div>

                <div>
                  <dt>운영</dt>

                  <dd>
                    {{
                      selectedToilet.openingHoursText
                    }}
                  </dd>
                </div>

                <div>
                  <dt>유형</dt>

                  <dd>
                    {{
                      selectedToilet.toiletType ||
                      "정보 없음"
                    }}
                  </dd>
                </div>

                <div>
                  <dt>관리</dt>

                  <dd>
                    {{
                      selectedToilet.managementAgency ||
                      "정보 없음"
                    }}
                  </dd>
                </div>

                <div>
                  <dt>전화</dt>

                  <dd>
                    {{
                      selectedToilet.phone ||
                      "정보 없음"
                    }}
                  </dd>
                </div>

                <div>
                  <dt>소유</dt>

                  <dd>
                    {{
                      selectedToilet.ownershipType ||
                      "정보 없음"
                    }}
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
              <h2>
                변기 현황
              </h2>

              <div class="fixture-grid">
                <div
                  v-for="fixture in fixtureItems"
                  :key="fixture.label"
                  class="fixture-item"
                >
                  <span>
                    {{ fixture.label }}
                  </span>

                  <strong>
                    {{ fixture.value }}
                  </strong>
                </div>
              </div>
            </section>

            <section class="information-section">
              <h2>
                편의시설
              </h2>

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
                    selectedToilet
                      .facilities
                      .length === 0
                  "
                  class="empty-facility"
                >
                  등록된 편의시설 정보가 없습니다.
                </span>
              </div>
            </section>

            <BaseButton
              block
              size="large"
              class="external-map-button"
              @click="openExternalMap"
            >
              외부 지도에서 길찾기
            </BaseButton>

            <p class="detail-notice">
              실제 운영 정보는 현장 상황과 다를
              수 있습니다.
            </p>
          </section>

          <section
            v-else
            class="empty-detail"
          >
            <div
              v-if="
                toiletStatus ===
                'loading'
              "
              class="empty-loading-spinner"
            />

            <strong>
              {{
                toiletStatus ===
                "loading"
                  ? "주변 화장실을 찾고 있어요"
                  : "표시할 화장실이 없습니다"
              }}
            </strong>

            <p v-if="toiletMessage">
              {{ toiletMessage }}
            </p>

            <p v-else>
              위치 권한을 허용하면 현재 위치
              주변 화장실을 표시합니다.
            </p>
          </section>

          <p
            v-if="
              locationStatus ===
              'error'
            "
            class="location-error-message"
          >
            {{ locationMessage }}
          </p>
        </aside>

        <section class="map-section">
          <KakaoMap
            ref="kakaoMapRef"
            :toilets="toilets"
            :selected-toilet-id="
              selectedToiletId
            "
            @select="selectToilet"
            @location-success="
              handleLocationSuccess
            "
            @location-error="
              handleLocationError
            "
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
    100vh -
    var(--header-height, 72px)
  );
  background: #edf5f3;
}

.home-layout {
  display: grid;
  width: 100%;
  min-height: calc(
    100vh -
    var(--header-height, 72px)
  );
  grid-template-columns:
    365px minmax(0, 1fr);
}

.detail-panel {
  position: relative;
  z-index: 20;
  height: calc(
    100vh -
    var(--header-height, 72px)
  );
  padding: 27px 24px 22px;
  overflow-y: auto;
  border-right: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  background: #ffffff;
  box-shadow:
    8px 0 25px
    rgba(
      30,
      73,
      68,
      0.05
    );
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
    var(
      --color-border,
      #d8e5e2
    );
  border-radius:
    var(
      --radius-pill,
      999px
    );
  background: #ffffff;
  transition: 0.2s ease;
}

.search-box:focus-within {
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
      0.1
    );
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 13px;
}

.search-box input::placeholder {
  color:
    var(
      --color-text-muted,
      #9caaa8
    );
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
  color:
    var(
      --color-text,
      #385b56
    );
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
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 15px;
  background: #ffffff;
  box-shadow:
    0 12px 30px
    rgba(
      21,
      69,
      63,
      0.13
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
  border-bottom: 1px solid
    #edf3f1;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}

.search-result-item:hover {
  background:
    var(
      --color-mint-50,
      #f0faf8
    );
}

.search-result-item:last-child {
  border-bottom: 0;
}

.search-result-item strong {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 13px;
}

.search-result-item span {
  color:
    var(
      --color-text-subtle,
      #80918e
    );
  font-size: 11px;
  line-height: 1.5;
}

.search-empty {
  padding: 16px;
  color:
    var(
      --color-text-subtle,
      #80918e
    );
  font-size: 12px;
  text-align: center;
}

.toilet-detail {
  padding-top: 31px;
}

.toilet-detail__eyebrow {
  margin: 0 0 7px;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 11px;
  font-weight: 800;
}

.toilet-detail__title {
  margin: 0;
  color:
    var(
      --color-text,
      #173b38
    );
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
    var(
      --color-text-subtle,
      #80918e
    );
  font-size: 11px;
}

.detail-loading {
  display: flex;
  min-height: 72px;
  margin-top: 18px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 14px;
  background: #f8fcfb;
  color:
    var(
      --color-text-muted,
      #81918e
    );
  font-size: 11px;
}

.detail-loading__spinner,
.empty-loading-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid
    #dce9e6;
  border-top-color:
    var(
      --color-primary,
      #0d9f8c
    );
  border-radius: 50%;
  animation:
    toilet-detail-spin
    0.8s linear infinite;
}

.detail-api-error {
  padding: 12px 14px;
  margin: 18px 0 0;
  border: 1px solid
    rgba(
      211,
      76,
      76,
      0.18
    );
  border-radius: 12px;
  background: #fff3f3;
  color: #c34b4b;
  font-size: 11px;
  line-height: 1.6;
}

.detail-api-error p {
  margin: 0;
}

.detail-api-error button {
  height: 32px;
  padding: 0 13px;
  margin-top: 9px;
  border: 1px solid #c34b4b;
  border-radius: 999px;
  background: #ffffff;
  color: #c34b4b;
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
}

.information-section {
  margin-top: 25px;
}

.information-section h2 {
  margin: 0 0 12px;
  color:
    var(
      --color-text,
      #173b38
    );
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
  color:
    var(
      --color-text,
      #173b38
    );
  font-weight: 700;
}

.information-list dd {
  color:
    var(
      --color-text-subtle,
      #80918e
    );
  overflow-wrap: anywhere;
}

.fixture-grid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 8px;
}

.fixture-item {
  display: flex;
  min-width: 0;
  min-height: 50px;
  padding: 10px 12px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid
    var(
      --color-border,
      #dce9e6
    );
  border-radius: 12px;
  background: #f8fcfb;
}

.fixture-item span {
  color:
    var(
      --color-text-subtle,
      #657976
    );
  font-size: 10px;
  line-height: 1.4;
}

.fixture-item strong {
  flex-shrink: 0;
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 15px;
}

.facility-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.empty-facility {
  color:
    var(
      --color-text-subtle,
      #80918e
    );
  font-size: 11px;
}

.external-map-button {
  margin-top: 24px;
}

.empty-detail {
  display: flex;
  min-height: 300px;
  padding: 32px 16px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 11px;
  color:
    var(
      --color-text-subtle,
      #80918e
    );
  text-align: center;
}

.empty-detail strong {
  color:
    var(
      --color-text,
      #173b38
    );
  font-size: 16px;
}

.empty-detail p {
  max-width: 260px;
  margin: 0;
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
    var(
      --color-text-muted,
      #a1aeac
    );
  font-size: 9px;
  text-align: center;
}

.map-section {
  position: relative;
  min-width: 0;
  height: calc(
    100vh -
    var(--header-height, 72px)
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
    rgba(
      218,
      232,
      229,
      0.8
    );
  border-radius: 999px;
  background:
    rgba(
      255,
      255,
      255,
      0.94
    );
  color:
    var(
      --color-text,
      #294f4a
    );
  box-shadow:
    0 8px 20px
    rgba(
      25,
      76,
      70,
      0.1
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
  width: min(
    440px,
    58%
  );
  min-height: 44px;
  padding: 0 18px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid
    rgba(
      218,
      232,
      229,
      0.8
    );
  border-radius: 999px;
  background:
    rgba(
      255,
      255,
      255,
      0.95
    );
  box-shadow:
    0 10px 25px
    rgba(
      25,
      76,
      70,
      0.12
    );
  transform:
    translateX(-50%);
  pointer-events: none;
}

.nearby-banner span {
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  font-size: 17px;
}

.nearby-banner strong {
  color:
    var(
      --color-text,
      #294f4a
    );
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
    rgba(
      218,
      232,
      229,
      0.8
    );
  border-radius: 50%;
  background:
    rgba(
      255,
      255,
      255,
      0.96
    );
  color:
    var(
      --color-primary,
      #0d9f8c
    );
  box-shadow:
    0 8px 20px
    rgba(
      25,
      76,
      70,
      0.13
    );
  cursor: pointer;
}

.location-button:hover {
  background: #ffffff;
  transform:
    translateY(-1px);
}

.location-button svg {
  width: 20px;
  height: 20px;
}

@keyframes toilet-detail-spin {
  to {
    transform:
      rotate(360deg);
  }
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

  .fixture-grid {
    grid-template-columns: 1fr;
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
      var(
        --color-border,
        #dce9e6
      );
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
    width:
      calc(100% - 85px);
    padding: 0 12px;
    transform: none;
  }

  .nearby-banner strong {
    font-size: 10px;
  }
}
</style>