import { WifiOff } from "lucide-react";

type Props = {
  isOnline: boolean;
  cacheWarning?: string | null;
};

export function NetworkStatusBanner({ isOnline, cacheWarning }: Props) {
  if (isOnline && !cacheWarning) return null;

  return (
    <div className="network-banner">
      <WifiOff size={18} />
      <span>{isOnline ? cacheWarning : "当前处于离线状态，只能查看最近缓存；保存需要联网。"}</span>
    </div>
  );
}
