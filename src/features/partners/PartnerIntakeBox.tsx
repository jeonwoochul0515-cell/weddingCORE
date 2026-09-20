// 현지에서 온 자료를 그대로 넣으면 칸을 채워 주는 상자
//
// 현장은 이렇다. 카톡으로 글 몇 줄과 「신부 프로필」 카드 그림이 온다.
// 사장은 그걸 보면서 칸 열네 개를 손으로 친다. 한 사람에 5분, 열 사람이면 한 시간이다.
//
// 여기 붙여 넣으면 칸이 채워진다. 채워진 값은 **제안**이다 — 저장 전에 사람이 본다.
// 그리고 채우는 것보다 중요한 일을 같이 한다. 빠진 법정 서류와 자료끼리 어긋나는 곳을 짚는다.

import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { ClipboardPaste, ImagePlus, Loader2, X } from 'lucide-react';
import { functions } from '@/lib/firebase';
import type { PartnerForm } from './usePartners';

/** 서버가 돌려주는 값. functions/src/domain/partnerProfileCheck.ts 와 같은 모양이다 */
type Draft = {
  name: string | null;
  nationality: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | null;
  region: string | null;
  occupation: string | null;
  education: string | null;
  religion: string | null;
  maritalHistory: string | null;
  languages: string | null;
  heightCm: number | null;
  weightKg: number | null;
  memo: string | null;
};

export type ProfileWarning = {
  kind: 'legal' | 'conflict' | 'safety' | 'missing';
  field?: string;
  message: string;
  remedy: string;
  legalBasis?: string;
};

type IntakeResult = {
  draft: Draft;
  fromText: Draft | null;
  fromImages: Draft[];
  warnings: ProfileWarning[];
  confidence: 'high' | 'medium' | 'low';
};

type Photo = { name: string; mimeType: string; dataBase64: string; preview: string };

const MAX_IMAGES = 4;

const WARNING_STYLE: Record<ProfileWarning['kind'], { box: string; label: string }> = {
  // 사람 몸과 나이. 가장 세게 보여 준다 — 넘기면 되돌릴 수 없다.
  safety: { box: 'border-red-300 bg-red-50 text-red-900', label: '확인 필요' },
  // 자료끼리 어긋남. 다른 사람 사진을 손님에게 보여 주는 사고가 여기서 난다.
  conflict: { box: 'border-orange-300 bg-orange-50 text-orange-900', label: '자료 불일치' },
  // 법이 요구하는 서류.
  legal: { box: 'border-amber-300 bg-amber-50 text-amber-900', label: '법정 서류' },
  missing: { box: 'border-slate-300 bg-slate-50 text-slate-700', label: '빈 칸' },
};

/** 서버가 준 값을 화면 폼 모양으로 바꾼다. null은 빈 문자열이 된다 */
function toForm(draft: Draft): Partial<PartnerForm> {
  return {
    name: draft.name ?? '',
    nationality: draft.nationality ?? '',
    birthDate: draft.birthDate ?? '',
    gender: draft.gender ?? '',
    region: draft.region ?? '',
    occupation: draft.occupation ?? '',
    education: draft.education ?? '',
    religion: draft.religion ?? '',
    maritalHistory: draft.maritalHistory ?? '',
    languages: draft.languages ?? '',
    height: draft.heightCm != null ? String(draft.heightCm) : '',
    weight: draft.weightKg != null ? String(draft.weightKg) : '',
    memo: draft.memo ?? '',
  };
}

async function toPhoto(file: File): Promise<Photo> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return {
    name: file.name,
    mimeType: file.type,
    dataBase64: dataUrl.slice(comma + 1),
    preview: dataUrl,
  };
}

type Props = {
  /** 채워진 값을 폼에 넣는다. 덮어쓰지 않고 비어 있는 칸만 채울지는 부모가 정한다 */
  onFilled: (values: Partial<PartnerForm>, warnings: ProfileWarning[]) => void;
};

export default function PartnerIntakeBox({ onFilled }: Props) {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_IMAGES - photos.length;
    if (room <= 0) {
      setError(`사진은 ${MAX_IMAGES}장까지 넣을 수 있습니다.`);
      return;
    }
    try {
      const added = await Promise.all(Array.from(files).slice(0, room).map(toPhoto));
      setPhotos((s) => [...s, ...added]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** 카톡에서 그림을 복사해 바로 붙여 넣는 경우. 파일로 저장했다 올리는 수고를 없앤다 */
  async function onPaste(event: React.ClipboardEvent) {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    const list = new DataTransfer();
    for (const f of files) list.items.add(f);
    await addFiles(list.files);
  }

  async function run() {
    if (!text.trim() && photos.length === 0) {
      setError('글이나 사진을 넣어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const call = httpsCallable<
        { text: string; images: Array<{ mimeType: string; dataBase64: string }> },
        IntakeResult
      >(functions, 'extractPartnerProfile');
      const { data } = await call({
        text,
        images: photos.map((p) => ({ mimeType: p.mimeType, dataBase64: p.dataBase64 })),
      });
      setResult(data);
      onFilled(toForm(data.draft), data.warnings);
    } catch (e) {
      setError((e as { message?: string }).message ?? '자료를 정리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
      <div className="flex items-center gap-2">
        <ClipboardPaste size={16} className="text-emerald-700" />
        <h3 className="text-sm font-bold text-emerald-900">현지에서 온 자료 그대로 넣기</h3>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-emerald-800/80">
        카톡으로 받은 글과 프로필 카드 사진을 넣으면 아래 칸을 채웁니다. 채워진 값은 제안이니
        저장 전에 꼭 확인해 주세요.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => void onPaste(e)}
        placeholder={'이름: …\n국적: …\n생년월일: …\n(받은 내용을 그대로 붙여 넣으세요. 사진은 여기 붙여 넣어도 됩니다)'}
        className="mt-3 min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
      />

      {photos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={`${p.name}-${i}`} className="relative">
              <img src={p.preview} alt={p.name} className="h-20 w-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((s) => s.filter((_, idx) => idx !== i))}
                aria-label={`${p.name} 빼기`}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
        >
          <ImagePlus size={14} /> 사진 고르기
        </button>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? '읽는 중…' : '칸 채우기'}
        </button>
        {result && (
          <span className="text-[11px] text-slate-500">
            {result.confidence === 'high'
              ? '또렷하게 읽었습니다'
              : result.confidence === 'medium'
                ? '일부는 흐릿합니다 — 확인해 주세요'
                : '읽기 어려운 자료입니다 — 한 칸씩 확인해 주세요'}
          </span>
        )}
      </div>

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {result && result.warnings.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.warnings.map((w, i) => {
            const style = WARNING_STYLE[w.kind];
            return (
              <li key={i} className={`rounded-lg border px-3 py-2 text-[11px] leading-4 ${style.box}`}>
                <strong className="font-bold">[{style.label}] {w.message}</strong>
                <p className="mt-0.5 opacity-90">{w.remedy}</p>
                {w.legalBasis && <p className="mt-0.5 opacity-70">근거: {w.legalBasis}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {result && result.warnings.length === 0 && (
        <p className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] text-emerald-800">
          빠진 법정 서류와 어긋나는 값이 보이지 않습니다. 그래도 저장 전에 한 번 읽어 주세요.
        </p>
      )}
    </section>
  );
}
