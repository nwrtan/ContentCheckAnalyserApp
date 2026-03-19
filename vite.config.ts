import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";

// https://vite.dev/config/
export default defineConfig(() => {
  const isLocalDev = process.env.VITE_LOCAL_DEV === "true";
  const orgUrl = process.env.VITE_ORG_URL || "https://editorialworkflow.crm.dynamics.com";

  return {
    plugins: [
      react(),
      // Only load the Power Apps plugin when NOT in local dev mode
      ...(!isLocalDev ? [powerApps()] : []),
    ],
    server: isLocalDev
      ? {
          proxy: {
            // Proxy /api/dataverse/* → Dataverse OData API
            "/api/dataverse": {
              target: `${orgUrl}/api/data/v9.2`,
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/api\/dataverse/, ""),
              configure: (proxy) => {
                // Read token from environment variable set by the dev script
                proxy.on("proxyReq", (proxyReq) => {
                  const token = process.env.DATAVERSE_TOKEN;
                  if (token) {
                    proxyReq.setHeader("Authorization", `Bearer ${token}`);
                  }
                  proxyReq.setHeader("OData-MaxVersion", "4.0");
                  proxyReq.setHeader("OData-Version", "4.0");
                });
              },
            },
          },
        }
      : undefined,
  };
});
