import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.transcripts.app",
  appName: "Transcripts",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
