import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageOpen,
  SearchX,
} from "lucide-react";

type StateVariant = "loading" | "empty" | "error" | "info" | "success";
type StateSize = "sm" | "md" | "lg";

type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type StateIcon = ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}>;

const variantClassName: Record<
  StateVariant,
  {
    iconWrap: string;
    icon: string;
    title: string;
    border: string;
    button: string;
  }
> = {
  empty: {
    iconWrap: "bg-gray-50 text-gray-400",
    icon: "text-gray-400",
    title: "text-gray-950",
    border: "border-gray-100",
    button: "bg-gray-900 text-white hover:bg-emerald-600",
  },
  error: {
    iconWrap: "bg-red-50 text-red-500",
    icon: "text-red-500",
    title: "text-red-700",
    border: "border-red-100",
    button: "bg-red-600 text-white hover:bg-red-700",
  },
  info: {
    iconWrap: "bg-blue-50 text-blue-600",
    icon: "text-blue-600",
    title: "text-gray-950",
    border: "border-blue-100",
    button: "bg-gray-900 text-white hover:bg-emerald-600",
  },
  loading: {
    iconWrap: "bg-emerald-50 text-emerald-600",
    icon: "text-emerald-600",
    title: "text-gray-950",
    border: "border-emerald-100",
    button: "bg-gray-900 text-white hover:bg-emerald-600",
  },
  success: {
    iconWrap: "bg-emerald-50 text-emerald-600",
    icon: "text-emerald-600",
    title: "text-emerald-700",
    border: "border-emerald-100",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
};

const defaultIconByVariant: Record<StateVariant, StateIcon> = {
  empty: SearchX,
  error: AlertTriangle,
  info: PackageOpen,
  loading: Loader2,
  success: CheckCircle2,
};

const cardSizeClassName: Record<StateSize, string> = {
  sm: "p-4",
  md: "p-6 sm:p-7",
  lg: "p-8 sm:p-10",
};

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function StateActionButton({
  action,
  variant,
}: {
  action: StateAction;
  variant: StateVariant;
}) {
  const className = cx(
    "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold shadow-sm transition-colors",
    variantClassName[variant].button,
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export function StateCard({
  title,
  description,
  variant = "empty",
  size = "md",
  action,
  icon: Icon = defaultIconByVariant[variant],
  className,
}: {
  title: string;
  description?: ReactNode;
  variant?: StateVariant;
  size?: StateSize;
  action?: StateAction;
  icon?: StateIcon;
  className?: string;
}) {
  const style = variantClassName[variant];
  const isLoading = variant === "loading";
  const role = variant === "error" ? "alert" : variant === "loading" ? "status" : undefined;

  return (
    <section
      role={role}
      aria-busy={isLoading ? true : undefined}
      aria-live={variant === "error" || variant === "loading" ? "polite" : undefined}
      className={cx(
        "rounded-[28px] border bg-white text-center shadow-sm",
        style.border,
        cardSizeClassName[size],
        className,
      )}
    >
      <div
        className={cx(
          "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
          style.iconWrap,
        )}
      >
        <Icon
          size={24}
          strokeWidth={isLoading ? 2.5 : 2.25}
          className={cx(style.icon, isLoading && "motion-safe:animate-spin")}
        />
      </div>
      <h2 className={cx("text-base font-extrabold sm:text-lg", style.title)}>
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 font-medium text-gray-500">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-6">
          <StateActionButton action={action} variant={variant} />
        </div>
      ) : null}
    </section>
  );
}

export function PageState({
  title,
  description,
  variant = "empty",
  action,
}: {
  title: string;
  description?: ReactNode;
  variant?: StateVariant;
  action?: StateAction;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-gray-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <PackageOpen size={21} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">ResQFood</span>
        </div>
        <StateCard
          title={title}
          description={description}
          variant={variant}
          size="lg"
          action={action}
        />
      </div>
    </main>
  );
}

export function InlineNotice({
  title,
  description,
  variant = "info",
  className,
}: {
  title?: string;
  description: ReactNode;
  variant?: Exclude<StateVariant, "loading" | "empty">;
  className?: string;
}) {
  const style = variantClassName[variant];
  const Icon = defaultIconByVariant[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cx(
        "flex gap-3 rounded-2xl border px-4 py-3 text-sm font-bold",
        style.border,
        variant === "error"
          ? "bg-red-50 text-red-700"
          : variant === "success"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-blue-50 text-blue-700",
        className,
      )}
    >
      <Icon size={18} className={cx("mt-0.5 shrink-0", style.icon)} />
      <div className="min-w-0">
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className={title ? "mt-0.5 font-semibold" : "font-semibold"}>
          {description}
        </div>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("rounded-2xl bg-gray-100 motion-safe:animate-pulse", className)}
    />
  );
}

export function SkeletonCardGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Memuat konten"
      className={cx("grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6", className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="flex min-h-32 gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm lg:gap-4"
        >
          <SkeletonBlock className="h-24 w-24 shrink-0 rounded-xl lg:h-32 lg:w-32" />
          <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="mt-3 h-3 w-1/2" />
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-5 w-14 rounded-lg" />
              <SkeletonBlock className="h-5 w-20 rounded-lg" />
            </div>
            <div className="mt-auto flex items-end justify-between gap-3">
              <div className="w-28">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="mt-2 h-4 w-24" />
              </div>
              <SkeletonBlock className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
