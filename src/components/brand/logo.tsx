import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  href?: string | null
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  showWordmark?: boolean
}

export function BrandLogo({
  href = "/",
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
}: BrandLogoProps) {
  const content = (
    <>
      <span
        className={cn(
          "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm ring-1 ring-inset ring-white/20 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105",
          markClassName
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-[58%] w-[58%]"
        >
          <rect
            x="3.75"
            y="5.25"
            width="16.5"
            height="14.5"
            rx="3.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M3.75 10h16.5M8 3.25v3.5M16 3.25v3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M8.25 14.5l2.15 2.15 5.1-5.1"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "text-[1.3rem] font-semibold leading-none tracking-[-0.045em]",
            wordmarkClassName
          )}
        >
          plan<span className="text-primary">1</span>
        </span>
      ) : null}
    </>
  )

  if (!href) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="plan1">
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label="plan1 home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      {content}
    </Link>
  )
}
