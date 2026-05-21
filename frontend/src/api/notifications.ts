import api from "./axios";
import type { NotificationResponse } from "@/types";

export const getNotifications = (params?: { unread_only?: boolean }) =>
  api
    .get<NotificationResponse[]>("/api/notifications/", { params })
    .then((r) => r.data);

export const markNotificationRead = (id: number) =>
  api.patch(`/api/notifications/${id}/read`).then((r) => r.data);
