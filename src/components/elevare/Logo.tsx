import logoAsset from "@/assets/elevare-logo.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="Elevare Consultoria"
        className="h-10 w-10 object-contain"
      />
      {!compact && (
        <div className="flex flex-col justify-center">
          <span className="text-[22px] font-black text-white tracking-tighter leading-none lowercase">elevare</span>
          <span className="text-[7px] uppercase tracking-[0.3em] text-white/90 font-bold leading-none mt-0.5">
            consultoria
          </span>
        </div>
      )}
    </div>
  );
}
