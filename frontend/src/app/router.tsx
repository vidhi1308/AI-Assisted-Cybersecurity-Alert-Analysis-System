import { createBrowserRouter } from "react-router-dom";
import { Shell } from "../components/layout/Shell";
import { AlertsPage } from "../pages/AlertsPage";
import { AlertDetailPage } from "../pages/AlertDetailPage";
import { MitreHeatmapPage } from "../pages/MitreHeatmapPage";
import { AlertsByTechniquePage } from "../pages/AlertsByTechniquePage";
import { DetectionsPage } from "../pages/DetectionsPage";
import { PlaybooksPage } from "../pages/PlaybooksPage";
import { CoverageDashboardPage } from "../pages/CoverageDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { path: "/", element: <AlertsPage /> },
      { path: "/alerts/:alertId", element: <AlertDetailPage /> },
      { path: "/detections", element: <DetectionsPage /> },
      { path: "/playbooks", element: <PlaybooksPage /> },
      { path: "/mitre", element: <MitreHeatmapPage /> },
      { path: "/mitre/technique/:techId", element: <AlertsByTechniquePage /> },
      { path: "/coverage", element: <CoverageDashboardPage /> },
    ],
  },
]);