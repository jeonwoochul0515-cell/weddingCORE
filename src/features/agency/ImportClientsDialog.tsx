import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { importClients } from './useAgencyClients';
import {
  CLIENT_CSV_TEMPLATE,
  parseClientCsv,
  type ClientCsvResult,
} from './clientCsv';

type Props = {
  existingPhones: string[];
  onClose: () => void;
  onImported: (count: number) => void;
};

function downloadTemplate() {
  const blob = new Blob([`\uFEFF${CLIENT_CSV_TEMPLATE}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'weddingCORE_고객가져오기_양식.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImportClientsDialog({ existingPhones, onClose, onImported }: Props) {
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ClientCsvResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File | null) {
    setResult(null);
    setError(null);
    setFileName(file?.name ?? '');
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('파일이 2MB를 넘습니다. 고객명단을 나누어 올려 주세요.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('엑셀에서 「CSV UTF-8(쉼표로 분리)」 형식으로 저장한 파일을 골라 주세요.');
      return;
    }
    try {
      const parsed = parseClientCsv(await file.text(), existingPhones);
      if (parsed.totalRows > 500) {
        setError('한 번에 500명까지 가져올 수 있습니다. 파일을 나누어 주세요.');
        return;
      }
      setResult(parsed);
    } catch (err) {
      setError(`파일을 읽지 못했습니다. (${(err as Error).message})`);
    }
  }

  async function submit() {
    if (!user?.agencyId || !result || result.rows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const count = await importClients(
        user.agencyId,
        user.uid,
        result.rows.map(({ rowNumber: _rowNumber, ...client }) => client),
      );
      onImported(count);
    } catch (err) {
      setError(`고객을 가져오지 못했습니다. 이미 저장된 고객은 중복으로 다시 올리지 마세요. (${(err as Error).message})`);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FileSpreadsheet size={19} className="text-emerald-700" />엑셀 고객명단 가져오기
            </h2>
            <p className="mt-1 text-xs text-slate-500">엑셀 파일을 CSV UTF-8 형식으로 저장하면 기존 고객을 한 번에 등록할 수 있습니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-slate-100" aria-label="닫기"><X size={18} /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-sm font-semibold text-emerald-950">먼저 양식을 내려받아 작성하세요</div>
                <p className="mt-1 text-xs leading-5 text-emerald-800">필수 열은 이름, 생년월일, 성별, 연락처, 혼인이력입니다. 주소·직업·연소득은 비워도 됩니다.</p>
              </div>
              <button type="button" onClick={downloadTemplate} className="secondary-button shrink-0 !border-emerald-200 !py-2 text-xs text-emerald-900">
                <Download size={14} />양식 내려받기
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30"
          >
            <Upload size={24} className="mb-2 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">{fileName || 'CSV 파일 고르기'}</span>
            <span className="mt-1 text-xs text-slate-500">CSV UTF-8 · 최대 2MB · 한 번에 500명</span>
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => readFile(event.target.files?.[0] ?? null)} />

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Summary label="전체 행" value={result.totalRows} tone="slate" />
                <Summary label="등록 가능" value={result.rows.length} tone="green" />
                <Summary label="확인 필요" value={result.issues.length} tone={result.issues.length ? 'red' : 'slate'} />
              </div>

              {result.rows.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">등록 미리보기 · 최대 10명</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="text-slate-500"><tr><th className="px-4 py-2">행</th><th className="px-4 py-2">이름</th><th className="px-4 py-2">생년월일</th><th className="px-4 py-2">성별</th><th className="px-4 py-2">연락처</th><th className="px-4 py-2">직업</th></tr></thead>
                      <tbody>
                        {result.rows.slice(0, 10).map((row) => (
                          <tr key={row.rowNumber} className="border-t border-slate-100">
                            <td className="px-4 py-2 text-slate-400">{row.rowNumber}</td><td className="px-4 py-2 font-medium text-slate-900">{row.name}</td><td className="px-4 py-2">{row.birthDate.toISOString().slice(0, 10)}</td><td className="px-4 py-2">{row.gender === 'M' ? '남' : '여'}</td><td className="px-4 py-2">{row.phone}</td><td className="px-4 py-2">{row.occupation || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.issues.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-semibold text-red-900">아래 행은 등록에서 제외됩니다</div>
                  <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-red-800">
                    {result.issues.slice(0, 30).map((issue) => <li key={`${issue.rowNumber}-${issue.message}`}>{issue.rowNumber}행 · {issue.message}</li>)}
                    {result.issues.length > 30 && <li>그 밖에 {result.issues.length - 30}행</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="secondary-button">취소</button>
          <button type="button" onClick={submit} disabled={busy || !result || result.rows.length === 0} className="primary-button">
            {busy ? '등록 중…' : result ? `정상 ${result.rows.length}명 가져오기` : '가져오기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'green' | 'red' }) {
  const style = tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`rounded-xl border p-3 text-center ${style}`}><div className="text-xl font-bold">{value}</div><div className="mt-0.5 text-[11px]">{label}</div></div>;
}
