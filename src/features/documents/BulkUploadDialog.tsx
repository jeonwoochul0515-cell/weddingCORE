// 서류를 한꺼번에 올린다 — 종류·대상·발급일은 사진에서 읽는다
//
// 통화 한 건을 열려면 증빙이 대여섯 장 든다. 한 장씩 올리면서 「종류」와 「누구 것인가」와
// 「발급일」을 매번 고르면 서른 번을 누른다. 서류에는 그게 이미 적혀 있다 —
// 제목에 「범죄경력 회보서」라고 쓰여 있고 발급일도 찍혀 있다.
//
// 그래서 순서를 뒤집었다. 파일을 먼저 다 넣고, 읽은 결과를 표로 보여 주고,
// **틀린 것만** 고친 뒤 한 번에 올린다.

import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { AlertCircle, FileUp, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { functions } from '@/lib/firebase';
import { uploadClientDocument } from './useClientDocuments';
import { DOC_TYPE_LABEL, type DocType } from './types';

const UPLOADABLE: DocType[] = [
  'criminal_record',
  'health_cert',
  'income_proof',
  'marital_cert',
  'background_info',
  'contract',
  'rights_notice',
  'passport',
  'other',
];

type Subject = 'korean' | 'partner' | 'both';

const SUBJECT_LABEL: Record<Subject, string> = {
  korean: '한국인 측',
  partner: '외국인 측',
  both: '양측',
};

type Classified = {
  index: number;
  type: DocType;
  subject: Subject;
  issuedAt: string | null;
  evidence: string | null;
  confidence: 'high' | 'medium' | 'low';
};

type Row = {
  file: File;
  type: DocType;
  subject: Subject;
  issuedAt: string;
  /** 사람이 손대지 않은 값인가. 읽은 그대로인지 고친 것인지 표시한다 */
  auto: boolean;
  evidence: string | null;
  confidence: Classified['confidence'] | null;
  state: 'ready' | 'uploading' | 'done' | 'failed';
  error?: string;
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILES = 8;
const MAX_SIZE = 20 * 1024 * 1024;

async function toBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

type Props = {
  agencyId: string;
  clientId: string;
  uid: string;
  onClose: () => void;
  /** 다 올린 뒤 부른다. 법정의무를 다시 맞추는 데 쓴다 */
  onUploaded?: (count: number) => void;
};

export default function BulkUploadDialog({ agencyId, clientId, uid, onClose, onUploaded }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const room = MAX_FILES - rows.length;
    if (room <= 0) {
      setError(`한 번에 ${MAX_FILES}장까지 올릴 수 있습니다.`);
      return;
    }
    const picked = Array.from(list).slice(0, room);
    const tooBig = picked.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`${tooBig.name} 이 20MB를 넘습니다. 사진이면 크기를 줄여 주세요.`);
      return;
    }
    setRows((s) => [
      ...s,
      ...picked.map<Row>((file) => ({
        file,
        type: 'other',
        subject: 'korean',
        issuedAt: '',
        auto: false,
        evidence: null,
        confidence: null,
        state: 'ready',
      })),
    ]);
  }

  /** 사진에서 종류·대상·발급일을 읽어 칸을 채운다. PDF는 읽지 않는다 */
  async function classify() {
    const targets = rows
      .map((r, i) => ({ row: r, i }))
      .filter(({ row }) => IMAGE_TYPES.includes(row.file.type));
    if (targets.length === 0) {
      setError('읽을 수 있는 사진이 없습니다. PDF는 종류를 직접 골라 주세요.');
      return;
    }
    setReading(true);
    setError(null);
    try {
      const images = await Promise.all(
        targets.map(async ({ row }) => ({
          mimeType: row.file.type,
          dataBase64: await toBase64(row.file),
        })),
      );
      const call = httpsCallable<
        { images: Array<{ mimeType: string; dataBase64: string }> },
        { documents: Classified[] }
      >(functions, 'classifyClientDocuments');
      const { data } = await call({ images });

      setRows((s) => {
        const next = [...s];
        data.documents.forEach((d) => {
          const target = targets[d.index];
          if (!target) return;
          const current = next[target.i];
          if (!current) return;
          next[target.i] = {
            ...current,
            type: d.type,
            subject: d.subject,
            issuedAt: d.issuedAt ?? '',
            auto: true,
            evidence: d.evidence,
            confidence: d.confidence,
          };
        });
        return next;
      });
    } catch (e) {
      setError((e as { message?: string }).message ?? '서류를 읽지 못했습니다.');
    } finally {
      setReading(false);
    }
  }

  async function uploadAll() {
    if (rows.length === 0) return;
    setBusy(true);
    setError(null);
    let done = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || row.state === 'done') continue;
      setRows((s) => s.map((r, idx) => (idx === i ? { ...r, state: 'uploading' } : r)));
      try {
        await uploadClientDocument({
          agencyId,
          clientId,
          uid,
          file: row.file,
          type: row.type,
          subject: row.subject,
          issuedAt: row.issuedAt ? new Date(row.issuedAt) : null,
          validUntilOverride: null,
        });
        done += 1;
        setRows((s) => s.map((r, idx) => (idx === i ? { ...r, state: 'done' } : r)));
      } catch (e) {
        // 한 장이 실패해도 나머지는 올린다. 다섯 장 중 하나 때문에 처음부터 다시 하면 안 된다.
        setRows((s) =>
          s.map((r, idx) =>
            idx === i ? { ...r, state: 'failed', error: (e as Error).message } : r,
          ),
        );
      }
    }
    setBusy(false);
    if (done > 0) onUploaded?.(done);
    if (rows.every((r) => r.state === 'done')) onClose();
  }

  const set = (i: number, patch: Partial<Row>) =>
    setRows((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch, auto: false } : r)));

  const allDone = rows.length > 0 && rows.every((r) => r.state === 'done');
  const hasImages = rows.some((r) => IMAGE_TYPES.includes(r.file.type));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#102621]">서류 올리기</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center"
        >
          <FileUp size={22} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">
            증빙을 <strong>한꺼번에</strong> 끌어다 놓으세요. 최대 {MAX_FILES}장.
          </p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            파일 고르기
          </button>
        </div>

        {rows.length > 0 && (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">{rows.length}장</p>
              <button
                type="button"
                onClick={() => void classify()}
                disabled={reading || busy || !hasImages}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {reading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {reading ? '읽는 중…' : '사진에서 읽어 채우기'}
              </button>
            </div>

            <ul className="mt-2 space-y-2">
              {rows.map((r, i) => (
                <li
                  key={`${r.file.name}-${i}`}
                  className={`rounded-xl border p-3 ${
                    r.state === 'done'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : r.state === 'failed'
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{r.file.name}</p>
                      {r.evidence && (
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                          {r.evidence}
                          {r.confidence === 'low' && (
                            <span className="ml-1 font-semibold text-amber-700">
                              — 확실하지 않습니다. 꼭 확인해 주세요
                            </span>
                          )}
                        </p>
                      )}
                      {r.state === 'failed' && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-red-700">
                          <AlertCircle size={11} />
                          {r.error}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {r.state === 'uploading' && <Loader2 size={14} className="animate-spin text-slate-400" />}
                      {r.state === 'done' && (
                        <span className="text-[11px] font-semibold text-emerald-700">올림</span>
                      )}
                      {r.state !== 'done' && (
                        <button
                          type="button"
                          onClick={() => setRows((s) => s.filter((_, idx) => idx !== i))}
                          aria-label="빼기"
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <select
                      value={r.type}
                      onChange={(e) => set(i, { type: e.target.value as DocType })}
                      disabled={r.state === 'done'}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50"
                    >
                      {UPLOADABLE.map((t) => (
                        <option key={t} value={t}>
                          {DOC_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={r.subject}
                      onChange={(e) => set(i, { subject: e.target.value as Subject })}
                      disabled={r.state === 'done'}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50"
                    >
                      {(Object.keys(SUBJECT_LABEL) as Subject[]).map((s) => (
                        <option key={s} value={s}>
                          {SUBJECT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={r.issuedAt}
                      onChange={(e) => set(i, { issuedAt: e.target.value })}
                      disabled={r.state === 'done'}
                      title="발급일"
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-500"
          >
            {allDone ? '닫기' : '취소'}
          </button>
          <button
            type="button"
            onClick={() => void uploadAll()}
            disabled={busy || reading || rows.length === 0 || allDone}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? '올리는 중…' : `${rows.length}장 올리기`}
          </button>
        </div>
      </div>
    </div>
  );
}
