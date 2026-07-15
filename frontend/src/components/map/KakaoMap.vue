<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

const props = defineProps({
  toilets: {
    type: Array,
    default: () => [],
  },
  selectedToiletId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits([
  "select",
  "location-success",
  "location-error",
]);

const FALLBACK_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};

const mapContainer = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");

let map = null;
let toiletMarkers = [];
let currentLocationMarker = null;
let infoWindow = null;
let resizeHandler = null;

let locationWatchId = null;
let locationTimerId = null;

const getKakao = () => window.kakao;

const loadKakaoMapSdk = () => {
  if (getKakao()?.maps?.Map) {
    return Promise.resolve(getKakao());
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

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error(
        "VITE_KAKAO_MAP_KEY가 없습니다. frontend/.env.local을 확인해주세요.",
      ),
    );
  }

  window.__kakaoMapSdkPromise = new Promise(
    (resolve, reject) => {
      const finishLoading = () => {
        if (!getKakao()?.maps?.load) {
          reject(
            new Error("카카오맵 SDK 객체를 찾지 못했습니다."),
          );
          return;
        }

        getKakao().maps.load(() => {
          resolve(getKakao());
        });
      };

      const existingScript =
        document.getElementById("kakao-map-sdk");

      if (existingScript) {
        if (getKakao()?.maps?.load) {
          finishLoading();
          return;
        }

        existingScript.addEventListener(
          "load",
          finishLoading,
          { once: true },
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error("카카오맵 SDK 로딩에 실패했습니다."),
            );
          },
          { once: true },
        );

        return;
      }

      const script = document.createElement("script");

      script.id = "kakao-map-sdk";
      script.async = true;
      script.src =
        "https://dapi.kakao.com/v2/maps/sdk.js" +
        `?appkey=${encodeURIComponent(appKey)}` +
        "&autoload=false";

      script.addEventListener("load", finishLoading, {
        once: true,
      });

      script.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "카카오맵 SDK를 불러오지 못했습니다. JavaScript 키와 SDK 도메인을 확인해주세요.",
            ),
          );
        },
        { once: true },
      );

      document.head.appendChild(script);
    },
  );

  return window.__kakaoMapSdkPromise;
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

const createToiletMarkerImage = (
  selected,
) => {
  const kakao = getKakao();
  const size = selected ? 50 : 40;
  const background =
    selected ? "#086e64" : "#0d9f8c";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="21"
        fill="${background}"
        stroke="white"
        stroke-width="${selected ? 4 : 3}"
      />
      <g
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="14" y="10" width="10" height="10" rx="2"/>
        <path d="M17 14h4"/>
        <path d="M21 20v3"/>
        <path d="M18 23h17"/>
        <path d="M19 24c0 6 3.7 9.5 8.7 9.5 4.8 0 7.3-3.2 7.3-9.5"/>
        <path d="M27 33.5V39h8"/>
      </g>
    </svg>
  `;

  return new kakao.maps.MarkerImage(
    "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(svg),
    new kakao.maps.Size(size, size),
    {
      offset: new kakao.maps.Point(
        size / 2,
        size / 2,
      ),
    },
  );
};

const createCurrentLocationImage = () => {
  const kakao = getKakao();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="38"
      height="38"
      viewBox="0 0 38 38">
      <circle
        cx="19"
        cy="19"
        r="16"
        fill="#2477f3"
        fill-opacity="0.18"
      />
      <circle
        cx="19"
        cy="19"
        r="8"
        fill="#2477f3"
        stroke="white"
        stroke-width="3"
      />
    </svg>
  `;

  return new kakao.maps.MarkerImage(
    "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(svg),
    new kakao.maps.Size(38, 38),
    {
      offset: new kakao.maps.Point(19, 19),
    },
  );
};

const getSelectedToilet = () => {
  return props.toilets.find(
    (toilet) =>
      String(toilet.id) ===
      String(props.selectedToiletId),
  );
};

const clearToiletMarkers = () => {
  toiletMarkers.forEach(({ marker }) => {
    marker.setMap(null);
  });

  toiletMarkers = [];
  infoWindow?.close();
};

