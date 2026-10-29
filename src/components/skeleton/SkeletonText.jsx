import Skeleton from "./Skeleton";

/**
 * Multi-line SkeletonText.
 * Generates natural staggered widths.
 */
export default function SkeletonText({
  lines = 3,
  className = "",
  lineClassName = "h-4",
  widths = ["100%", "92%", "75%"],
  gap = "gap-2.5",
  ...props
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col ${gap} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading text...</span>
      {Array.from({ length: lines }).map((_, index) => {
        const width = widths[index % widths.length];
        return (
          <Skeleton
            key={index}
            className={`rounded-md ${lineClassName}`}
            style={{ width }}
            srText=""
          />
        );
      })}
    </div>
  );
}
