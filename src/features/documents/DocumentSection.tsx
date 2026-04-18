import { useState } from 'react';
import { FileText, Upload, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useClientDocuments, uploadClientDocument } from './useClientDocuments';
import { DOC_TYPE_LABEL, type DocType, validityStatus } from './types';

const UPLOADABLE_TYPES: DocType[] = [
  'background_info',
  'criminal_record',
  'health_cert',
  'income_proof',
  'marital_cert',
  'passport',
  'contract',
  'rights_notice',
  'other',
];

const STATUS_BADGE = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
} as const;

export default function DocumentSection({ clientId }: { clientId: string }) {
  const user = useAuthStore((s) => s.user);
  const { items, loading } = useClientDocuments(clientId);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">서류</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Upload size={14} />업로드
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          업로드된 서류가 없습니다.
        </p>
      )}

      <div className="space-y-2">
        {items.map((doc) => {
          const validUntil = doc.validUntil?.toDate() ?? null;
          const status = validityStatus(validUntil);
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start gap-3">
                <FileText size={18} className="mt-1 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {DOC_TYPE_LABEL[doc.type]}
                    <span className="ml-2 text-xs text-slate-500">
                      ({doc.subject === 'korean' ? '한국' : doc.subject === 'partner' ? '외국' : '양측'})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{doc.fileName}</div>
                  {doc.issuedAt && (
                    <div className="text-xs text-slate-400">
                      발급 {doc.issuedAt.toDate().toLocaleDateString('ko-KR')}
                      {validUntil && ` · 만료 ${validUntil.toLocaleDateString('ko-KR')}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_BADGE[status.level]}`}
                >
                  {status.label}
                </span>
                <a
                  href={doc.storageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {showUpload && user?.agencyId && (
        <UploadDialog
          agencyId={user.agencyId}
          clientId={clientId}
          uid={user.uid}
          onClose={() => setShowUpload(false)}
        />
      )}
    </section>
  );
}

function UploadDialog({
  agencyId,
  clientId,
  uid,
  onClose,
}: {
  agencyId: string;
  clientId: string;
  uid: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocType>('criminal_record');
  const [subject, setSubject] = useState<'korean' | 'partner' | 'both'>('korean');
  const [issuedAt, setIssuedAt] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) { setError('파일을 선택해 주세요.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await uploadClientDocument({
        agencyId,
        clientId,
        uid,
        file,
        type,
        subject,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        validUntilOverride: validUntil ? new Date(validUntil) : null,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">서류 업로드</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">서류 유형</label>
            <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {UPLOADABLE_TYPES.map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">대상</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value as typeof subject)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="korean">한국인 측</option>
              <option value="partner">외국인 측</option>
              <option value="both">양측</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">발급일</label>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">미입력 시 유효기간 자동계산 불가</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              만료일 (선택 - 미입력 시 서류 유형별 기본값 적용)
            </label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">파일</label>
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">취소</button>
          <button onClick={handleUpload} disabled={submitting} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? '업로드 중…' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}
