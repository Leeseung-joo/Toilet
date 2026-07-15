const STORAGE_KEY = "toilet-community-posts";
const DELETED_IDS_KEY = "toilet-community-deleted-post-ids";

export const CATEGORY_OPTIONS = [
  { value: "REPORT", label: "이용 제보" },
  { value: "QUESTION", label: "질문" },
  { value: "REVIEW", label: "후기" },
];

const defaultPosts = [
  {
    id: 1,
    author: "익명 이용자",
    createdAt: "2026.07.14 12:20",
    category: "REPORT",
    title: "대전역 동광장 화장실, 휴지 있어요",
    content:
      "10분 전 이용했는데 깨끗하고 휴지도 넉넉합니다.\n장애인 화장실과 기저귀 교환대도 정상 이용 가능했어요.\n급하신 분은 동광장 쪽을 이용하면 좋겠습니다.",
    toiletName: "대전역 동광장 공중화장실",
    toiletAddress: "대전광역시 동구 중앙로 215",
    rating: 4.7,
    operationStatus: "현재 운영 중",
    likeCount: 18,
    liked: false,
    password: "1234",
    comments: [
      {
        id: 101,
        author: "익명 이용자",
        content: "감사해요! 덕분에 바로 찾았습니다.",
        createdAt: "약 5분 전",
      },
      {
        id: 102,
        author: "익명 이용자",
        content: "저도 방금 이용했는데 운영 중이에요.",
        createdAt: "약 2분 전",
      },
    ],
  },
  {
    id: 2,
    author: "익명 이용자",
    createdAt: "2026.07.14 12:05",
    category: "QUESTION",
    title: "은행동 화장실 지금 사람이 많나요?",
    content: "30분 안에 방문하려고 하는데 현재 혼잡도가 궁금합니다.",
    toiletName: "은행동 으능정이 공중화장실",
    toiletAddress: "대전광역시 중구 중앙로 일대",
    rating: 4.2,
    operationStatus: "현재 운영 중",
    likeCount: 11,
    liked: true,
    password: "1234",
    comments: [
      {
        id: 201,
        author: "익명 이용자",
        content: "지금은 줄이 길지 않습니다.",
        createdAt: "약 8분 전",
      },
    ],
  },
  {
    id: 3,
    author: "익명 이용자",
    createdAt: "2026.07.14 11:35",
    category: "REVIEW",
    title: "기저귀 교환대가 잘 정리되어 있어요",
    content: "가족 단위 이용자에게 편리했고 전체적으로 관리 상태도 좋았습니다.",
    toiletName: "엑스포시민광장 공중화장실",
    toiletAddress: "대전광역시 유성구 엑스포로",
    rating: 4.5,
    operationStatus: "현재 운영 중",
    likeCount: 15,
    liked: false,
    password: "1234",
    comments: [],
  },
];

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`[localStorage 읽기 실패: ${key}]`, error);
    return fallback;
  }
};

const writeJson = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const getStoredPosts = () => {
  const posts = readJson(STORAGE_KEY, []);
  return Array.isArray(posts) ? posts : [];
};

const getDeletedIds = () => {
  const ids = readJson(DELETED_IDS_KEY, []);
  return new Set(Array.isArray(ids) ? ids.map(String) : []);
};

export const getCommunityPosts = () => {
  const storedPosts = getStoredPosts();
  const storedIds = new Set(storedPosts.map((post) => String(post.id)));
  const deletedIds = getDeletedIds();

  return [
    ...storedPosts,
    ...defaultPosts.filter(
      (post) =>
        !storedIds.has(String(post.id)) &&
        !deletedIds.has(String(post.id)),
    ),
  ];
};

export const getCommunityPostById = (postId) =>
  getCommunityPosts().find((post) => String(post.id) === String(postId)) ?? null;

export const saveCommunityPost = (post) => {
  const storedPosts = getStoredPosts();
  const index = storedPosts.findIndex(
    (item) => String(item.id) === String(post.id),
  );

  if (index >= 0) storedPosts[index] = { ...storedPosts[index], ...post };
  else storedPosts.unshift(post);

  writeJson(STORAGE_KEY, storedPosts);

  const deletedIds = getDeletedIds();
  deletedIds.delete(String(post.id));
  writeJson(DELETED_IDS_KEY, [...deletedIds]);

  return post;
};

export const createCommunityPost = ({
  category,
  toiletName,
  title,
  content,
  password,
}) =>
  saveCommunityPost({
    id: Date.now(),
    author: "익명 이용자",
    createdAt: "방금 전",
    category,
    title,
    content,
    toiletName,
    toiletAddress: "주소 정보 확인 중",
    rating: 0,
    operationStatus: "운영 정보 확인 필요",
    likeCount: 0,
    liked: false,
    password,
    comments: [],
  });

export const updateCommunityPost = (postId, changes) => {
  const original = getCommunityPostById(postId);
  if (!original) return null;

  return saveCommunityPost({
    ...original,
    ...changes,
    id: original.id,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteCommunityPost = (postId) => {
  writeJson(
    STORAGE_KEY,
    getStoredPosts().filter((post) => String(post.id) !== String(postId)),
  );

  const deletedIds = getDeletedIds();
  deletedIds.add(String(postId));
  writeJson(DELETED_IDS_KEY, [...deletedIds]);
};

export const verifyCommunityPostPassword = (postId, password) => {
  const post = getCommunityPostById(postId);
  return Boolean(post && String(post.password) === String(password));
};

export const toggleCommunityPostLike = (postId) => {
  const post = getCommunityPostById(postId);
  if (!post) return null;

  return saveCommunityPost({
    ...post,
    liked: !post.liked,
    likeCount: Number(post.likeCount ?? 0) + (post.liked ? -1 : 1),
  });
};
