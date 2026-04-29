import { useEffect, useRef } from "react";

export const INFEED_AD_ENABLED = true;

const IMOBILE_SCRIPT_SRC =
  "https://spdeliver.i-mobile.co.jp/script/adsnativepc.js?20101001";

const IMOBILE_AD_SLOTS = [
  {
    containerId: "imobile_ad_native_59243720260427200322",
    pid: "84841",
    asid: "1929720",
  },
  {
    containerId: "imobile_ad_native_59243720260429225346",
    pid: "84841",
    asid: "1929832",
  },
  {
    containerId: "imobile_ad_native_59243720260429225432",
    pid: "84841",
    asid: "1929833",
  },
];

let imobileScriptPromise = null;

const loadImobileScript = () => {
  if (window.Imobile?.Native?.PC?.showAds) {
    return Promise.resolve();
  }

  if (imobileScriptPromise) {
    return imobileScriptPromise;
  }

  imobileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = IMOBILE_SCRIPT_SRC;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("i-mobile広告スクリプトの読み込みに失敗しました"));

    document.body.appendChild(script);
  });

  return imobileScriptPromise;
};

function AdsenseSlot({
  className = "",
  style = {},
  adIndex = 0,
}) {
  const adRef = useRef(null);

  useEffect(() => {
    if (!INFEED_AD_ENABLED) return;
    if (!adRef.current) return;

    const adSlot = IMOBILE_AD_SLOTS[adIndex];

    if (!adSlot) return;

    adRef.current.innerHTML = "";

    const adContainer = document.createElement("div");
    adContainer.id = adSlot.containerId;
    adRef.current.appendChild(adContainer);

    loadImobileScript()
      .then(() => {
        if (!window.Imobile?.Native?.PC?.showAds) return;

        window.Imobile.Native.PC.showAds({
          pid: adSlot.pid,
          asid: adSlot.asid,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }, [adIndex]);

  if (!INFEED_AD_ENABLED) {
    return null;
  }

  if (!IMOBILE_AD_SLOTS[adIndex]) {
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