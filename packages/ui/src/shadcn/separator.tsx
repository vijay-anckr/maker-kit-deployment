'use client';

import * as React from 'react';

import { Separator as SeparatorPrimitive } from 'radix-ui';

import { cn } from '../lib/utils';

const Separator: React.FC<
  React.ComponentPropsWithRef<typeof SeparatorPrimitive.Root>
> = ({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}) => (
  <SeparatorPrimitive.Root
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    )}
    {...props}
  />
);

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
