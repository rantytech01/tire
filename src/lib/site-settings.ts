import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
};

/** Used before the row has loaded and as a safety net if the fetch fails. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: "+254 700 000 000",
  whatsapp: "254700000000",
  email: "sales@whitegoosetires.co.ke",
  address: "Nairobi, Kenya",
};

export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("phone,whatsapp,email,address")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return DEFAULT_SITE_SETTINGS;
    return data as SiteSettings;
  },
  staleTime: 5 * 60 * 1000,
});

/** Contact info shown across the storefront (header, footer, WhatsApp links). */
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery(siteSettingsQuery);
  return data ?? DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(update: Partial<SiteSettings>) {
  const { error } = await supabase.from("site_settings").update(update).eq("id", 1);
  if (error) throw error;
}
