/**
 * Base Skeleton component.
 * Renders a shimmer element with aria-busy="true".
 */
export default function Skeleton({
  as: Component = "div",
  className = "",
  srText = "Loading...",
  children,
  ...props
}) {
  return (
    <Component
      aria-busy="true"
      aria-live="polite"
      className={`skeleton relative overflow-hidden ${className}`}
      {...props}
    >
      {srText ? <span className="sr-only">{srText}</span> : null}
      {children}
    </Component>
  );
}
