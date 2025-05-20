import { GitHubBanner, Refine, Authenticated, I18nProvider } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { useTranslation } from "react-i18next";
import "./i18n";

import { useNotificationProvider, AuthPage, ThemedLayoutV2, ThemedSiderV2 } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
  NavigateToResource,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { App as AntdApp, ConfigProvider } from "antd";
import { SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import authProvider from "./authProvider";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { supabaseClient } from "./utility";
import { Header } from "./components/header";
import { useUserRole } from "./utility/hooks/useUserRole";
import jaJP from "antd/locale/ja_JP";

// リソースコンポーネントのインポート
import { ImagesList, ImagesCreate, ImagesEdit, ImagesShow } from "./pages/images";
import { ProfilesList, ProfilesCreate, ProfilesEdit, ProfilesShow } from "./pages/profiles";
import { DownloadLogsList, DownloadLogsCreate, DownloadLogsEdit, DownloadLogsShow } from "./pages/download_logs";
import { WatermarkSettings } from "./pages/settings/watermark";
import { LoginPage } from "./pages/login";

function App() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useUserRole();

  const i18nProvider: I18nProvider = {
    translate: (key, params) => {
      const result = t(key, params);
      return typeof result === 'string' ? result : key;
    },
    changeLocale: (lang) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  console.log(t("auth.logout"));

  return (
    (<BrowserRouter>
      <GitHubBanner />
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <ConfigProvider locale={jaJP}>
            <AntdApp>
              <DevtoolsProvider>
                <Refine
                  dataProvider={dataProvider(supabaseClient)}
                  // liveProvider={liveProvider(supabaseClient)} // 一時的にコメントアウト
                  authProvider={authProvider}
                  routerProvider={routerBindings}
                  notificationProvider={useNotificationProvider}
                  i18nProvider={i18nProvider}
                  resources={[
                    {
                      name: "images",
                      list: "/images",
                      create: "/images/create",
                      edit: "/images/edit/:id",
                      show: "/images/show/:id",
                      meta: {
                        canDelete: true,
                        label: "画像管理"
                      },
                    },
                    // 管理者メニューは一般ユーザーには一切表示されません
                    ...(isAdmin ? [
                      {
                        name: "admin",
                        meta: {
                          label: "管理者限定",
                          icon: <TeamOutlined />
                        }
                      },
                      {
                        name: "profiles",
                        list: "/profiles",
                        create: "/profiles/create",
                        edit: "/profiles/edit/:id",
                        show: "/profiles/show/:id",
                        meta: {
                          canDelete: true,
                          label: "プロフィール管理"
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
                          label: "ダウンロード履歴",
                          options: { group: "管理者メニュー" }
                        },
                      },
                      {
                        name: "settings",
                        meta: {
                          label: "設定",
                          icon: <SettingOutlined />
                        },
                        list: "/settings/watermark",
                        options: { group: "管理者メニュー" },
                      },
                    ] : []),
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
                      element={<LoginPage />}
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
                        <Route path="view/:id" element={<ImagesShow />} />
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
                      <Route path="/settings">
                        <Route index element={<Navigate to="/settings/watermark" />} />
                        <Route path="watermark" element={<WatermarkSettings />} />
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
          </ConfigProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>)
  );
}

export default App;
