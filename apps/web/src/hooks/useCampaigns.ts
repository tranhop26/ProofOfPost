import { useQuery } from "@tanstack/react-query";
import { readAddressCampaigns, readCampaign } from "../lib/contract";

export function useCampaign(id: number | null) {
  return useQuery({ queryKey: ["campaign", id], queryFn: () => readCampaign(id!), enabled: id !== null, refetchInterval: (query) => query.state.data?.state === "SUBMITTED" ? 5000 : false });
}

export function useAddressCampaigns(wallet: string | null) {
  const sponsor = useQuery({ queryKey: ["campaigns", "sponsor", wallet], queryFn: () => readAddressCampaigns("sponsor", wallet!), enabled: Boolean(wallet) });
  const creator = useQuery({ queryKey: ["campaigns", "creator", wallet], queryFn: () => readAddressCampaigns("creator", wallet!), enabled: Boolean(wallet) });
  return { sponsor, creator };
}
