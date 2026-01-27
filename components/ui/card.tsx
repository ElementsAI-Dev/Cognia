import * as React from "react"

import { cn } from "@/lib/utils"

export type CardImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type CardImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const BACKGROUND_FIT_MAP: Record<CardImageFit, string> = {
  'cover': 'cover',
  'contain': 'contain',
  'fill': '100% 100%',
  'none': 'auto',
  'scale-down': 'contain',
};

const BACKGROUND_POSITION_MAP: Record<CardImagePosition, string> = {
  'center': 'center center',
  'top': 'center top',
  'bottom': 'center bottom',
  'left': 'left center',
  'right': 'right center',
  'top-left': 'left top',
  'top-right': 'right top',
  'bottom-left': 'left bottom',
  'bottom-right': 'right bottom',
};

interface CardProps extends React.ComponentProps<"div"> {
  backgroundImage?: string;
  backgroundFit?: CardImageFit;
  backgroundPosition?: CardImagePosition;
  backgroundOpacity?: number;
  backgroundOverlay?: boolean;
  backgroundOverlayColor?: string;
  backgroundBlur?: number;
}

function Card({
  className,
  backgroundImage,
  backgroundFit = 'cover',
  backgroundPosition = 'center',
  backgroundOpacity = 1,
  backgroundOverlay = false,
  backgroundOverlayColor = 'rgba(0,0,0,0.4)',
  backgroundBlur = 0,
  style,
  children,
  ...props
}: CardProps) {
  const hasBackground = !!backgroundImage;

  const backgroundStyle: React.CSSProperties = hasBackground ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: BACKGROUND_FIT_MAP[backgroundFit],
    backgroundPosition: BACKGROUND_POSITION_MAP[backgroundPosition],
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 sm:gap-6 rounded-lg sm:rounded-xl border py-4 sm:py-6 shadow-sm",
        hasBackground && "relative overflow-hidden",
        className
      )}
      style={{ ...style, ...(!hasBackground ? {} : {}) }}
      {...props}
    >
      {hasBackground && (
        <>
          <div
            className="absolute inset-0 -z-10"
            style={{
              ...backgroundStyle,
              opacity: backgroundOpacity,
              filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
            }}
          />
          {backgroundOverlay && (
            <div
              className="absolute inset-0 -z-10"
              style={{ backgroundColor: backgroundOverlayColor }}
            />
          )}
        </>
      )}
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 sm:gap-2 px-4 sm:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4 sm:[.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 sm:px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 sm:px-6 [.border-t]:pt-4 sm:[.border-t]:pt-6", className)}
      {...props}
    />
  )
}

const IMAGE_FIT_CLASSES: Record<CardImageFit, string> = {
  'cover': 'object-cover',
  'contain': 'object-contain',
  'fill': 'object-fill',
  'none': 'object-none',
  'scale-down': 'object-scale-down',
};

const IMAGE_POSITION_CLASSES: Record<CardImagePosition, string> = {
  'center': 'object-center',
  'top': 'object-top',
  'bottom': 'object-bottom',
  'left': 'object-left',
  'right': 'object-right',
  'top-left': 'object-left-top',
  'top-right': 'object-right-top',
  'bottom-left': 'object-left-bottom',
  'bottom-right': 'object-right-bottom',
};

interface CardImageProps extends Omit<React.ComponentProps<"img">, 'src'> {
  src: string;
  alt?: string;
  fit?: CardImageFit;
  position?: CardImagePosition;
  aspectRatio?: string;
  overlay?: boolean;
  overlayClassName?: string;
}

function CardImage({
  src,
  alt = '',
  fit = 'cover',
  position = 'center',
  aspectRatio,
  overlay = false,
  overlayClassName,
  className,
  ...props
}: CardImageProps) {
  const fitClass = IMAGE_FIT_CLASSES[fit];
  const positionClass = IMAGE_POSITION_CLASSES[position];

  return (
    <div
      data-slot="card-image"
      className={cn("relative overflow-hidden rounded-t-lg sm:rounded-t-xl -mt-4 sm:-mt-6 -mx-0", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full", fitClass, positionClass)}
        loading="lazy"
        {...props}
      />
      {overlay && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent",
            overlayClassName
          )}
        />
      )}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardImage,
}
