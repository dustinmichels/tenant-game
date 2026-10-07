/**
 * Utility types, constants, and SVG asset definitions for the modular
 * parallax cityscape background effect.
 */

export interface CityscapeLayerConfig {
  id: string;
  name: string;
  /** SVG string or template for a single 1600px tile */
  svg: string;
  /** Natural tile width in SVG units */
  tileWidth: number;
  /** Natural tile height in SVG units */
  tileHeight: number;
  /** Base animation duration in seconds for one full tile scroll cycle */
  baseDuration: number;
  /** Blur filter radius in pixels (default baseline) */
  blurRadius: number;
  /** Baseline opacity in light mode */
  opacityLight: number;
  /** Baseline opacity in dark mode */
  opacityDark: number;
  /** Optional mouse parallax movement scale factor (higher = moves more with cursor) */
  mouseFactorX?: number;
  mouseFactorY?: number;
  /** Vertical placement percentage from bottom (0 = grounded at bottom) */
  bottomOffsetPercent?: number;
  /** Z-index relative to other layers */
  zIndex: number;
}

export interface ParallaxCityscapeProps {
  /** Overall speed multiplier for the drifting animation (1 = normal, 0.5 = slow, 2 = fast) */
  speed?: number;
  /** Pauses the horizontal scrolling animation */
  paused?: boolean;
  /** Direction the buildings drift towards ("left" | "right") */
  direction?: "left" | "right";
  /** Multiplier applied to layer blur amounts (1 = standard, 0 = crisp/no blur) */
  blurMultiplier?: number;
  /** Multiplier applied to layer opacity (1 = standard, 0.5 = extra faint) */
  opacityMultiplier?: number;
  /** Whether mouse movement causes subtle 3D parallax shifts */
  interactive?: boolean;
  /** Custom layer configurations if overriding default cityscape */
  layers?: CityscapeLayerConfig[];
  /** Shows a soft bottom mist/gradient overlay to ground the buildings */
  showGroundMist?: boolean;
  /** Anchors the container to the viewport with position: fixed instead of absolute */
  fixed?: boolean;
}

/**
 * Calculates damped mouse parallax offset values based on normalized cursor coordinates (-1 to 1).
 */
export function calculateMouseParallaxOffset(
  normalizedX: number,
  normalizedY: number,
  factorX: number,
  factorY: number,
  maxOffsetPx = 30,
): { x: number; y: number } {
  const clampedX = Math.max(-1, Math.min(1, normalizedX));
  const clampedY = Math.max(-1, Math.min(1, normalizedY));

  const rawX = -clampedX * factorX * maxOffsetPx;
  const rawY = -clampedY * factorY * (maxOffsetPx * 0.5);

  const roundVal = (v: number) => {
    const rounded = Math.round(v * 100) / 100;
    return rounded === 0 ? 0 : rounded;
  };

  return {
    x: roundVal(rawX),
    y: roundVal(rawY),
  };
}

/**
 * Layer 1: Distant skyline of skyscrapers, high-rise towers, spires, and communications antennas.
 * Tile width: 1600, height: 320.
 */
