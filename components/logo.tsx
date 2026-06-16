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
      aria-label="Co-Build"
      data-logo-variant={variant}
    >
      <svg
        className={cx("co-build-logo__mark shrink-0", markSize[variant], iconClassName)}
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          className="co-build-logo__frame"
          x="6"
          y="6"
          width="36"
          height="36"
          rx="3"
          fill="white"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={cx("co-build-logo__accent", accentClassName)}
          d="M10 10h28v7H10z"
          fill="currentColor"
        />
        <path d="M14 21h20M14 28h20M20 14v24M28 14v24" stroke="currentColor" strokeWidth="1.8" opacity="0.36" />
        <path
          className="co-build-logo__beam"
          d="M13 36 35 14"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth="4"
        />
        <path d="M13 36 35 14" fill="none" stroke="white" strokeLinecap="square" strokeWidth="1.2" />
        <path
          className={cx("co-build-logo__accent", accentClassName)}
          d="M31 34c3.2-3.1 5.2-5.6 5.2-8.1a5.2 5.2 0 0 0-10.4 0c0 2.5 2 5 5.2 8.1Z"
          fill="currentColor"
        />
        <circle cx="31" cy="25.9" r="1.8" fill="white" />
      </svg>

      {showWordmark ? (
        <span
          className={cx(
            "co-build-logo__wordmark relative inline-flex flex-col text-xl font-black leading-none",
            wordmarkClassName
          )}
        >
          <span>
            Co-<span className={cx("co-build-logo__accent", accentClassName)}>Build</span>
          </span>
          <span className={cx("co-build-logo__underline", accentClassName)} aria-hidden="true" />
        </span>
      ) : (
        <span className="sr-only">Co-Build</span>
      )}
    </span>
  );
}
