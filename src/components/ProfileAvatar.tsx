import Image from "next/image";

interface ProfileAvatarProps {
  size?: number;
  className?: string;
  tooltip?: string | false;
}

export function ProfileAvatar({
  size = 24,
  className = "",
  tooltip = "Hey there :)",
}: ProfileAvatarProps) {
  return (
    <span className="group relative inline-flex shrink-0">
      <Image
        src="/profile.png"
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className={`rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      />
      {tooltip && (
        <span
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2 scale-[0.98] whitespace-nowrap rounded-lg bg-[#222222] px-3 py-2 text-xs font-medium text-[#f0f0f0] opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_0_rgba(0,0,0,0.05),0_4px_42px_0_rgba(0,0,0,0.06)] transition-[opacity,transform] duration-75 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:delay-[80ms] group-hover:duration-150"
          role="tooltip"
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
