import { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Check, Clock, AlertTriangle, Lock, CircleDot, XCircle, CalendarPlus, Link2 } from 'lucide-react';
import {
  linkEvidence,
  markAnchorEvent,
  useClientTimeline,
  updateTimelineItem,
  type TimelineItemView,
} from './useTimeline';
import { useClientDocuments } from '@/features/documents/useClientDocuments';
import { DOC_TYPE_LABEL } from '@/features/documents/types';
import { useAuthStore } from '@/store/authStore';
import type { AnchorKey } from '@/types/schema';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

const ANCHOR_LABEL: Record<AnchorKey, string> = {
  client_created: '고객 등록',
  contract_signed: '계약 체결일',
  meeting_scheduled: '맞선 예정일',
  marriage_registered: '혼인신고일',
  entry_date: '입국일',
  stay_expiry: '체류만료일',
};

const STATUS_META: Record<
  TimelineItemView['status'],
  { label: string; icon: typeof Check; tone: string }
> = {
  pending:     { label: '대기',     icon: CircleDot,      tone: 'text-slate-400 bg-slate-100' },
  in_progress: { label: '진행중',   icon: Clock,          tone: 'text-blue-600 bg-blue-50' },
  done:        { label: '완료',     icon: Check,          tone: 'text-emerald-600 bg-emerald-50' },
  warning:     { label: '경고',     icon: AlertTriangle,  tone: 'text-amber-600 bg-amber-50' },
  violated:    { label: '위반',     icon: XCircle,        tone: 'text-red-600 bg-red-50' },
  blocked:     { label: '차단',     icon: Lock,           tone: 'text-slate-400 bg-slate-100' },
};

