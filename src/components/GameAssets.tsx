import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import mimo from '../assets/images/mimo_mascot_1795546550075.jpg';
import villageBg from '../assets/images/village_hero_bg_1795546551068.jpg';
import adventureMap from '../assets/images/adventure_map_bg_1795546551702.jpg';
import treasureChest from '../assets/images/treasure_chest_icon_1795546551341.jpg';
import emblem from '../assets/images/app_icon_emblem_1795546551694.jpg';

export const GAME_IMAGES = {
  mimo, villageBg, adventureMap, treasureChest, emblem,
} as const;

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel = 'Muslim Blast',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#064E3B] to-[#022C22] text-[#F5C542] p-3 text-center ${className}`}
      >
        <Sparkles className="w-7 h-7 mb-1" />
        <span className="text-xs font-semibold text-[#FFF8DC]">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const MuslimBlastLogo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const isLg = size === 'lg';
  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg
        viewBox="0 0 380 96"
        className={isLg ? 'w-72 sm:w-80 h-auto drop-shadow-[0_6px_12px_rgba(2,44,34,0.6)]' : 'w-44 h-auto'}
        role="img"
        aria-label="Muslim Blast"
      >
        <defs>
          <linearGradient id="mbGoldText" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF7CC" />
            <stop offset="45%" stopColor="#F5C542" />
            <stop offset="100%" stopColor="#C98A0C" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="364" height="80" rx="26" fill="#064E3B" stroke="#F5C542" strokeWidth="4" />
        <path
          d="M36 30c-9 0-16 7-16 16s7 16 16 16c4 0 8-1 11-4-3 1-5 1-8 1-8 0-14-6-14-14s6-14 14-14c3 0 5 0 8 1-3-2-7-2-11-2z"
          fill="#F5C542"
        />
        <polygon points="48,32 51,39 58,39 53,44 55,51 48,47 41,51 43,44 38,39 45,39" fill="#FFF7CC" />
        <text
          x="208"
          y="58"
          textAnchor="middle"
          fontFamily="Fredoka, system-ui, sans-serif"
          fontSize="36"
          fontWeight="700"
          fill="url(#mbGoldText)"
          stroke="#022C22"
          strokeWidth="3"
          paintOrder="stroke"
          letterSpacing="1"
        >
          MUSLIM BLAST
        </text>
      </svg>
    </div>
  );
};

export const MimoShowcase: React.FC<{
  equippedCap?: string;
  equippedBackpack?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ equippedCap = 'cap_emerald', equippedBackpack = 'pack_explorer', size = 'md' }) => {
  const capTint =
    equippedCap === 'cap_gold'
      ? 'ring-[#F5C542]'
      : equippedCap === 'cap_sky'
        ? 'ring-[#38BDF8]'
        : 'ring-[#10B981]';
  const packLabel = equippedBackpack === 'pack_library' ? 'Ransel Pustaka' : 'Ransel Penjelajah';
  const dim =
    size === 'lg' ? 'w-36 h-36 sm:w-44 sm:h-44' : size === 'md' ? 'w-24 h-24' : 'w-14 h-14';

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={`${dim} rounded-3xl overflow-hidden border-4 border-[#F5C542] ring-4 ${capTint} bg-[#FFF8DC] shadow-[0_10px_24px_rgba(2,44,34,0.35)]`}
      >
        <ResilientImage
          src={GAME_IMAGES.mimo}
          alt="Maskot Mimo mengenakan topi hijau dan tas ransel"
          className="w-full h-full object-cover"
          fallbackLabel="Mimo"
        />
      </div>
      {size === 'lg' && (
        <span className="mt-2 text-xs font-semibold text-[#FFF8DC]/90">
          Mimo · {packLabel}
        </span>
      )}
    </div>
  );
};
