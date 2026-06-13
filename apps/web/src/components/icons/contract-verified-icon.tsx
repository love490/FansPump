import { cn } from "@/lib/utils";

type ContractVerifiedIconProps = {
  className?: string;
  size?: number;
  title?: string;
};

/** 10-point scalloped seal path — transparent background. */
function scallopedSealPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 10
): string {
  const segments: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    segments.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${segments.join(" ")} Z`;
}

/** Green seal + white check — transparent background (contract verification). */
export function ContractVerifiedIcon({
  className,
  size = 16,
  title = "Contract verified",
}: ContractVerifiedIconProps) {
  const seal = scallopedSealPath(12, 12, 10.8, 9.2, 10);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path fill="#22C55E" d={seal} />
      <path
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.4 12.1l3.2 3.2 6.6-7"
      />
    </svg>
  );
}
