import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";
const inExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const projectId =
  Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;

export const pushAvailable = !inExpoGo && !!projectId;

function notificationModule() {
  return require("expo-notifications") as typeof import("expo-notifications");
}

export function listenForPush(onOpen: () => void) {
  if (!pushAvailable) return;
  const notifications = notificationModule();
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  return notifications.addNotificationResponseReceivedListener(onOpen);
}

export async function registerPush() {
  if (!pushAvailable || !projectId)
    throw new Error("Push notifications require a configured app build.");
  const Notifications = notificationModule();
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("classroom", {
      name: "Classroom",
      importance: Notifications.AndroidImportance.HIGH,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted")
    permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Notification permission was denied. You can still see updates in Notifications.",
    );
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("/devices", "POST", { token: data });
  await SecureStore.setItemAsync("pushToken", data);
  return data;
}