const openSelectedInfoWindow = () => {
  if (!map || !infoWindow) {
    return;
  }

  const toilet = getSelectedToilet();

  const markerItem = toiletMarkers.find(
    ({ toilet: markerToilet }) =>
      String(markerToilet.id) ===
      String(props.selectedToiletId),
  );

  if (!toilet || !markerItem) {
    infoWindow.close();
    return;
  }

  infoWindow.setContent(`
    <div style="
      min-width:210px;
      padding:12px 14px;
      font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <strong style="
        display:block;
        color:#173b38;
        font-size:13px;
        line-height:1.35;
      ">
        ${escapeHtml(toilet.name)}
      </strong>

      <span style="
        display:block;
        margin-top:5px;
        color:#0d9f8c;
        font-size:11px;
        font-weight:700;
      ">
        ★ ${Number(toilet.rating ?? 0).toFixed(1)}
        · ${escapeHtml(toilet.operationStatus)}
      </span>

      <small style="
        display:block;
        margin-top:4px;
        color:#80918e;
        font-size:10px;
      ">
        ${escapeHtml(toilet.address)}
      </small>
    </div>
  `);

  infoWindow.open(map, markerItem.marker);
};

const renderToiletMarkers = () => {
  if (!map || !getKakao()?.maps) {
    return;
  }

  clearToiletMarkers();

  const kakao = getKakao();

  props.toilets.forEach((toilet) => {
    const latitude = Number(toilet.latitude);
    const longitude = Number(toilet.longitude);

    if (
      !isValidCoordinate(
        latitude,
        longitude,
      )
    ) {
      return;
    }

    const selected =
      String(toilet.id) ===
      String(props.selectedToiletId);

    const marker = new kakao.maps.Marker({
      map,
      position: new kakao.maps.LatLng(
        latitude,
        longitude,
      ),
      title: toilet.name,
      image:
        createToiletMarkerImage(selected),
      zIndex: selected ? 20 : 10,
    });

    kakao.maps.event.addListener(
      marker,
      "click",
      () => {
        emit("select", toilet);
      },
    );

    toiletMarkers.push({
      marker,
      toilet,
    });
  });

  openSelectedInfoWindow();
};

const showCurrentLocation = ({
  latitude,
  longitude,
}) => {
  if (!map || !getKakao()?.maps) {
    return;
  }

  const kakao = getKakao();

  const position =
    new kakao.maps.LatLng(
      latitude,
      longitude,
    );

  currentLocationMarker?.setMap(null);

  currentLocationMarker =
    new kakao.maps.Marker({
      map,
      position,
      image:
        createCurrentLocationImage(),
      title: "현재 위치",
      zIndex: 30,
    });

  map.setLevel(4);
  map.setCenter(position);
};

const stopLocationWatch = () => {
  if (
    locationWatchId !== null &&
    navigator.geolocation
  ) {
    navigator.geolocation.clearWatch(
      locationWatchId,
    );
  }

  if (locationTimerId !== null) {
    window.clearTimeout(
      locationTimerId,
    );
  }

  locationWatchId = null;
  locationTimerId = null;
};

