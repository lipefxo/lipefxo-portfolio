import Image from "next/image";

type BtgLogoProps = {
  className?: string;
  inverse?: boolean;
  title?: string;
};

export function BtgLogo({
  className = "",
  inverse = false,
  title = "BTG Pactual",
}: BtgLogoProps) {
  return (
    <Image
      alt={title}
      className={`${className} ${inverse ? "brightness-0 invert" : ""}`}
      height={48}
      priority
      src="/btg-investments-prototype/btg-pactual.svg"
      unoptimized
      width={122}
    />
  );
}
