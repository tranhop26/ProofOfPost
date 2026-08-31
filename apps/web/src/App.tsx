import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreateCampaign } from "./pages/CreateCampaign";
import { CampaignDetail } from "./pages/CampaignDetail";
import { NotFound } from "./pages/NotFound";

export function AppRoutes() {
  return <Routes><Route element={<Shell />}><Route index element={<Landing />} /><Route path="dashboard" element={<Dashboard />} /><Route path="campaigns/new" element={<CreateCampaign />} /><Route path="campaigns/:id" element={<CampaignDetail />} /><Route path="*" element={<NotFound />} /></Route></Routes>;
}
