import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_CDN_PROVIDER: z.enum(["cloudinary", "cloudflare", "imgproxy", "local"]).default("local"),
    VITE_CLOUDINARY_CLOUD_NAME: z.string().optional(),
    VITE_CLOUDFLARE_ACCOUNT_HASH: z.string().optional(),
    VITE_IMGPROXY_URL: z.string().url().optional(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
