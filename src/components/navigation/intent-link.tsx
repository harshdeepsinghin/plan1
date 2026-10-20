"use client"

import Link from "next/link"
import { useState } from "react"
import type { ComponentProps } from "react"

type IntentLinkProps = ComponentProps<typeof Link>

/**
 * Prefetches the full route only after the user shows intent (hover, focus,
 * or touch) instead of prefetching every planner page on load. This keeps the
 * initial event view light while making the tab the user actually wants feel
 * instant.
 */
export function IntentLink({
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: IntentLinkProps) {
  const [active, setActive] = useState(false)

  return (
    <Link
      {...props}
      prefetch={active ? true : false}
      onMouseEnter={(event) => {
        setActive(true)
        onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        setActive(true)
        onFocus?.(event)
      }}
      onTouchStart={(event) => {
        setActive(true)
        onTouchStart?.(event)
      }}
    >
      {children}
    </Link>
  )
}
