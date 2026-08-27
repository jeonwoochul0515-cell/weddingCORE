import { Sparkles } from 'lucide-react';

export default function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`relative grid h-9 w-9 place-items-center rounded-xl ${inverse ? 'bg-white/10 text-emerald-300 ring-1 ring-white/10' : 'bg-[#102621] text-emerald-300 shadow-lg shadow-emerald-950/10'}`}>
        <Sparkles size={17} strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-current bg-emerald-400" />
      </span>
      {!compact && <span className={`text-[17px] font-bold tracking-[-0.03em] ${inverse ? 'text-white' : 'text-[#102621]'}`}>wedding<span className="text-emerald-500">CORE</span></span>}
    </div>
  );
}
