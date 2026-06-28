import { useEffect } from "react";

export function AdSenseScript() {
  useEffect(() => {
    const pubId = (import.meta as any).env.VITE_GOOGLE_ADSENSE_PUB_ID;
    if (!pubId) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}

interface AdUnitProps {
  slotId: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  responsive?: boolean;
}

export function AdUnit({ slotId, format = "auto", responsive = true }: AdUnitProps) {
  const pubId = (import.meta as any).env.VITE_GOOGLE_ADSENSE_PUB_ID;

  if (!pubId) {
    return null;
  }

  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={pubId}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={responsive.toString()}
    />
  );
}
