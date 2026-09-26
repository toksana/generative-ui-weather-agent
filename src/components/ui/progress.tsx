import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("w-full", className)}
      {...props}
    />
  )
}

function ProgressTrack({
  className,
  ...props
}: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

const progressIndicatorVariants = cva(
  "block h-full rounded-full transition-[width] duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-foreground",
        info: "bg-info",
        warning: "bg-warning",
        success: "bg-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ProgressIndicator({
  className,
  variant = "default",
  ...props
}: ProgressPrimitive.Indicator.Props &
  VariantProps<typeof progressIndicatorVariants>) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(progressIndicatorVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator }
