import { GitHubBanner, Refine, Authenticated } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import { useNotificationProvider, AuthPage, ThemedLayoutV2, ThemedSiderV2 } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
  NavigateToResource,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { App as AntdApp } from "antd";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import authProvider from "./authProvider";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { supabaseClient } from "./utility";
import { Header } from "./components/header";

// リソースコンポーネントのインポート
import { ImagesList, ImagesCreate, ImagesEdit, ImagesShow } from "./pages/images";
import { ProfilesList, ProfilesCreate, ProfilesEdit, ProfilesShow } from "./pages/profiles";
import { DownloadLogsList, DownloadLogsCreate, DownloadLogsEdit, DownloadLogsShow } from "./pages/download_logs";
import { ImagePage } from "./pages/ImagePage";

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider(supabaseClient)}
                liveProvider={liveProvider(supabaseClient)}
                authProvider={authProvider}
                routerProvider={routerBindings}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "images",
                    list: "/images",
                    create: "/images/create",
                    edit: "/images/edit/:id",
                    show: "/images/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                  {
                    name: "profiles",
                    list: "/profiles",
                    create: "/profiles/create",
                    edit: "/profiles/edit/:id", 
                    show: "/profiles/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                  {
                    name: "download_logs",
                    list: "/download_logs",
                    create: "/download_logs/create",
                    edit: "/download_logs/edit/:id",
                    show: "/download_logs/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  useNewQueryKeys: true,
                  projectId: "8bMwO5-JFTWA5-gbWJmu",
                }}
              >
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <AuthPage
                        type="login"
                        formProps={{
                          initialValues: {
                            email: "admin@kater.jp",
                            password: "password123",
                          },
                        }}
                      />
                    }
                  />
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-routes"
                        fallback={<Navigate to="/login" />}
                      >
                        <ThemedLayoutV2
                          Header={Header}
                          Sider={(props) => <ThemedSiderV2 {...props} />}
                        >
                          <Outlet />
                        </ThemedLayoutV2>
                      </Authenticated>
                    }
                  >
                    <Route path="/images">
                      <Route index element={<ImagesList />} />
                      <Route path="create" element={<ImagesCreate />} />
                      <Route path="edit/:id" element={<ImagesEdit />} />
                      <Route path="show/:id" element={<ImagesShow />} />
                      <Route path="view/:id" element={<ImagePage />} />
                    </Route>
                    <Route path="/profiles">
                      <Route index element={<ProfilesList />} />
                      <Route path="create" element={<ProfilesCreate />} />
                      <Route path="edit/:id" element={<ProfilesEdit />} />
                      <Route path="show/:id" element={<ProfilesShow />} />
                    </Route>
                    <Route path="/download_logs">
                      <Route index element={<DownloadLogsList />} />
                      <Route path="create" element={<DownloadLogsCreate />} />
                      <Route path="edit/:id" element={<DownloadLogsEdit />} />
                      <Route path="show/:id" element={<DownloadLogsShow />} />
                    </Route>
                    <Route path="/" element={<Navigate to="/images" />} />
                  </Route>
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