export default function TimelineView({ clientId }: { clientId: string }) {
  const { items, loading } = useClientTimeline(clientId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<number, TimelineItemView[]>();
    for (const item of items) {
      if (!map.has(item.stage)) map.set(item.stage, []);
      map.get(item.stage)!.push(item);
    }
    return map;
  }, [items]);

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.status === 'done').length;
    return Math.round((done / items.length) * 100);
  }, [items]);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        법정의무 목록을 만드는 중입니다. 고객을 방금 등록했다면 몇 초 안에 자동으로 나타납니다. 계속 비어 있으면 화면을 새로고침해 보세요.
      </div>
    );
  }

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">전체 진행률</div>
          <div className="text-2xl font-semibold text-slate-900">{progress}%</div>
        </div>
        <div className="h-2 flex-1 max-w-xs rounded-full bg-slate-100 ml-6">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((stage) => {
          const stageItems = byStage.get(stage) ?? [];
          if (stageItems.length === 0) return null;
          return (
            <div key={stage}>
              <div className="mb-2 text-sm font-semibold text-slate-700">
                [{stage}] {STAGE_LABEL[stage]}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {stageItems.filter((i) => i.status === 'done').length}/{stageItems.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {stageItems.map((item) => (
                  <TimelineRow
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedId(item.id)}
                    selected={selectedId === item.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 항목마다 경고를 붙이면 42번 겁을 준다. 한 번만, 조용히 알린다 */}
      <p className="mt-4 text-[11px] leading-5 text-slate-400">
        기한과 근거 기준은 법률사무소 청송law(담당변호사 김창희)가 검수하는 중이며, 검수 결과에 따라 바뀔 수 있습니다.
      </p>

      {selected && (
        <TimelineDetail
          item={selected}
          clientId={clientId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function TimelineRow({
  item,
  onClick,
  selected,
}: {
  item: TimelineItemView;
  onClick: () => void;
  selected: boolean;
}) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  // 기준일을 아직 안 적은 항목은 기한이 없다. 없는 기한을 지어내 D-일수로 보여 주지 않는다.
  const due = item.dueDate?.toDate() ?? null;
  const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const overdue = daysLeft !== null && daysLeft < 0 && item.status !== 'done';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className={`rounded-md p-1.5 ${meta.tone}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{item.title}</span>
          <span className="text-xs text-slate-400">{item.legalBasis}</span>
        </div>
      </div>
      <div className="text-right text-xs">
        <div className={overdue ? 'font-medium text-red-600' : 'text-slate-500'}>
          {item.status === 'done'
            ? '완료'
            : daysLeft === null
            ? '기한 미정'
            : overdue
            ? `기한 ${-daysLeft}일 경과`
            : `D-${daysLeft}`}
        </div>
      </div>
    </button>
  );
}

function TimelineDetail({
  item,
  clientId,
  onClose,
}: {
  item: TimelineItemView;
  clientId: string;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const { items: documents } = useClientDocuments(clientId);

  const anchor = item.dueDateRule?.anchor;
  const canRecordAnchor = anchor && anchor !== 'client_created';
  const [anchorDate, setAnchorDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  const requiredDocType =
    item.checkRule?.type === 'document_uploaded'
      ? (item.checkRule.params?.docType as string | undefined)
      : undefined;

  async function setStatus(status: TimelineItemView['status']) {
    if (!user?.agencyId) return;
    setSaving(true);
    try {
      await updateTimelineItem(user.agencyId, clientId, item.id, { status, notes }, user.uid);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    if (!user?.agencyId) return;
    setSaving(true);
    try {
      await updateTimelineItem(user.agencyId, clientId, item.id, { notes }, user.uid);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAnchor() {
    if (!user?.agencyId || !anchor) return;
    setSaving(true);
    try {
      await markAnchorEvent({
        agencyId: user.agencyId,
        clientId,
        anchor,
        eventDate: new Date(anchorDate),
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleEvidence(docId: string, on: boolean) {
    if (!user?.agencyId) return;
    setSaving(true);
    try {
      if (on) {
        await linkEvidence(user.agencyId, clientId, item.id,
          { docId, addedAt: Timestamp.now() }, 'add');
      } else {
        const existing = item.evidence.find((e) => e.docId === docId);
        if (existing) {
          await linkEvidence(user.agencyId, clientId, item.id, existing, 'remove');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const linkableDocs = requiredDocType
    ? documents.filter((d) => d.type === requiredDocType)
    : documents;
  const linkedIds = new Set(item.evidence.map((e) => e.docId));

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 p-5">
        <div>
          <div className="text-xs text-slate-500">[{item.stage}단계]</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h3>
          <div className="mt-1 text-xs text-slate-500">{item.legalBasis}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <div className="text-xs font-medium text-slate-500">기한</div>
          <div className="text-sm text-slate-900">
            {item.dueDate
              ? item.dueDate.toDate().toLocaleDateString('ko-KR')
              : `아직 정해지지 않았습니다 — 아래에서 ${anchor ? ANCHOR_LABEL[anchor] : '기준일'}을 적으면 기한이 정해집니다`}
          </div>
          {anchor && (
            <div className="mt-0.5 text-xs text-slate-400">
              기준: {ANCHOR_LABEL[anchor]}
              {typeof item.dueDateRule?.offsetDays === 'number' &&
                ` (${item.dueDateRule.offsetDays >= 0 ? '+' : ''}${item.dueDateRule.offsetDays}일)`}
            </div>
          )}
        </div>

        {canRecordAnchor && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-700">
              <CalendarPlus size={14} />
              이 단계 기준일 기록
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {ANCHOR_LABEL[anchor!]}을 기록하면 연관 항목의 기한이 자동 재계산됩니다.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                onClick={handleMarkAnchor}
                disabled={saving}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
              >
                기록
              </button>
            </div>
          </div>
        )}

        {item.blockedReason && (
          <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">
            {item.blockedReason}
          </div>
        )}

        {item.warningReason && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            {item.warningReason}
          </div>
        )}

        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">상태 변경</div>
          <div className="flex flex-wrap gap-1">
            {(['pending', 'in_progress', 'done', 'warning', 'violated'] as const).map((s) => (
              <button
                key={s}
                disabled={saving || item.status === s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  item.status === s
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">메모</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="진행 상황, 특이사항 등"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
          >
            메모 저장
          </button>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <Link2 size={14} />
            증빙 서류 연결
            {requiredDocType && (
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-600">
                필요: {DOC_TYPE_LABEL[requiredDocType as keyof typeof DOC_TYPE_LABEL] ?? requiredDocType}
              </span>
            )}
          </div>
          {linkableDocs.length === 0 ? (
            <p className="text-xs text-slate-400">
              {requiredDocType
                ? '해당 유형의 업로드된 서류가 없습니다. 오른쪽 서류 섹션에서 업로드하세요.'
                : '업로드된 서류가 없습니다.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {linkableDocs.map((d) => {
                const checked = linkedIds.has(d.id);
                return (
                  <li key={d.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={(e) => toggleEvidence(d.id, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-slate-900">{d.fileName}</div>
                      <div className="text-[10px] text-slate-500">
                        {DOC_TYPE_LABEL[d.type]} · {d.uploadedAt?.toDate?.().toLocaleDateString('ko-KR') ?? ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {requiredDocType && (
            <p className="mt-1 text-[11px] text-slate-400">
              필요 유형 서류를 연결하면 해당 항목이 자동으로 완료 처리됩니다.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