export const FAR_SKYLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 320" width="1600" height="320" preserveAspectRatio="none" fill="currentColor">
  <!-- Building 1: Slender spire tower -->
  <rect x="24" y="60" width="80" height="260" rx="1" />
  <rect x="58" y="24" width="12" height="36" />
  <line x1="64" y1="4" x2="64" y2="24" stroke="currentColor" stroke-width="2" />
  <circle cx="64" cy="5" r="2.5" class="beacon-light" fill="#f87171" />
  <!-- Windows on tower 1 -->
  <g class="city-window-grid" opacity="0.35">
    <rect x="36" y="80" width="6" height="8" /><rect x="50" y="80" width="6" height="8" /><rect x="64" y="80" width="6" height="8" /><rect x="78" y="80" width="6" height="8" />
    <rect x="36" y="102" width="6" height="8" /><rect x="50" y="102" width="6" height="8" /><rect x="64" y="102" width="6" height="8" /><rect x="78" y="102" width="6" height="8" />
    <rect x="36" y="124" width="6" height="8" /><rect x="50" y="124" width="6" height="8" /><rect x="64" y="124" width="6" height="8" /><rect x="78" y="124" width="6" height="8" />
    <rect x="36" y="146" width="6" height="8" /><rect x="50" y="146" width="6" height="8" /><rect x="64" y="146" width="6" height="8" /><rect x="78" y="146" width="6" height="8" />
    <rect x="36" y="168" width="6" height="8" /><rect x="50" y="168" width="6" height="8" /><rect x="64" y="168" width="6" height="8" /><rect x="78" y="168" width="6" height="8" />
  </g>

  <!-- Building 2: Stepped Art Deco skyscraper -->
  <rect x="120" y="110" width="116" height="210" />
  <rect x="136" y="70" width="84" height="40" />
  <rect x="156" y="42" width="44" height="28" />
  <rect x="172" y="24" width="12" height="18" />
  <line x1="178" y1="8" x2="178" y2="24" stroke="currentColor" stroke-width="2" />
  <circle cx="178" cy="8" r="2.5" class="beacon-light" fill="#f87171" />
  <g class="city-window-grid" opacity="0.4">
    <rect x="146" y="128" width="5" height="7" /><rect x="160" y="128" width="5" height="7" /><rect x="174" y="128" width="5" height="7" /><rect x="188" y="128" width="5" height="7" /><rect x="202" y="128" width="5" height="7" />
    <rect x="146" y="148" width="5" height="7" /><rect x="160" y="148" width="5" height="7" /><rect x="174" y="148" width="5" height="7" /><rect x="188" y="148" width="5" height="7" /><rect x="202" y="148" width="5" height="7" />
    <rect x="146" y="168" width="5" height="7" /><rect x="160" y="168" width="5" height="7" /><rect x="174" y="168" width="5" height="7" /><rect x="188" y="168" width="5" height="7" /><rect x="202" y="168" width="5" height="7" />
  </g>

  <!-- Building 3: Wide mid-rise commercial block -->
  <rect x="254" y="130" width="134" height="190" />
  <rect x="280" y="116" width="36" height="14" />
  <rect x="330" y="120" width="22" height="10" />

  <!-- Building 4: Slender residential tower with crown -->
  <rect x="406" y="80" width="76" height="240" />
  <polygon points="406,80 444,52 482,80" />
  <line x1="444" y1="36" x2="444" y2="52" stroke="currentColor" stroke-width="2" />
  <circle cx="444" cy="36" r="2" class="beacon-light" fill="#f87171" />

  <!-- Building 5: Construction crane silhouette over rising tower -->
  <rect x="500" y="140" width="100" height="180" />
  <!-- Crane mast and arm -->
  <line x1="535" y1="140" x2="535" y2="92" stroke="currentColor" stroke-width="2.5" />
  <line x1="505" y1="92" x2="575" y2="92" stroke="currentColor" stroke-width="2" />
  <line x1="535" y1="84" x2="535" y2="92" stroke="currentColor" stroke-width="2" />
  <line x1="535" y1="84" x2="510" y2="92" stroke="currentColor" stroke-width="1" />
  <line x1="535" y1="84" x2="570" y2="92" stroke="currentColor" stroke-width="1" />
  <line x1="565" y1="92" x2="565" y2="108" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" />

  <!-- Building 6: Flat-roof modernist highrise -->
  <rect x="620" y="96" width="124" height="224" />
  <rect x="650" y="82" width="50" height="14" />
  <g class="city-window-grid" opacity="0.3">
    <rect x="636" y="115" width="20" height="4" /><rect x="672" y="115" width="20" height="4" /><rect x="708" y="115" width="20" height="4" />
    <rect x="636" y="135" width="20" height="4" /><rect x="672" y="135" width="20" height="4" /><rect x="708" y="135" width="20" height="4" />
    <rect x="636" y="155" width="20" height="4" /><rect x="672" y="155" width="20" height="4" /><rect x="708" y="155" width="20" height="4" />
    <rect x="636" y="175" width="20" height="4" /><rect x="672" y="175" width="20" height="4" /><rect x="708" y="175" width="20" height="4" />
  </g>

  <!-- Building 7: Pyramid pinnacle skyscraper -->
  <rect x="764" y="100" width="104" height="220" />
  <polygon points="764,100 816,40 868,100" />
  <line x1="816" y1="18" x2="816" y2="40" stroke="currentColor" stroke-width="2.5" />
  <circle cx="816" cy="18" r="2.5" class="beacon-light" fill="#f87171" />

  <!-- Building 8: Twin-antenna tower -->
  <rect x="888" y="125" width="108" height="195" />
  <rect x="912" y="108" width="60" height="17" />
  <line x1="924" y1="88" x2="924" y2="108" stroke="currentColor" stroke-width="2" />
  <line x1="960" y1="88" x2="960" y2="108" stroke="currentColor" stroke-width="2" />
  <circle cx="924" cy="88" r="2" class="beacon-light" fill="#f87171" />
  <circle cx="960" cy="88" r="2" class="beacon-light" fill="#f87171" />

  <!-- Building 9: Stepped highrise with roof tank -->
  <rect x="1014" y="120" width="128" height="200" />
  <rect x="1038" y="92" width="80" height="28" />
  <!-- Rooftop water tank outline -->
  <rect x="1070" y="74" width="20" height="18" rx="2" />
  <line x1="1074" y1="92" x2="1074" y2="96" stroke="currentColor" stroke-width="1.5" />
  <line x1="1086" y1="92" x2="1086" y2="96" stroke="currentColor" stroke-width="1.5" />

  <!-- Building 10: Slender tower with dome / arched crown -->
  <rect x="1162" y="90" width="86" height="230" />
  <path d="M 1162 90 Q 1205 50 1248 90 Z" />
  <line x1="1205" y1="36" x2="1205" y2="58" stroke="currentColor" stroke-width="2" />
  <circle cx="1205" cy="36" r="2" class="beacon-light" fill="#f87171" />

  <!-- Building 11: Blocky multi-tier tower -->
  <rect x="1270" y="135" width="118" height="185" />
  <rect x="1292" y="112" width="74" height="23" />
  <rect x="1312" y="96" width="34" height="16" />

  <!-- Building 12: Diagonal-brace tower / spire -->
  <rect x="1408" y="105" width="114" height="215" />
  <polygon points="1408,105 1465,65 1522,105" />
  <line x1="1465" y1="42" x2="1465" y2="65" stroke="currentColor" stroke-width="2" />
  <circle cx="1465" cy="42" r="2" class="beacon-light" fill="#f87171" />

  <!-- Building 13 (end spacer towards seam at x=1600): Mid-rise -->
  <rect x="1542" y="145" width="48" height="175" />
