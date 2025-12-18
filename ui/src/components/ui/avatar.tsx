import * as React from "react";

interface AvatarProps {
  children?: React.ReactNode;
  className?: string;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
}

interface AvatarFallbackProps {
  children: React.ReactNode;
}

const AvatarContext = React.createContext<{
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}>({
  imageLoaded: false,
  setImageLoaded: () => {},
});

export function Avatar({ children, className = "" }: AvatarProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
      <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>
        {children}
      </div>
    </AvatarContext.Provider>
  );
}

export function AvatarImage({ src, alt }: AvatarImageProps) {
  const { setImageLoaded } = React.useContext(AvatarContext);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-square h-full w-full object-cover"
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageLoaded(false)}
    />
  );
}

export function AvatarFallback({ children }: AvatarFallbackProps) {
  const { imageLoaded } = React.useContext(AvatarContext);

  if (imageLoaded) return null;

  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
      {children}
    </div>
  );
}
