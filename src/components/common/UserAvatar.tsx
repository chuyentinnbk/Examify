'use client';

import React, { useState, useEffect } from 'react';
import { GravatarDefault, computeSha256Hex } from '@/lib/gravatar';

export interface UserAvatarProps {
  name?: string;
  email?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  rounded?: 'rounded-full' | 'rounded-xl' | 'rounded-2xl';
  defaultType?: GravatarDefault;
  showIndicator?: boolean;
  indicatorColor?: string;
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<string, { box: string; pixel: number; text: string; indicator: string }> = {
  xs: { box: 'w-6 h-6', pixel: 48, text: 'text-[10px]', indicator: 'w-1.5 h-1.5 bottom-0 right-0' },
  sm: { box: 'w-8 h-8', pixel: 64, text: 'text-xs', indicator: 'w-2 h-2 bottom-0 right-0 ring-2' },
  md: { box: 'w-10 h-10', pixel: 80, text: 'text-sm', indicator: 'w-2.5 h-2.5 bottom-0 right-0 ring-2' },
  lg: { box: 'w-12 h-12', pixel: 96, text: 'text-base', indicator: 'w-3 h-3 bottom-0.5 right-0.5 ring-2' },
  xl: { box: 'w-20 h-20', pixel: 160, text: 'text-3xl', indicator: 'w-4 h-4 bottom-1 right-1 ring-4' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  email = '',
  size = 'md',
  rounded = 'rounded-xl',
  defaultType = 'identicon',
  showIndicator = false,
  indicatorColor = 'bg-emerald-500',
  className = '',
  alt,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeConfig =
    typeof size === 'string' && SIZE_MAP[size]
      ? SIZE_MAP[size]
      : {
          box: typeof size === 'number' ? `w-[${size}px] h-[${size}px]` : 'w-10 h-10',
          pixel: typeof size === 'number' ? size * 2 : 80,
          text: 'text-sm',
          indicator: 'w-2.5 h-2.5 bottom-0 right-0 ring-2',
        };

  useEffect(() => {
    let isMounted = true;

    if (!email || !email.trim()) {
      setAvatarUrl(null);
      return;
    }

    computeSha256Hex(email).then((hash) => {
      if (isMounted) {
        setAvatarUrl(
          `https://www.gravatar.com/avatar/${hash}?d=${defaultType}&s=${sizeConfig.pixel}`
        );
        setIsLoaded(false);
        setHasError(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [email, defaultType, sizeConfig.pixel]);

  const initialLetter = (name.trim() || email.trim() || 'U')
    .split(' ')
    .slice(-1)[0]
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeConfig.box} ${className}`}
      title={name ? `${name} (${email || 'Tài khoản'})` : email}
    >
      {/* Fallback Initials Badge */}
      <div
        className={`absolute inset-0 ${rounded} bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white font-extrabold shadow-sm ${sizeConfig.text}`}
      >
        {initialLetter}
      </div>

      {/* Gravatar Image */}
      {avatarUrl && !hasError && (
        <img
          src={avatarUrl}
          alt={alt || name || 'User Avatar'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover ${rounded} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}

      {/* Online / Active Status Dot */}
      {showIndicator && (
        <span
          className={`absolute ${sizeConfig.indicator} ${indicatorColor} rounded-full ring-white dark:ring-slate-900 z-10`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