</svg>`;

/**
 * Layer 2: Mid-ground urban neighborhood with tenements, brownstones, lofts, rooftop water towers,
 * fire escapes, cornices, and glowing windows.
 * Tile width: 1600, height: 360.
 */
export const MID_CITYSCAPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 360" width="1600" height="360" preserveAspectRatio="none" fill="currentColor">
  <!-- Building 1: 5-story brick tenement with water tower & fire escape (x: 20 to 160) -->
  <g class="city-bldg-mid">
    <rect x="24" y="85" width="138" height="275" />
    <!-- Cornice -->
    <rect x="18" y="77" width="150" height="8" rx="1" />
    <line x1="16" y1="76" x2="170" y2="76" stroke="currentColor" stroke-width="2" />
    <!-- Rooftop wooden water tower on stilts -->
    <g class="rooftop-water-tower">
      <!-- Stilt legs -->
      <line x1="42" y1="77" x2="48" y2="52" stroke="currentColor" stroke-width="2" />
      <line x1="68" y1="77" x2="62" y2="52" stroke="currentColor" stroke-width="2" />
      <line x1="44" y1="65" x2="66" y2="65" stroke="currentColor" stroke-width="1.5" />
      <!-- Barrel -->
      <rect x="42" y="28" width="26" height="24" rx="2" />
      <!-- Conical roof -->
      <polygon points="39,28 55,14 71,28" />
    </g>
    <!-- Fire escape zigzag -->
    <g class="fire-escape-lines" stroke="currentColor" stroke-width="1.5" fill="none">
      <rect x="122" y="120" width="28" height="5" fill="currentColor" />
      <rect x="122" y="165" width="28" height="5" fill="currentColor" />
      <rect x="122" y="210" width="28" height="5" fill="currentColor" />
      <rect x="122" y="255" width="28" height="5" fill="currentColor" />
      <!-- Ladders -->
      <line x1="146" y1="125" x2="126" y2="165" />
      <line x1="126" y1="170" x2="146" y2="210" />
      <line x1="146" y1="215" x2="126" y2="255" />
    </g>
    <!-- Windows (with warm glowing accents) -->
    <g class="tenement-windows">
      <rect x="38" y="105" width="14" height="20" rx="1" fill="#fef08a" opacity="0.6" />
      <rect x="64" y="105" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
      <rect x="90" y="105" width="14" height="20" rx="1" fill="#fed7aa" opacity="0.5" />
      <rect x="38" y="145" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
      <rect x="64" y="145" width="14" height="20" rx="1" fill="#fef08a" opacity="0.65" />
      <rect x="90" y="145" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
      <rect x="38" y="185" width="14" height="20" rx="1" fill="#fed7aa" opacity="0.55" />
      <rect x="64" y="185" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
      <rect x="90" y="185" width="14" height="20" rx="1" fill="#fef08a" opacity="0.5" />
      <rect x="38" y="225" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
      <rect x="64" y="225" width="14" height="20" rx="1" fill="#fed7aa" opacity="0.6" />
      <rect x="90" y="225" width="14" height="20" rx="1" fill="rgba(0,0,0,0.25)" />
    </g>
  </g>

  <!-- Building 2: Classic 4-story Brownstone walkup (x: 182 to 292) -->
  <g class="city-bldg-mid">
    <rect x="182" y="125" width="112" height="235" />
    <!-- Ornate roof balustrade & cornice -->
    <rect x="178" y="118" width="120" height="7" />
    <path d="M 178 118 L 184 108 L 292 108 L 298 118 Z" />
    <!-- Chimney -->
    <rect x="270" y="90" width="16" height="20" />
    <!-- Arched top windows -->
    <path d="M 198 152 Q 205 142 212 152 L 212 168 L 198 168 Z" fill="#fef08a" opacity="0.5" />
    <path d="M 234 152 Q 241 142 248 152 L 248 168 L 234 168 Z" fill="rgba(0,0,0,0.2)" />
    <path d="M 270 152 Q 277 142 284 152 L 284 168 L 270 168 Z" fill="#fed7aa" opacity="0.55" />
    <!-- Standard windows -->
    <rect x="198" y="190" width="14" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="234" y="190" width="14" height="22" fill="#fef08a" opacity="0.6" />
    <rect x="270" y="190" width="14" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="198" y="234" width="14" height="22" fill="#fed7aa" opacity="0.45" />
    <rect x="234" y="234" width="14" height="22" fill="rgba(0,0,0,0.25)" />
    <!-- Stoop stairs at bottom right -->
    <polygon points="266,280 292,280 292,360 254,360" />
    <rect x="268" y="280" width="18" height="32" rx="1" fill="#fef08a" opacity="0.4" />
  </g>

  <!-- Building 3: Corner apartment building with roof garden & chimneys (x: 316 to 468) -->
  <g class="city-bldg-mid">
    <rect x="316" y="95" width="154" height="265" />
    <!-- Roof pediment -->
    <polygon points="316,95 393,72 470,95" />
    <rect x="330" y="60" width="12" height="22" />
    <rect x="444" y="60" width="12" height="22" />
    <!-- Windows grid -->
    <g class="corner-bldg-windows">
      <rect x="334" y="118" width="18" height="22" fill="#fed7aa" opacity="0.5" />
      <rect x="368" y="118" width="18" height="22" fill="rgba(0,0,0,0.25)" />
      <rect x="402" y="118" width="18" height="22" fill="#fef08a" opacity="0.6" />
      <rect x="436" y="118" width="18" height="22" fill="rgba(0,0,0,0.25)" />
      <rect x="334" y="158" width="18" height="22" fill="rgba(0,0,0,0.25)" />
      <rect x="368" y="158" width="18" height="22" fill="#fef08a" opacity="0.55" />
      <rect x="402" y="158" width="18" height="22" fill="rgba(0,0,0,0.25)" />
      <rect x="436" y="158" width="18" height="22" fill="#fed7aa" opacity="0.5" />
      <rect x="334" y="198" width="18" height="22" fill="#fef08a" opacity="0.5" />
      <rect x="368" y="198" width="18" height="22" fill="rgba(0,0,0,0.25)" />
      <rect x="402" y="198" width="18" height="22" fill="#fed7aa" opacity="0.6" />
      <rect x="436" y="198" width="18" height="22" fill="rgba(0,0,0,0.25)" />
    </g>
  </g>

  <!-- Building 4: Industrial loft / warehouse conversion (x: 490 to 650) -->
  <g class="city-bldg-mid">
    <rect x="490" y="130" width="162" height="230" />
    <rect x="485" y="122" width="172" height="8" />
    <!-- Elevator bulkhead / roof house -->
    <rect x="520" y="100" width="46" height="22" />
    <line x1="566" y1="88" x2="566" y2="100" stroke="currentColor" stroke-width="2" />
    <!-- Large factory grid windows -->
    <g class="loft-windows" fill="rgba(0,0,0,0.25)">
      <rect x="506" y="146" width="34" height="24" rx="1" fill="#fef08a" opacity="0.4" />
      <rect x="554" y="146" width="34" height="24" rx="1" />
      <rect x="602" y="146" width="34" height="24" rx="1" fill="#fed7aa" opacity="0.4" />
      <rect x="506" y="188" width="34" height="24" rx="1" />
      <rect x="554" y="188" width="34" height="24" rx="1" fill="#fef08a" opacity="0.5" />
      <rect x="602" y="188" width="34" height="24" rx="1" />
      <rect x="506" y="230" width="34" height="24" rx="1" fill="#fed7aa" opacity="0.45" />
      <rect x="554" y="230" width="34" height="24" rx="1" fill="#fef08a" opacity="0.4" />
      <rect x="602" y="230" width="34" height="24" rx="1" />
    </g>
  </g>

  <!-- Building 5: Narrow 4-story walk-up with TV antenna (x: 672 to 774) -->
  <g class="city-bldg-mid">
    <rect x="672" y="140" width="104" height="220" />
    <rect x="668" y="134" width="112" height="6" />
    <!-- TV antenna -->
    <line x1="720" y1="108" x2="720" y2="134" stroke="currentColor" stroke-width="1.5" />
    <line x1="710" y1="116" x2="730" y2="116" stroke="currentColor" stroke-width="1.5" />
    <line x1="714" y1="122" x2="726" y2="122" stroke="currentColor" stroke-width="1.5" />
    <rect x="690" y="156" width="16" height="20" fill="#fef08a" opacity="0.55" />
    <rect x="736" y="156" width="16" height="20" fill="rgba(0,0,0,0.25)" />
    <rect x="690" y="194" width="16" height="20" fill="rgba(0,0,0,0.25)" />
    <rect x="736" y="194" width="16" height="20" fill="#fed7aa" opacity="0.5" />
    <rect x="690" y="232" width="16" height="20" fill="#fef08a" opacity="0.6" />
    <rect x="736" y="232" width="16" height="20" fill="rgba(0,0,0,0.25)" />
  </g>

  <!-- Building 6: 6-story residential apartment block (x: 796 to 966) -->
  <g class="city-bldg-mid">
    <rect x="796" y="80" width="170" height="280" />
    <!-- Cornice brackets -->
    <rect x="790" y="72" width="182" height="8" />
    <rect x="800" y="66" width="162" height="6" />
    <!-- Water tank -->
    <rect x="840" y="44" width="22" height="22" rx="2" />
    <polygon points="837,44 851,32 865,44" />
    <line x1="844" y1="66" x2="844" y2="72" stroke="currentColor" stroke-width="1.5" />
    <line x1="858" y1="66" x2="858" y2="72" stroke="currentColor" stroke-width="1.5" />
    <!-- Windows -->
    <g class="high-tenement-windows">
      <rect x="814" y="98" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="850" y="98" width="16" height="18" fill="#fef08a" opacity="0.65" /><rect x="886" y="98" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="922" y="98" width="16" height="18" fill="#fed7aa" opacity="0.5" />
      <rect x="814" y="132" width="16" height="18" fill="#fef08a" opacity="0.5" /><rect x="850" y="132" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="886" y="132" width="16" height="18" fill="#fed7aa" opacity="0.55" /><rect x="922" y="132" width="16" height="18" fill="rgba(0,0,0,0.25)" />
      <rect x="814" y="166" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="850" y="166" width="16" height="18" fill="#fef08a" opacity="0.6" /><rect x="886" y="166" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="922" y="166" width="16" height="18" fill="#fef08a" opacity="0.5" />
      <rect x="814" y="200" width="16" height="18" fill="#fed7aa" opacity="0.5" /><rect x="850" y="200" width="16" height="18" fill="rgba(0,0,0,0.25)" /><rect x="886" y="200" width="16" height="18" fill="#fef08a" opacity="0.6" /><rect x="922" y="200" width="16" height="18" fill="rgba(0,0,0,0.25)" />
    </g>
  </g>

  <!-- Building 7: Mansard-roof Victorian commercial/residential (x: 988 to 1120) -->
  <g class="city-bldg-mid">
    <rect x="988" y="130" width="132" height="230" />
    <path d="M 988 130 L 1004 98 L 1104 98 L 1120 130 Z" />
    <!-- Dormer windows in roof -->
    <rect x="1022" y="104" width="14" height="16" fill="#fef08a" opacity="0.6" />
    <rect x="1072" y="104" width="14" height="16" fill="#fed7aa" opacity="0.55" />
    <rect x="1006" y="152" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1046" y="152" width="16" height="22" fill="#fef08a" opacity="0.55" />
    <rect x="1086" y="152" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1006" y="196" width="16" height="22" fill="#fed7aa" opacity="0.5" />
    <rect x="1046" y="196" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1086" y="196" width="16" height="22" fill="#fef08a" opacity="0.6" />
  </g>

  <!-- Building 8: Tenement with prominent water tower & fire escape (x: 1142 to 1284) -->
  <g class="city-bldg-mid">
    <rect x="1142" y="90" width="144" height="270" />
    <rect x="1136" y="82" width="156" height="8" />
    <!-- Rooftop water tower -->
    <rect x="1232" y="38" width="28" height="26" rx="2" />
    <polygon points="1228,38 1246,22 1264,38" />
    <line x1="1236" y1="64" x2="1234" y2="82" stroke="currentColor" stroke-width="2" />
    <line x1="1256" y1="64" x2="1258" y2="82" stroke="currentColor" stroke-width="2" />
    <line x1="1235" y1="73" x2="1257" y2="73" stroke="currentColor" stroke-width="1.5" />
    <!-- Fire escape balconies -->
    <g stroke="currentColor" stroke-width="1.5" fill="none">
      <rect x="1152" y="125" width="26" height="5" fill="currentColor" />
      <rect x="1152" y="165" width="26" height="5" fill="currentColor" />
      <rect x="1152" y="205" width="26" height="5" fill="currentColor" />
      <line x1="1154" y1="130" x2="1174" y2="165" />
      <line x1="1174" y1="170" x2="1154" y2="205" />
    </g>
    <!-- Windows -->
    <rect x="1192" y="112" width="16" height="20" fill="#fef08a" opacity="0.6" />
    <rect x="1236" y="112" width="16" height="20" fill="rgba(0,0,0,0.25)" />
    <rect x="1192" y="152" width="16" height="20" fill="rgba(0,0,0,0.25)" />
    <rect x="1236" y="152" width="16" height="20" fill="#fed7aa" opacity="0.5" />
    <rect x="1192" y="192" width="16" height="20" fill="#fef08a" opacity="0.5" />
    <rect x="1236" y="192" width="16" height="20" fill="rgba(0,0,0,0.25)" />
  </g>

  <!-- Building 9: Brick apartment with clothesline poles & chimney (x: 1306 to 1438) -->
  <g class="city-bldg-mid">
    <rect x="1306" y="115" width="132" height="245" />
    <rect x="1300" y="108" width="144" height="7" />
    <rect x="1320" y="90" width="14" height="18" />
    <line x1="1400" y1="92" x2="1400" y2="108" stroke="currentColor" stroke-width="2" />
    <line x1="1418" y1="92" x2="1418" y2="108" stroke="currentColor" stroke-width="2" />
    <line x1="1400" y1="96" x2="1418" y2="96" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" />
    <rect x="1324" y="132" width="16" height="22" fill="#fed7aa" opacity="0.55" />
    <rect x="1364" y="132" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1404" y="132" width="16" height="22" fill="#fef08a" opacity="0.6" />
    <rect x="1324" y="174" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1364" y="174" width="16" height="22" fill="#fef08a" opacity="0.5" />
    <rect x="1404" y="174" width="16" height="22" fill="rgba(0,0,0,0.25)" />
  </g>

  <!-- Building 10: Infill townhouse connecting back towards seam (x: 1460 to 1578) -->
  <g class="city-bldg-mid">
    <rect x="1460" y="128" width="120" height="232" />
    <rect x="1456" y="120" width="128" height="8" />
    <rect x="1480" y="146" width="16" height="22" fill="#fef08a" opacity="0.5" />
    <rect x="1524" y="146" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1480" y="190" width="16" height="22" fill="rgba(0,0,0,0.25)" />
    <rect x="1524" y="190" width="16" height="22" fill="#fed7aa" opacity="0.55" />
  </g>
</svg>`;

