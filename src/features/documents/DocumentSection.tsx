// 고객 서류 목록·업로드·삭제 — 유효기간 상태를 함께 보여 준다
import { useState } from 'react';
import { FileText, Upload, ExternalLink, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { deleteClientDocument, useClientDocuments, uploadClientDocument, type DocumentListItem } from './useClientDocuments';
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
          <Upload size={14} />올리기
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          아직 올린 서류가 없습니다. 위 「올리기」로 사진이나 PDF를 올리세요.
        </p>
      )}

      <div className="space-y-2">
        {items.map((docItem) => (
          <DocumentRow key={docItem.id} doc={docItem} clientId={clientId} agencyId={user?.agencyId ?? null} />
        ))}
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

function DocumentRow({ doc, clientId, agencyId }: { doc: DocumentListItem; clientId: string; agencyId: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validUntil = doc.validUntil?.toDate() ?? null;
  const status = validityStatus(validUntil);

  async function remove() {
    if (!agencyId) return;
    setBusy(true);
    setError(null);
    try {
      await deleteClientDocument({
        agencyId,
        clientId,
        documentId: doc.id,
        storagePath: doc.storagePath ?? null,
        storageUrl: doc.storageUrl,
      });
    } catch (err) {
      setError(`지우지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(err as Error).message})`);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <FileText size={18} className="mt-1 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">
              {DOC_TYPE_LABEL[doc.type]}
              <span className="ml-2 text-xs text-slate-500">
                ({doc.subject === 'korean' ? '한국' : doc.subject === 'partner' ? '외국' : '양측'})
              </span>
            </div>
            <div className="truncate text-xs text-slate-500">{doc.fileName}</div>
            {doc.issuedAt && (
              <div className="text-xs text-slate-400">
                발급 {doc.issuedAt.toDate().toLocaleDateString('ko-KR')}
                {validUntil && ` · 만료 ${validUntil.toLocaleDateString('ko-KR')}`}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_BADGE[status.level]}`}>
            {status.label}
          </span>
          <a
            href={doc.storageUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="새 창에서 열기"
            title="새 창에서 열기"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ExternalLink size={14} />
          </a>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="이 서류 지우기"
              title="이 서류 지우기"
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
          <span>이 서류를 지울까요? 파일도 함께 지워지고 되돌릴 수 없습니다.</span>
          <span className="flex gap-1.5">
            <button type="button" disabled={busy} onClick={remove} className="rounded-md bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? '지우는 중…' : '지우기'}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-md border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100">취소</button>
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
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
    if (!file) { setError('파일을 골라 주세요.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('파일이 20MB를 넘습니다. 사진이면 크기를 줄여 다시 올려 주세요.'); return; }
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
      setError(`올리지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요. (${(err as Error).message})`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">서류 올리기</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">서류 종류</label>
            <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {UPLOADABLE_TYPES.map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">누구 서류인가</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value as typeof subject)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="korean">한국인 측</option>
              <option value="partner">외국인 측</option>
              <option value="both">양측</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">발급일</label>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">적으면 서류 종류에 따라 만료일을 계산해 미리 알려 드립니다.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">만료일 (선택)</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">비워 두면 서류 종류별 기본 기간으로 계산합니다.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">파일 (사진 또는 PDF, 20MB까지)</label>
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">취소</button>
          <button onClick={handleUpload} disabled={submitting} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? '올리는 중…' : '올리기'}
          </button>
        </div>
      </div>
    </div>
  );
}
