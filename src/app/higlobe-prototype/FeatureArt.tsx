import type { CSSProperties, ReactNode } from "react";
import styles from "./higlobe-prototype.module.css";

type FeatureArtType = "card" | "send" | "bitso" | "rate";

const artworkFrames: Record<
  FeatureArtType,
  { width: number; height: number; frameWidth: number; frameHeight: number; offsetX: number; offsetY: number }
> = {
  card: { width: 60, height: 47, frameWidth: 42, frameHeight: 29, offsetX: 9, offsetY: 8 },
  send: { width: 57, height: 49, frameWidth: 36, frameHeight: 28, offsetX: 10, offsetY: 9 },
  bitso: { width: 64, height: 64, frameWidth: 42, frameHeight: 42, offsetX: 10, offsetY: 10 },
  rate: { width: 94, height: 64, frameWidth: 72, frameHeight: 42, offsetX: 10, offsetY: 10 },
};

function SvgFrame({ type, children }: { type: FeatureArtType; children: ReactNode }) {
  const frame = artworkFrames[type];
  const style = {
    width: frame.frameWidth,
    height: frame.frameHeight,
    "--feature-art-x": `${-frame.offsetX}px`,
    "--feature-art-y": `${-frame.offsetY}px`,
  } as CSSProperties;

  return (
    <span className={styles.featureArt} aria-hidden="true" style={style}>
      {children}
    </span>
  );
}

function CardArt() {
  return (
    <SvgFrame type="card">
      <svg className={styles.featureArtSvg} width="60" height="47" viewBox="0 0 60 47" fill="none">
        <g filter="url(#feature-card-shadow)">
          <path
            className={styles.cardLayerBack}
            d="M17.9148 36.4501L9.15541 22.7714C8.75648 22.1484 9.15776 21.321 9.89014 21.2565L32.4359 19.2691C32.8231 19.235 33.1934 19.4359 33.3787 19.7805L39.8147 31.7537C40.1315 32.343 39.7846 33.0724 39.1307 33.1918L18.9082 36.8846C18.5205 36.9554 18.1286 36.784 17.9148 36.4501Z"
            fill="url(#feature-card-blue)"
          />
          <path
            className={styles.cardLayerMiddle}
            d="M18.2758 33.3873L11.581 15.8431C11.3383 15.2069 11.7945 14.5203 12.4701 14.5052L34.2832 14.0168C34.6393 14.0088 34.9714 14.1972 35.1497 14.5083L43.1922 28.5423C43.5323 29.1359 43.1819 29.8898 42.5119 30.0054L19.3511 34.004C18.8928 34.0831 18.4429 33.825 18.2758 33.3873Z"
            fill="url(#feature-card-purple)"
          />
          <path
            className={styles.cardLayerFront}
            d="M23.5114 29.157L15.498 9.90039C15.2316 9.20222 16.2567 7.91726 16.998 7.90066H41.0771C41.4679 7.89191 41.8323 8.09863 42.0279 8.44L50.8534 23.8403C51.2267 24.4917 50.8421 25.319 50.1069 25.4459L24.6913 29.8337C24.1884 29.9205 23.6947 29.6373 23.5114 29.157Z"
            fill="url(#feature-card-pink)"
          />
        </g>
        <defs>
          <filter id="feature-card-shadow" x="-0.000247955" y="-0.000551105" width="59.9966" height="46.9966" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.09735" />
            <feGaussianBlur stdDeviation="4.49915" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="feature-card-blue" x1="30.9496" y1="21.1938" x2="16.9259" y2="38.304" gradientUnits="userSpaceOnUse">
            <stop stopColor="#617FAE" />
            <stop offset="1" stopColor="#4873B5" />
          </linearGradient>
          <linearGradient id="feature-card-purple" x1="24.0351" y1="31.5945" x2="46.7551" y2="15.198" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B968EB" />
            <stop offset="1" stopColor="#AC59E0" />
          </linearGradient>
          <linearGradient id="feature-card-pink" x1="29.832" y1="27.1897" x2="54.7639" y2="9.19689" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D50953" />
            <stop offset="1" stopColor="#FF1469" />
          </linearGradient>
        </defs>
      </svg>
    </SvgFrame>
  );
}