/**
 * Layer 3: Foreground street-level buildings with storefront awnings, streetlamps, ornate cornices,
 * entrance porticoes, detailed fire escapes, and rich window frames.
 * Tile width: 1600, height: 400.
 */
export const NEAR_STREETSCAPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 400" width="1600" height="400" preserveAspectRatio="none" fill="currentColor">
  <!-- Building 1: Closer 4-story apartment with fire escape & entryway (x: 30 to 206) -->
  <g class="city-bldg-near">
    <rect x="30" y="70" width="176" height="330" />
    <!-- Parapet & Cornice -->
    <rect x="22" y="58" width="192" height="12" rx="2" />
    <line x1="20" y1="56" x2="216" y2="56" stroke="currentColor" stroke-width="2.5" />
    <!-- Chimney -->
    <rect x="44" y="36" width="22" height="22" />
    <!-- Detailed fire escape -->
    <g class="near-fire-escape" stroke="currentColor" stroke-width="2" fill="none">
      <rect x="140" y="112" width="38" height="7" fill="currentColor" />
      <rect x="140" y="172" width="38" height="7" fill="currentColor" />
      <rect x="140" y="232" width="38" height="7" fill="currentColor" />
      <line x1="170" y1="119" x2="146" y2="172" />
      <line x1="146" y1="179" x2="170" y2="232" />
      <line x1="170" y1="239" x2="170" y2="275" stroke-dasharray="3,3" />
    </g>
    <!-- Windows with sills and lintels -->
    <g class="near-windows">
      <rect x="52" y="95" width="20" height="28" rx="1" fill="#fef08a" opacity="0.75" />
      <line x1="48" y1="124" x2="76" y2="124" stroke="currentColor" stroke-width="2" />
      <rect x="94" y="95" width="20" height="28" rx="1" fill="rgba(0,0,0,0.3)" />
      <line x1="90" y1="124" x2="118" y2="124" stroke="currentColor" stroke-width="2" />
      <rect x="52" y="155" width="20" height="28" rx="1" fill="rgba(0,0,0,0.3)" />
      <line x1="48" y1="184" x2="76" y2="184" stroke="currentColor" stroke-width="2" />
      <rect x="94" y="155" width="20" height="28" rx="1" fill="#fed7aa" opacity="0.7" />
      <line x1="90" y1="184" x2="118" y2="184" stroke="currentColor" stroke-width="2" />
      <rect x="52" y="215" width="20" height="28" rx="1" fill="#fef08a" opacity="0.65" />
      <line x1="48" y1="244" x2="76" y2="244" stroke="currentColor" stroke-width="2" />
      <rect x="94" y="215" width="20" height="28" rx="1" fill="rgba(0,0,0,0.3)" />
      <line x1="90" y1="244" x2="118" y2="244" stroke="currentColor" stroke-width="2" />
    </g>
    <!-- Ground floor entrance -->
    <rect x="70" y="300" width="34" height="65" fill="#fef08a" opacity="0.5" />
    <path d="M 64 300 Q 87 288 110 300 Z" />
  </g>

  <!-- Streetlamp between Building 1 and 2 -->
  <g class="streetlamp" stroke="currentColor" stroke-width="2" fill="none">
    <line x1="228" y1="260" x2="228" y2="390" stroke-width="2.5" />
    <path d="M 228 260 C 228 245, 244 245, 244 252" />
    <circle cx="244" cy="254" r="4.5" fill="#fde047" stroke="#ca8a04" stroke-width="1" />
  </g>

  <!-- Building 2: Brownstone with stoop stairs & ornate lintels (x: 254 to 414) -->
  <g class="city-bldg-near">
    <rect x="254" y="105" width="160" height="295" />
    <!-- Cornice -->
    <rect x="246" y="92" width="176" height="13" rx="2" />
    <!-- Roof balustrade -->
    <path d="M 252 92 L 260 76 L 408 76 L 416 92 Z" />
    <!-- Windows -->
    <rect x="274" y="130" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="320" y="130" width="22" height="30" fill="#fef08a" opacity="0.7" />
    <rect x="366" y="130" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="274" y="190" width="22" height="30" fill="#fed7aa" opacity="0.65" />
    <rect x="320" y="190" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="366" y="190" width="22" height="30" fill="#fef08a" opacity="0.75" />
    <!-- Stoop stairs leading up to second level -->
    <polygon points="352,270 414,270 414,400 326,400" />
    <rect x="364" y="270" width="26" height="42" fill="#fef08a" opacity="0.6" />
  </g>

  <!-- Building 3: Storefront awning building ("Neighborhood Market / Bakery") (x: 442 to 642) -->
  <g class="city-bldg-near">
    <rect x="442" y="65" width="200" height="335" />
    <!-- Parapet -->
    <rect x="434" y="52" width="216" height="13" />
    <!-- Rooftop air vents -->
    <path d="M 480 52 C 480 34, 496 34, 496 44 L 490 52" stroke="currentColor" stroke-width="2" fill="none" />
    <rect x="580" y="32" width="16" height="20" />
    <!-- Upper windows -->
    <g class="storefront-upper-windows">
      <rect x="470" y="88" width="24" height="32" fill="#fed7aa" opacity="0.7" />
      <rect x="520" y="88" width="24" height="32" fill="rgba(0,0,0,0.3)" />
      <rect x="570" y="88" width="24" height="32" fill="#fef08a" opacity="0.75" />
      <rect x="470" y="148" width="24" height="32" fill="rgba(0,0,0,0.3)" />
      <rect x="520" y="148" width="24" height="32" fill="#fed7aa" opacity="0.65" />
      <rect x="570" y="148" width="24" height="32" fill="rgba(0,0,0,0.3)" />
      <rect x="470" y="208" width="24" height="32" fill="#fef08a" opacity="0.7" />
      <rect x="520" y="208" width="24" height="32" fill="rgba(0,0,0,0.3)" />
      <rect x="570" y="208" width="24" height="32" fill="#fef08a" opacity="0.6" />
    </g>
    <!-- Ground floor striped awning -->
    <polygon points="432,290 652,290 642,316 442,316" fill="#ca8a04" opacity="0.8" />
    <rect x="460" y="318" width="60" height="48" fill="#fef08a" opacity="0.65" />
    <rect x="546" y="318" width="60" height="48" fill="#fef08a" opacity="0.65" />
  </g>

  <!-- Streetlamp between Building 3 and 4 -->
  <g class="streetlamp" stroke="currentColor" stroke-width="2" fill="none">
    <line x1="664" y1="270" x2="664" y2="390" stroke-width="2.5" />
    <path d="M 664 270 C 664 255, 680 255, 680 262" />
    <circle cx="680" cy="264" r="4.5" fill="#fde047" stroke="#ca8a04" stroke-width="1" />
  </g>

  <!-- Building 4: Neighborhood brownstones with iron railings (x: 698 to 868) -->
  <g class="city-bldg-near">
    <rect x="698" y="115" width="170" height="285" />
    <rect x="692" y="104" width="182" height="11" />
    <!-- Cornice brackets -->
    <line x1="710" y1="115" x2="710" y2="124" stroke="currentColor" stroke-width="3" />
    <line x1="770" y1="115" x2="770" y2="124" stroke="currentColor" stroke-width="3" />
    <line x1="830" y1="115" x2="830" y2="124" stroke="currentColor" stroke-width="3" />
    <!-- Windows -->
    <rect x="720" y="142" width="22" height="28" fill="#fef08a" opacity="0.75" />
    <rect x="768" y="142" width="22" height="28" fill="rgba(0,0,0,0.3)" />
    <rect x="816" y="142" width="22" height="28" fill="#fed7aa" opacity="0.6" />
    <rect x="720" y="198" width="22" height="28" fill="rgba(0,0,0,0.3)" />
    <rect x="768" y="198" width="22" height="28" fill="#fef08a" opacity="0.7" />
    <rect x="816" y="198" width="22" height="28" fill="rgba(0,0,0,0.3)" />
    <!-- Stoop -->
    <polygon points="786,278 858,278 858,400 760,400" />
    <rect x="806" y="278" width="28" height="42" fill="#fef08a" opacity="0.6" />
  </g>

  <!-- Building 5: Corner apartment building with bay windows (x: 894 to 1084) -->
  <g class="city-bldg-near">
    <rect x="894" y="80" width="190" height="320" />
    <!-- Roof balustrade & center crest -->
    <rect x="886" y="68" width="206" height="12" />
    <polygon points="960,68 989,48 1018,68" />
    <!-- Windows -->
    <rect x="918" y="105" width="24" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="964" y="105" width="24" height="30" fill="#fef08a" opacity="0.75" />
    <rect x="1010" y="105" width="24" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="918" y="160" width="24" height="30" fill="#fed7aa" opacity="0.7" />
    <rect x="964" y="160" width="24" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="1010" y="160" width="24" height="30" fill="#fef08a" opacity="0.7" />
    <rect x="918" y="215" width="24" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="964" y="215" width="24" height="30" fill="#fed7aa" opacity="0.65" />
    <rect x="1010" y="215" width="24" height="30" fill="#fef08a" opacity="0.8" />
    <!-- Ground storefront / entrance -->
    <rect x="946" y="295" width="60" height="55" fill="#fef08a" opacity="0.6" />
  </g>

  <!-- Building 6: 4-story brick apartment with fire escape (x: 1110 to 1290) -->
  <g class="city-bldg-near">
    <rect x="1110" y="90" width="180" height="310" />
    <rect x="1102" y="78" width="196" height="12" />
    <!-- Water tank tripod base outline -->
    <rect x="1200" y="44" width="26" height="26" rx="2" />
    <polygon points="1196,44 1213,30 1230,44" />
    <line x1="1204" y1="70" x2="1204" y2="78" stroke="currentColor" stroke-width="2" />
    <line x1="1222" y1="70" x2="1222" y2="78" stroke="currentColor" stroke-width="2" />
    <!-- Fire escape -->
    <g stroke="currentColor" stroke-width="2" fill="none">
      <rect x="1126" y="125" width="34" height="7" fill="currentColor" />
      <rect x="1126" y="185" width="34" height="7" fill="currentColor" />
      <rect x="1126" y="245" width="34" height="7" fill="currentColor" />
      <line x1="1130" y1="132" x2="1156" y2="185" />
      <line x1="1156" y1="192" x2="1130" y2="245" />
    </g>
    <!-- Windows -->
    <rect x="1180" y="112" width="22" height="28" fill="#fef08a" opacity="0.75" />
    <rect x="1226" y="112" width="22" height="28" fill="rgba(0,0,0,0.3)" />
    <rect x="1180" y="172" width="22" height="28" fill="rgba(0,0,0,0.3)" />
    <rect x="1226" y="172" width="22" height="28" fill="#fed7aa" opacity="0.65" />
    <rect x="1180" y="232" width="22" height="28" fill="#fef08a" opacity="0.7" />
    <rect x="1226" y="232" width="22" height="28" fill="rgba(0,0,0,0.3)" />
  </g>

  <!-- Building 7: Wide classic building connecting towards seamless repeat (x: 1316 to 1570) -->
  <g class="city-bldg-near">
    <rect x="1316" y="98" width="254" height="302" />
    <rect x="1308" y="86" width="270" height="12" />
    <rect x="1334" y="66" width="16" height="20" />
    <rect x="1510" y="66" width="16" height="20" />
    <!-- Windows -->
    <rect x="1346" y="120" width="22" height="30" fill="#fef08a" opacity="0.75" />
    <rect x="1396" y="120" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="1446" y="120" width="22" height="30" fill="#fed7aa" opacity="0.65" />
    <rect x="1496" y="120" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="1346" y="180" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="1396" y="180" width="22" height="30" fill="#fef08a" opacity="0.7" />
    <rect x="1446" y="180" width="22" height="30" fill="rgba(0,0,0,0.3)" />
    <rect x="1496" y="180" width="22" height="30" fill="#fef08a" opacity="0.8" />
  </g>
