import { useEffect, useRef } from "react";

export const INFEED_AD_ENABLED = false;

function AdsenseSlot({
  className = "",
  slot,
  format = "auto",
  responsive = "true",
  style = {},
  layout = "",
  layoutKey = "",
}) {
  const adRef = useRef(null);

  useEffect(() => {
    if (!INFEED_AD_ENABLED) return;
    if (!adRef.current) return;

    // i-mobile承認後、ここに広告タグをReact用に入れる
    // 承認前は何もしない
  }, []);

  if (!INFEED_AD_ENABLED) {
    return null;
  }

  return (
    <div className={className} style={style}>
      <div className="ad-label">広告</div>

      <div
        ref={adRef}
        className="imobile-ad-body"
        aria-label="i-mobile広告枠"
      />
    </div>
  );
}

export default AdsenseSlot;