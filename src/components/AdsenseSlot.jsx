import { useEffect, useRef } from "react";

export const INFEED_AD_ENABLED = true;

const PC_SCRIPT_SRC =
  "https://spdeliver.i-mobile.co.jp/script/adsnativepc.js?20101001";

const SP_SCRIPT_SRC =
  "https://spad.i-mobile.co.jp/script/adsnativesp.js?20101001";

const PC_AD_SLOTS = [
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

const SP_AD_SLOTS = [
  {
    containerId: "imobile_ad_native_59243820260429232543",
    pid: "84841",
    asid: "1929834",
  },
  {
    containerId: "imobile_ad_native_59243820260429232645",
    pid: "84841",
    asid: "1929835",
  },
];

export const getIsMobileAdView = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
};

export const getInfeedAdPositions = () => {
  if (getIsMobileAdView()) {
    // スマホは2枠だけ
    return [0, 3];
  }

  // PCは3枠
  return [0, 3, 6];
};

let pcScriptPromise = null;
let spScriptPromise = null;

const loadScript = (src, type) => {
  const isLoaded =
    type === "sp"
      ? window.IMobile?.Native?.SP?.showAds
      : window.IMobile?.Native?.PC?.showAds;

  if (isLoaded) {
    return Promise.resolve();
  }

  if (type === "sp" && spScriptPromise) {
    return spScriptPromise;
  }

  if (type === "pc" && pcScriptPromise) {
    return pcScriptPromise;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`i-mobile広告スクリプトの読み込みに失敗しました: ${src}`));

    document.body.appendChild(script);
  });

  if (type === "sp") {
    spScriptPromise = promise;
  } else {
    pcScriptPromise = promise;
  }

  return promise;
};

function AdsenseSlot({ className = "", style = {}, adIndex = 0 }) {
  const adRef = useRef(null);

  useEffect(() => {
    if (!INFEED_AD_ENABLED) return;
    if (!adRef.current) return;

    const isMobile = getIsMobileAdView();
    const adType = isMobile ? "sp" : "pc";
    const adSlots = isMobile ? SP_AD_SLOTS : PC_AD_SLOTS;
    const scriptSrc = isMobile ? SP_SCRIPT_SRC : PC_SCRIPT_SRC;
    const adSlot = adSlots[adIndex];

    const adWrap = adRef.current.closest(".infeed-ad-wrap");

    if (!adSlot) {
      if (adWrap) adWrap.style.display = "none";
      return;
    }

    if (adWrap) adWrap.style.display = "";

    adRef.current.innerHTML = "";

    const adContainer = document.createElement("div");
    adContainer.id = adSlot.containerId;
    adRef.current.appendChild(adContainer);

    loadScript(scriptSrc, adType)
      .then(() => {
        const showAds =
          adType === "sp"
            ? window.IMobile?.Native?.SP?.showAds
            : window.IMobile?.Native?.PC?.showAds;

        if (!showAds) {
          console.log("i-mobile: showAds not found", adType);
          if (adWrap) adWrap.style.display = "none";
          return;
        }

        showAds({
          pid: adSlot.pid,
          asid: adSlot.asid,
        });

        setTimeout(() => {
          const container = document.getElementById(adSlot.containerId);

          const hasAdContent =
            container &&
            container.innerHTML.trim().length > 0 &&
            container.childNodes.length > 0;

          if (!hasAdContent && adWrap) {
            adWrap.style.display = "none";
          }

          if (hasAdContent && adWrap) {
            adWrap.style.display = "";
          }
        }, 2000);
      })
      .catch((error) => {
        console.error("i-mobile: script load failed", error);
        if (adWrap) adWrap.style.display = "none";
      });
  }, [adIndex]);

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