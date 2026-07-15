import {
  createRouter,
  createWebHistory,
} from "vue-router";

import HomeView from "../views/HomeView.vue";
import CommunityView from "../views/CommunityView.vue";
import CommunityPostDetailView from "../views/CommunityPostDetailView.vue";
import CommunityPostFormView from "../views/CommunityPostFormView.vue";

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL,
  ),

  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/map",
      redirect: "/",
    },
    {
      path: "/community",
      name: "community",
      component: CommunityView,
    },
    {
      path: "/community/new",
      name: "community-create",
      component: CommunityPostFormView,
    },
    {
      path: "/community/:postId/edit",
      name: "community-edit",
      component: CommunityPostFormView,
    },
    {
      path: "/community/:postId",
      name: "community-detail",
      component: CommunityPostDetailView,
    },
  ],
});

export default router;