function PaperPlaneArt() {
  return (
    <SvgFrame type="send">
      <svg className={styles.featureArtSvg} width="57" height="49" viewBox="0 0 57 49" fill="none">
        <g className={styles.planeBody} filter="url(#feature-plane-shadow)">
          <path d="M18.3652 25.9393L20.637 35.8131L23.3456 28.5607L45.4515 9.59961L18.3652 25.9393Z" fill="url(#feature-plane-wing)" />
          <g className={styles.planeTail}>
            <path d="M28.5005 31.9688L20.6367 35.9008L23.1706 28.6484L28.5005 31.9688Z" fill="#11484D" />
            <path d="M28.5005 31.9688L20.6367 35.9008L23.1706 28.6484L28.5005 31.9688Z" fill="url(#feature-plane-tail)" />
          </g>
          <path d="M38.3093 35.0779L45.4525 9.59961L23.1719 28.6481L35.3245 36.2345C36.4562 36.941 37.9492 36.3624 38.3093 35.0779Z" fill="url(#feature-plane-body)" />
          <path d="M45.4516 9.59961L11.3629 17.9566C10.5687 18.1513 10.3312 19.1652 10.9564 19.6924L18.3654 25.9393L45.4516 9.59961Z" fill="url(#feature-plane-top)" />
        </g>
        <defs>
          <filter id="feature-plane-shadow" x="-0.000391006" y="-0.000391006" width="56.0535" height="48.1395" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1" />
            <feGaussianBlur stdDeviation="5.3" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="feature-plane-wing" x1="14.8041" y1="40.7443" x2="25.0959" y2="43.9024" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF1469" />
            <stop offset="1" stopColor="#D50953" />
          </linearGradient>
          <linearGradient id="feature-plane-tail" x1="25.3175" y1="29.3391" x2="23.1152" y2="34.8227" gradientUnits="userSpaceOnUse">
            <stop stopColor="#05645E" />
            <stop offset="1" stopColor="#073A37" />
          </linearGradient>
          <linearGradient id="feature-plane-body" x1="34.7502" y1="31.9875" x2="50.1882" y2="12.7207" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D50953" />
            <stop offset="1" stopColor="#FF1469" />
          </linearGradient>
          <linearGradient id="feature-plane-top" x1="10.4261" y1="15.447" x2="18.4853" y2="9.79986" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D50953" />
            <stop offset="1" stopColor="#FF1469" />
          </linearGradient>
        </defs>
      </svg>
    </SvgFrame>
  );
}

function BitsoArt() {
  return (
    <SvgFrame type="bitso">
      <svg className={styles.featureArtSvg} width="64" height="64" viewBox="0 0 64 64" fill="none">
        <g className={styles.bitsoBody} filter="url(#feature-bitso-shadow)">
          <circle cx="31.5996" cy="30.5996" r="20.25" fill="url(#feature-bitso-fill)" stroke="white" strokeWidth="1.5" />
          <path
            className={styles.bitsoHalfLeft}
            d="M33.7474 34.9164C33.7474 34.663 33.5574 34.5364 33.3673 34.5364C32.9873 34.5364 32.4806 34.5997 32.1006 34.5997C29.947 34.5997 28.1735 32.8263 28.1735 30.6729V21.9961V21.236C28.1735 21.1727 28.1102 21.1094 28.0468 21.1094H22.6629L22.5996 21.1727V30.6096C22.5996 35.8664 26.8434 40.1098 32.1006 40.1098C32.6073 40.1098 33.114 40.0465 33.6207 39.9832C33.684 39.9832 33.7474 39.9198 33.7474 39.8565V34.9164Z"
            fill="#FEFEFE"
          />
          <path
            className={styles.bitsoHalfRight}
            d="M32.0988 21.1094C31.5921 21.1094 31.0221 21.1727 30.5154 21.236C30.452 21.236 30.3887 21.2994 30.3887 21.3627V26.3028C30.3887 26.5562 30.5787 26.7462 30.7687 26.6828C30.9587 26.6828 32.0355 26.6195 32.0355 26.6195C34.189 26.6195 35.9626 28.3929 35.9626 30.5463V39.0965C35.9626 39.1598 36.0259 39.1598 36.0259 39.1598C39.3196 37.7031 41.5998 34.4097 41.5998 30.6096C41.5998 25.3528 37.356 21.1094 32.0988 21.1094Z"
            fill="#FEFEFE"
          />
        </g>
        <defs>
          <filter id="feature-bitso-shadow" x="-0.000391006" y="-0.000391006" width="63.2" height="63.2" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1" />
            <feGaussianBlur stdDeviation="5.3" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="feature-bitso-fill" x1="35.5996" y1="13.5996" x2="22.0996" y2="44.5996" gradientUnits="userSpaceOnUse">
            <stop stopColor="#252C36" />
            <stop offset="1" stopColor="#151A22" />
          </linearGradient>
        </defs>
      </svg>
    </SvgFrame>
  );
}

