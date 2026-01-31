import { useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { cn } from '../utils/cn';

const ProfilePicture = ({ 
  src, 
  alt = 'Profile', 
  size = 'md',
  className,
  showBorder = false,
  fallbackIcon: FallbackIcon = User
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  };

  const loaderSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  if (!src || hasError) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-full bg-muted flex items-center justify-center',
          showBorder && 'border-2 border-border',
          className
        )}
      >
        <FallbackIcon className={cn(iconSizeClasses[size], 'text-muted-foreground')} />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'relative',
        sizeClasses[size],
        showBorder && !className?.includes('border') && 'border-2 border-border',
        className
      )}
    >
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-muted flex items-center justify-center z-10'
          )}
        >
          <Loader2 className={cn(loaderSizeClasses[size], 'animate-spin text-primary')} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full rounded-full object-cover',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100 transition-opacity duration-300'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

export default ProfilePicture;

