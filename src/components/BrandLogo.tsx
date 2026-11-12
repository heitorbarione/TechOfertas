import {
  BatteryCharging,
  Cable,
  Cpu,
  Gamepad2,
  HardDrive,
  Headphones,
  Home,
  Keyboard,
  Laptop,
  Smartphone,
  Tv,
  Watch,
  Zap,
} from 'lucide-react';

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1.5" y="1.5" width="33" height="33" rx="8" fill="#121215" stroke="#FACC15" strokeWidth="2" />
        <path d="M9 11.5H27V15H20V26H16V15H9V11.5Z" fill="#FAFAFA" />
        <path d="M23.5 16.5L20 22H23.5L21.5 27L27.5 20.5H23.8L25.8 16.5H23.5Z" fill="#FACC15" />
      </svg>
      <span className="font-display text-lg font-extrabold tracking-tight text-zinc-50">
        Tech <span className="text-yellow-400">Oferta</span>
      </span>
    </span>
  );
}

export function CategoryIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'headphones':
      return <Headphones className={className} />;
    case 'smartphone':
      return <Smartphone className={className} />;
    case 'battery-charging':
      return <BatteryCharging className={className} />;
    case 'tv':
      return <Tv className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'gamepad-2':
      return <Gamepad2 className={className} />;
    case 'watch':
      return <Watch className={className} />;
    case 'cable':
      return <Cable className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'hard-drive':
      return <HardDrive className={className} />;
    case 'keyboard':
      return <Keyboard className={className} />;
    case 'zap':
      return <Zap className={className} />;
    default:
      return <Cpu className={className} />;
  }
}