const requestCurrentLocation = ({
  requestedByUser = false,
} = {}) => {
  if (!map) {
    return;
  }

  if (!navigator.geolocation) {
    emit("location-error", {
      message:
        "현재 브라우저에서는 위치 정보를 지원하지 않습니다.",
      requestedByUser,
    });

    return;
  }

  stopLocationWatch();

  let completed = false;
  let bestKoreaPosition = null;
  let lastReceivedPosition = null;

  const finishWithSuccess = (
    location,
  ) => {
    if (completed) {
      return;
    }

    completed = true;
    stopLocationWatch();

    console.log(
      "[최종 현재 위치]",
      location,
    );

    showCurrentLocation(location);

    emit(
      "location-success",
      location,
    );
  };

  const finishWithError = (
    message,
  ) => {
    if (completed) {
      return;
    }

    completed = true;
    stopLocationWatch();

    console.error(
      "[현재 위치 확인 실패]",
      {
        message,
        lastReceivedPosition,
      },
    );

    emit("location-error", {
      message,
      requestedByUser,
    });
  };

  locationWatchId =
    navigator.geolocation.watchPosition(
      ({ coords }) => {
        const location = {
          latitude: Number(
            coords.latitude,
          ),
          longitude: Number(
            coords.longitude,
          ),
          accuracy: Number(
            coords.accuracy,
          ),
        };

        console.log(
          "[위치 후보 수신]",
          location,
        );

        if (
          !isValidCoordinate(
            location.latitude,
            location.longitude,
          )
        ) {
          return;
        }

        lastReceivedPosition = location;

        /*
         * 처음 받은 해외·부정확 좌표를 바로 사용하지 않고
         * 제한 시간 동안 다음 위치 후보를 기다립니다.
         */
        if (
          !isInsideKoreaMapArea(
            location.latitude,
            location.longitude,
          )
        ) {
          return;
        }

        if (
          !bestKoreaPosition ||
          !Number.isFinite(
            bestKoreaPosition.accuracy,
          ) ||
          location.accuracy <
            bestKoreaPosition.accuracy
        ) {
          bestKoreaPosition = location;
        }

        /*
         * 정확도 1km 이내면 바로 사용하고,
         * 그보다 부정확한 값은 제한 시간까지 더 기다립니다.
         */
        if (
          Number.isFinite(
            location.accuracy,
          ) &&
          location.accuracy <= 1000
        ) {
          finishWithSuccess(
            location,
          );
        }
      },
      (error) => {
        console.warn(
          "[브라우저 위치 오류]",
          {
            code: error.code,
            message: error.message,
          },
        );

        if (error.code === 1) {
          finishWithError(
            "위치 권한이 거부되었습니다. 브라우저에서 위치 권한을 허용해주세요.",
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

  locationTimerId =
    window.setTimeout(
      () => {
        if (bestKoreaPosition) {
          finishWithSuccess(
            bestKoreaPosition,
          );
          return;
        }

        if (lastReceivedPosition) {
          finishWithError(
            "현재 기기가 대한민국 밖의 위치를 반환하고 있습니다. Chrome Sensors, VPN 또는 Windows 위치 설정을 확인해주세요.",
          );
          return;
        }

        finishWithError(
          "현재 위치를 확인하지 못했습니다. 위치 서비스를 켠 뒤 다시 시도해주세요.",
        );
      },
      18000,
    );
};

const focusToilet = (
  toiletId,
) => {
  if (!map || !getKakao()?.maps) {
    return;
  }

  const toilet = props.toilets.find(
    (item) =>
      String(item.id) ===
      String(toiletId),
  );

  if (!toilet) {
    return;
  }

  const latitude =
    Number(toilet.latitude);

  const longitude =
    Number(toilet.longitude);

  if (
    !isValidCoordinate(
      latitude,
      longitude,
    )
  ) {
    return;
  }

  map.setLevel(4);
  map.panTo(
    new getKakao().maps.LatLng(
      latitude,
      longitude,
    ),
  );
};

const relayoutMap = () => {
  if (!map) {
    return;
  }

  const center = map.getCenter();

  map.relayout();
  map.setCenter(center);
};

const initializeMap = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await loadKakaoMapSdk();
    await nextTick();

    const kakao = getKakao();

    map = new kakao.maps.Map(
      mapContainer.value,
      {
        center:
          new kakao.maps.LatLng(
            FALLBACK_CENTER.latitude,
            FALLBACK_CENTER.longitude,
          ),
        level: 4,
      },
    );

    map.setMapTypeId(
      kakao.maps.MapTypeId.ROADMAP,
    );

    map.addControl(
      new kakao.maps.ZoomControl(),
      kakao.maps.ControlPosition.RIGHT,
    );

    infoWindow =
      new kakao.maps.InfoWindow({
        removable: false,
      });

    renderToiletMarkers();

    window.setTimeout(() => {
      relayoutMap();
    }, 150);

    requestCurrentLocation({
      requestedByUser: false,
    });

    resizeHandler = () => {
      relayoutMap();
    };

    window.addEventListener(
      "resize",
      resizeHandler,
    );
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "카카오맵을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.toilets,
  () => {
    /*
     * 화장실 목록이 들어와도 지도 중심은 바꾸지 않고
     * 마커만 다시 그립니다.
     */
    renderToiletMarkers();
  },
  {
    deep: true,
  },
);

watch(
  () => props.selectedToiletId,
  () => {
    /*
     * 선택된 마커 모양과 정보창만 갱신합니다.
     */
    renderToiletMarkers();
  },
);

onMounted(() => {
  initializeMap();
});

onBeforeUnmount(() => {
  stopLocationWatch();
  clearToiletMarkers();

  currentLocationMarker?.setMap(null);

  if (resizeHandler) {
    window.removeEventListener(
      "resize",
      resizeHandler,
    );
  }

  resizeHandler = null;
  currentLocationMarker = null;
  infoWindow = null;
  map = null;
});

defineExpose({
  requestCurrentLocation,
  moveToCurrentLocation:
    requestCurrentLocation,
  focusToilet,
  relayoutMap,
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
      v-if="isLoading"
      class="kakao-map__state"
    >
      카카오맵을 불러오는 중입니다.
    </div>

    <div
      v-else-if="errorMessage"
      class="kakao-map__state kakao-map__state--error"
    >
      <strong>
        지도를 표시하지 못했습니다.
      </strong>

      <span>
        {{ errorMessage }}
      </span>
    </div>
  </div>
</template>

<style scoped>
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
 * 전역 img { max-width: 100%; }가
 * 카카오 지도 타일을 축소하지 않도록 합니다.
 */
.kakao-map :deep(img) {
  max-width: none !important;
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
    rgba(241, 249, 247, 0.94);
  color: #56716d;
  font-size: 13px;
  text-align: center;
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
</style>
