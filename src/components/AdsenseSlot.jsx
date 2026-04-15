import { useEffect, useRef } from "react";

function AdsenseSlot({
  className = "",
  slot,
  format = "auto",
  responsive = "true",
  style = {},
  layout = "",
  layoutKey = "",
}) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;

    try {
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch (error) {
      console.error("AdSense表示エラー:", error);
    }
  }, []);

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client="ca-pub-5791768646198109"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
        {...(layout ? { "data-ad-layout": layout } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
      />
    </div>
  );
}

export default AdsenseSlot;