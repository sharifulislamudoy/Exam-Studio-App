const fs = require("node:fs");
module.exports = {
  expo: {
    name: "Exam Studio",
    platforms: ["android", "ios"],
    slug: "exam-studio-student",
    version: "1.0.0",
    scheme: "examstudio",
    orientation: "portrait",
    userInterfaceStyle: "light",
    android: {
      package: "com.shariful.examstudio",
      ...(process.env.GOOGLE_SERVICES_JSON ||
      fs.existsSync("./google-services.json")
        ? {
            googleServicesFile:
              process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
          }
        : {}),
    },
    ios: {
      bundleIdentifier: "com.shariful.examstudio",
      supportsTablet: true,
      ...(process.env.ALLOW_HTTP === "true"
        ? {
            infoPlist: {
              NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
              NSLocalNetworkUsageDescription:
                "Connect to your local Exam Studio test server.",
            },
          }
        : {}),
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
      "expo-notifications",
      [
        "expo-build-properties",
        {
          android: { usesCleartextTraffic: process.env.ALLOW_HTTP === "true" },
        },
      ],
    ],
    extra: {
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
        : {}),
    },
  },
};
