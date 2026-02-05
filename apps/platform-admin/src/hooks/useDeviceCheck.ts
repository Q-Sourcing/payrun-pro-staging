import { useCallback, useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

import { getEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type DeviceRecord = {
  id?: string;
  admin_id?: string;
  device_id: string;
  device_name?: string | null;
  browser?: string | null;
  os?: string | null;
  approved?: boolean | null;
};

const DEVICE_KEY = "platform-admin-device-id";

export function useDeviceCheck() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { VITE_ALLOW_DEVICE_REGISTRATION } = getEnv();

  const loadFingerprint = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cached = localStorage.getItem(DEVICE_KEY);
      if (cached) {
        setDeviceId(cached);
        return cached;
      }
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      localStorage.setItem(DEVICE_KEY, result.visitorId);
      setDeviceId(result.visitorId);
      return result.visitorId;
    } catch (err) {
      console.error("Fingerprint load error", err);
      setError("Unable to generate device fingerprint");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyDevice = useCallback(
    async (adminId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const id = deviceId ?? (await loadFingerprint());
        if (!id) throw new Error("Missing device id");
        const { data, error: supabaseError } = await supabase
          .from("platform_admin_devices")
          .select("id, approved, admin_id")
          .eq("device_id", id)
          .maybeSingle();
        if (supabaseError) throw supabaseError;

        if (!data) {
          setApproved(false);
          return { exists: false, approved: false as const, deviceId: id };
        }
        const allowed = data.approved ?? false;
        setApproved(allowed);
        return {
          exists: true,
          approved: allowed as boolean,
          deviceId: id,
          adminId: data.admin_id ?? adminId,
        };
      } catch (err) {
        console.error("Device verification failed", err);
        setError("Device check failed");
        setApproved(null);
        return { exists: false, approved: false as const, deviceId: deviceId };
      } finally {
        setLoading(false);
      }
    },
    [deviceId, loadFingerprint],
  );

  const registerDevice = useCallback(
    async (adminId?: string) => {
      if (!VITE_ALLOW_DEVICE_REGISTRATION) {
        setError("Device not approved. Registration disabled.");
        return { success: false, deviceId };
      }
      setLoading(true);
      setError(null);
      try {
        const id = deviceId ?? (await loadFingerprint());
        if (!id) throw new Error("Missing device id");

        const payload: DeviceRecord = {
          device_id: id,
          admin_id: adminId,
          device_name: navigator.platform,
          browser: navigator.userAgent,
          os: navigator.userAgent,
          approved: false,
        };

        const { error: supabaseError } = await supabase
          .from("platform_admin_devices")
          .upsert(payload, { onConflict: "device_id" });
        if (supabaseError) throw supabaseError;
        setApproved(false);
        return { success: true, deviceId: id };
      } catch (err) {
        console.error("Device registration failed", err);
        setError("Device registration failed");
        return { success: false, deviceId };
      } finally {
        setLoading(false);
      }
    },
    [VITE_ALLOW_DEVICE_REGISTRATION, deviceId, loadFingerprint],
  );

  useEffect(() => {
    const cached = localStorage.getItem(DEVICE_KEY);
    if (cached) setDeviceId(cached);
    else void loadFingerprint();
  }, [loadFingerprint]);

  return {
    deviceId,
    approved,
    loading,
    error,
    verifyDevice,
    registerDevice,
    refreshDeviceId: loadFingerprint,
  };
}








