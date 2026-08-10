type LogoProps = {
  variant?: "full" | "compact" | "icon";
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  accentClassName?: string;
};

const markSize = {
  full: "h-11 w-11",
  compact: "h-9 w-9",
  icon: "h-9 w-9"
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({
  variant = "full",
  className,
  iconClassName,
  wordmarkClassName,
  accentClassName = "text-hazard"
}: LogoProps) {
  const showWordmark = variant !== "icon";

  return (
    <span
      className={cx(
        "co-build-logo inline-flex items-center text-ink",
        variant === "full" ? "gap-3" : "gap-2",
        className
      )}
      aria-label="SpaceOnCall"
      data-logo-variant={variant}
    >
      <svg
        className={cx("co-build-logo__mark shrink-0", markSize[variant], iconClassName)}
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="co-build-logo__frame"
          d="M16 5h6M26 5h6l11 11v6M43 27v5L32 43h-6M22 43h-6L5 32v-5M5 22v-6L16 5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeWidth="5"
        />
        <path
          className={cx("co-build-logo__symbol co-build-logo__accent", accentClassName)}
          d="M31 17h-8a4.5 4.5 0 0 0 0 9h3a4.5 4.5 0 0 1 0 9h-9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth="5.5"
        />
        <path
          className={cx("co-build-logo__symbol co-build-logo__accent", accentClassName)}
          d="M24 10v32"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth="3"
        />
      </svg>

      {showWordmark ? (
        <span
          className={cx(
            "co-build-logo__wordmark relative inline-flex text-xl font-black leading-none",
            wordmarkClassName
          )}
        >
          <span>
            Space<span className={cx("co-build-logo__accent", accentClassName)}>OnCall</span>
          </span>
        </span>
      ) : (
        <span className="sr-only">SpaceOnCall</span>
      )}
    </span>
  );
}