function LowestCostArt() {
  return (
    <SvgFrame type="rate">
      <svg className={styles.featureArtSvg} width="94" height="64" viewBox="0 0 94 64" fill="none">
        <g className={styles.rateCoinLeft} filter="url(#feature-rate-left-shadow)">
          <circle cx="31.5996" cy="30.5996" r="20.25" fill="url(#feature-rate-left-fill)" stroke="white" strokeWidth="1.5" />
          <path d="M36.5655 27.5904C36.5655 25.8005 34.3425 24.3496 31.6003 24.3496C28.858 24.3496 26.635 25.8005 26.635 27.5904C26.635 29.3802 27.9892 30.3681 31.6003 30.3681C35.2113 30.3681 37.0169 31.294 37.0169 33.6089C37.0169 35.9237 34.5918 36.8496 31.6003 36.8496C28.6087 36.8496 26.1836 35.3987 26.1836 33.6089" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M32.0156 22.6836V24.1086M32.0156 38.5169V37.0919" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className={styles.rateCoinRight} filter="url(#feature-rate-right-shadow)">
          <circle cx="61.5996" cy="30.5996" r="20.25" fill="url(#feature-rate-right-fill)" stroke="white" strokeWidth="1.5" />
          <g className={styles.rateArrow}>
            <path d="M68.2663 29.2754V33.4421H64.0996" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M68.2669 33.4421L64.1003 29.2754C63.3648 28.5399 62.9971 28.1722 62.5458 28.1315C62.4711 28.1248 62.3961 28.1248 62.3214 28.1315C61.8701 28.1722 61.5024 28.5399 60.7669 29.2754C60.0314 30.0109 59.6637 30.3786 59.2124 30.4192C59.1378 30.426 59.0627 30.426 58.9881 30.4192C58.5368 30.3786 58.1691 30.0109 57.4336 29.2754L54.9336 26.7754" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
        <defs>
          <filter id="feature-rate-left-shadow" x="-0.000391006" y="-0.000391006" width="63.2" height="63.2" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1" />
            <feGaussianBlur stdDeviation="5.3" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <filter id="feature-rate-right-shadow" x="29.9996" y="-0.000391006" width="63.2" height="63.2" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1" />
            <feGaussianBlur stdDeviation="5.3" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="feature-rate-left-fill" x1="35.5996" y1="13.5996" x2="22.0996" y2="44.5996" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF1469" />
            <stop offset="1" stopColor="#F14382" />
          </linearGradient>
          <linearGradient id="feature-rate-right-fill" x1="65.5996" y1="13.5996" x2="52.0996" y2="44.5996" gradientUnits="userSpaceOnUse">
            <stop stopColor="#05645E" />
            <stop offset="1" stopColor="#08605A" />
          </linearGradient>
        </defs>
      </svg>
    </SvgFrame>
  );
}

export function FeatureArt({ type }: { type: FeatureArtType }) {
  if (type === "card") return <CardArt />;
  if (type === "send") return <PaperPlaneArt />;
  if (type === "bitso") return <BitsoArt />;
  return <LowestCostArt />;
}
