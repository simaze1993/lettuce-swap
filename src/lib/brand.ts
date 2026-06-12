// Single source of truth for the Lettuce Swap brand mark.
//
// The master artwork is the transparent-background lettuce-leaf logo the user
// designed. It is referenced from exactly one place so the whole app (header,
// splash backdrop, favicons preload) can be swapped to a different file — e.g.
// the vector `swap_logo_white.svg` once it is re-uploaded — by changing only
// this import.
import brandLogoUrl from "@/assets/lettuce-swap-logo.png?url";

export const BRAND_LOGO_URL = brandLogoUrl;
