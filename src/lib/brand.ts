// Single source of truth for the Lettuce Swap brand mark.
//
// The master artwork is the user-designed lettuce-leaf logo, supplied as
// `swap_logo_no_background_2.svg`. Note: this file is an Illustrator export
// that wraps a 1024x1024 bitmap (base64 PNG) in an SVG shell — it renders
// everywhere an SVG does, but does not scale beyond 1024px like true vector
// paths. If a real path-based vector is exported later, drop it in and update
// only this import; the whole app (header, splash, masks, preload) follows.
import brandLogoUrl from "@/assets/lettuce-swap-logo.svg?url";

export const BRAND_LOGO_URL = brandLogoUrl;
