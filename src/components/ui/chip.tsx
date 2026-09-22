import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const chipVariants = cva(
  "group/chip inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0"
)

function Chip({
  className,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof chipVariants>) {
  return (
    <ButtonPrimitive
      data-slot="chip"
      className={cn(chipVariants({ className }))}
      {...props}
    />
  )
}

export { Chip, chipVariants }