</svg>`;

/**
 * Standard default configuration for 3 distinct parallax depth layers.
 */
export const DEFAULT_CITYSCAPE_LAYERS: readonly CityscapeLayerConfig[] = [
  {
    id: "distant-skyline",
    name: "Distant Skyline",
    svg: FAR_SKYLINE_SVG,
    tileWidth: 1600,
    tileHeight: 320,
    baseDuration: 95,
    blurRadius: 4.5,
    opacityLight: 0.32,
    opacityDark: 0.28,
    mouseFactorX: 0.2,
    mouseFactorY: 0.15,
    bottomOffsetPercent: 2,
    zIndex: 1,
  },
  {
    id: "mid-neighborhood",
    name: "Midground Neighborhood",
    svg: MID_CITYSCAPE_SVG,
    tileWidth: 1600,
    tileHeight: 360,
    baseDuration: 55,
    blurRadius: 2.2,
    opacityLight: 0.48,
    opacityDark: 0.42,
    mouseFactorX: 0.5,
    mouseFactorY: 0.35,
    bottomOffsetPercent: 0,
    zIndex: 2,
  },
  {
    id: "near-streetscape",
    name: "Foreground Streetscape",
    svg: NEAR_STREETSCAPE_SVG,
    tileWidth: 1600,
    tileHeight: 400,
    baseDuration: 32,
    blurRadius: 1.0,
    opacityLight: 0.62,
    opacityDark: 0.55,
    mouseFactorX: 0.9,
    mouseFactorY: 0.6,
    bottomOffsetPercent: 0,
    zIndex: 3,
  },
] as const;
