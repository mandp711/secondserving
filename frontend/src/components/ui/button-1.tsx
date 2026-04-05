import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'cursor-pointer group whitespace-nowrap focus-visible:outline-none inline-flex items-center justify-between whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 data-[state=open]:bg-primary/90',
        mono: 'bg-zinc-950 text-white dark:bg-zinc-300 dark:text-black hover:bg-zinc-950/90 dark:hover:bg-zinc-300/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        outline: 'bg-background text-accent-foreground border border-input hover:bg-accent',
        dashed: 'text-accent-foreground border border-input border-dashed bg-background hover:bg-accent',
        ghost: 'text-accent-foreground hover:bg-accent hover:text-accent-foreground',
        dim: 'text-muted-foreground hover:text-foreground',
        foreground: '',
        inverse: '',
      },
      appearance: {
        default: '',
        ghost: '',
      },
      underline: {
        solid: '',
        dashed: '',
      },
      underlined: {
        solid: '',
        dashed: '',
      },
      size: {
        lg: 'h-10 rounded-md px-4 text-sm gap-1.5 [&_svg:not([class*=size-])]:size-4',
        md: 'h-[2.125rem] rounded-md px-3 gap-1.5 text-[0.8125rem] leading-5 [&_svg:not([class*=size-])]:size-4',
        sm: 'h-7 rounded-md px-2.5 gap-1 text-xs [&_svg:not([class*=size-])]:size-3.5',
        icon: 'h-[2.125rem] w-[2.125rem] rounded-md [&_svg:not([class*=size-])]:size-4 shrink-0',
      },
      autoHeight: {
        true: '',
        false: '',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
      mode: {
        default: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        icon: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        link: 'text-primary h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
        input: 'justify-start font-normal hover:bg-background focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
      },
      placeholder: {
        true: 'text-muted-foreground',
        false: '',
      },
    },
    compoundVariants: [
      // Shadow support
      { variant: 'primary', mode: 'default', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'mono', mode: 'default', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'secondary', mode: 'default', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'outline', mode: 'default', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'destructive', mode: 'default', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'primary', mode: 'icon', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'mono', mode: 'icon', appearance: 'default', className: 'shadow-sm shadow-black/5' },
      { variant: 'outline', mode: 'icon', appearance: 'default', className: 'shadow-sm shadow-black/5' },

      // Link — inverse (inherits text color from parent)
      {
        variant: 'inverse',
        mode: 'link',
        underlined: 'solid',
        className: 'font-medium text-inherit [&_svg]:opacity-60 underline underline-offset-4 decoration-solid h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
      },
      {
        variant: 'inverse',
        mode: 'link',
        underlined: 'dashed',
        className: 'font-medium text-inherit [&_svg]:opacity-60 underline underline-offset-4 decoration-dashed decoration-1 h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
      },
      {
        variant: 'inverse',
        mode: 'link',
        underline: 'solid',
        className: 'font-medium text-inherit [&_svg]:opacity-60 hover:underline hover:underline-offset-4 h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
      },

      // Link — primary
      {
        variant: 'primary',
        mode: 'link',
        underlined: 'solid',
        className: 'font-medium text-primary hover:text-primary/90 underline underline-offset-4 decoration-solid h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
      },

      // Ghost
      { variant: 'primary', appearance: 'ghost', className: 'bg-transparent text-primary/90 hover:bg-primary/5' },
      { variant: 'destructive', appearance: 'ghost', className: 'bg-transparent text-destructive/90 hover:bg-destructive/5' },
      { variant: 'ghost', mode: 'icon', className: 'text-muted-foreground' },

      // Icon sizes
      { size: 'sm', mode: 'icon', className: 'w-7 h-7 p-0' },
      { size: 'md', mode: 'icon', className: 'w-[2.125rem] h-[2.125rem] p-0' },
      { size: 'lg', mode: 'icon', className: 'w-10 h-10 p-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      mode: 'default',
      size: 'md',
      shape: 'default',
      appearance: 'default',
    },
  },
);

function Button({
  className,
  selected,
  variant,
  shape,
  appearance,
  mode,
  size,
  autoHeight,
  underlined,
  underline,
  asChild = false,
  placeholder = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    selected?: boolean;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, shape, appearance, mode, autoHeight, placeholder, underlined, underline, className }),
        asChild && props.disabled && 'pointer-events-none opacity-50',
      )}
      {...(selected && { 'data-state': 'open' })}
      {...props}
    />
  );
}

interface ButtonArrowProps extends React.SVGProps<SVGSVGElement> {
  icon?: LucideIcon;
}

function ButtonArrow({ icon: Icon = ChevronDown, className, ...props }: ButtonArrowProps) {
  return <Icon data-slot="button-arrow" className={cn('ms-auto -me-1', className)} {...props} />;
}

export { Button, ButtonArrow, buttonVariants };
