import * as React from "react"

const MOBILE_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Returns true only for non-touch devices with screens >= 1024px.
 * Touch devices (iPad, tablets) always get offcanvas sidebar regardless of screen width.
 * Desktop with mouse gets the permanent push-sidebar.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true
    const isWide = window.innerWidth >= DESKTOP_BREAKPOINT
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    return isWide && !isTouch
  })

  React.useEffect(() => {
    const widthMql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const touchMql = window.matchMedia("(pointer: coarse)")

    const update = () => {
      setIsDesktop(widthMql.matches && !touchMql.matches)
    }

    widthMql.addEventListener("change", update)
    touchMql.addEventListener("change", update)
    update()

    return () => {
      widthMql.removeEventListener("change", update)
      touchMql.removeEventListener("change", update)
    }
  }, [])

  return isDesktop
}
