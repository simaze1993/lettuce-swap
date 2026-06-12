// Single source of truth for the Lettuce Swap brand mark.
//
// The master artwork is a true path-based vector (14 KB) traced from the
// user-designed `swap_logo_no_background_2.svg` bitmap, with the green
// gradient rebuilt as an SVG linearGradient — it scales to any size. To swap
// the artwork again, replace the asset and update only this import; the whole
// app (header, splash, masks, preload) follows.
import brandLogoUrl from "@/assets/lettuce-swap-logo.svg?url";

export const BRAND_LOGO_URL = brandLogoUrl;
