import Skeleton from "./Skeleton";

/**
 * Circular avatar skeleton.
 */
export default function SkeletonAvatar({
  size = "md",
  className = "",
  ...props
}) {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  }[size] || "h-10 w-10";

  return (
    <Skeleton
      className={`rounded-full flex-shrink-0 ${sizeClasses} ${className}`}
      srText="Loading avatar..."
      {...props}
    />
  );
}
