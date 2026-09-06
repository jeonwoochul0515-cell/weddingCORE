// 사진 한 장을 올리고 바꾸고 지우는 칸 — 고객·후보 화면이 같이 쓴다
import { useRef, useState } from 'react';
import { Camera, Trash2, UserRound } from 'lucide-react';
import { usePhotoUpload, type PhotoKind } from './usePhoto';

type Props = {
  agencyId: string | null | undefined;
  kind: PhotoKind;
  targetId: string;
  /** 지금 저장돼 있는 사진 주소. 없으면 빈 자리를 보여 준다 */
  url?: string | null;
  /** 올리거나 지운 뒤 새 주소(지웠으면 null)를 부모에게 알린다 */
  onChange: (url: string | null) => void;
  size?: 'sm' | 'lg';
};

export default function PhotoField({ agencyId, kind, targetId, url, onChange, size = 'lg' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, remove, busy, error } = usePhotoUpload(agencyId, kind);
  const [confirming, setConfirming] = useState(false);
  const box = size === 'lg' ? 'h-36 w-28' : 'h-20 w-16';

  async function pick(file: File | undefined) {
    if (!file) return;
    const next = await upload(targetId, file);
    if (next) onChange(next);
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className={`${box} shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50`}>
          {url ? (
            // 사진은 사람 얼굴이라 잘리면 안 된다. 세로 기준으로 맞춘다.
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-slate-300"><UserRound size={size === 'lg' ? 34 : 22} /></span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50"
          >
            <Camera size={14} />{busy ? '올리는 중…' : url ? '사진 바꾸기' : '사진 올리기'}
          </button>
          {url && (confirming ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button type="button" disabled={busy} onClick={async () => { await remove(targetId); onChange(null); setConfirming(false); }} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white">지우기</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-500 ring-1 ring-slate-200">취소</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />사진 지우기
            </button>
          ))}
          <span className="text-[11px] leading-4 text-slate-400">5MB까지, 사진 파일만</span>
        </div>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
