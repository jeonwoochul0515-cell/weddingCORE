// 매칭 관리 — 짝을 짓고, 만날 약속을 잡고, 일정을 본다
//
// 화면을 둘로 나눈 이유. 하는 일이 다르다.
//   「일정」은 오늘 무엇을 해야 하나를 본다. 매일 연다.
//   「매칭」은 누구와 누구를 붙였나를 본다. 새 짝을 지을 때만 연다.
// 한 화면에 섞어 두면 매일 보는 것이 가끔 보는 것에 밀린다.
//
// ★ 「맞선 만들기」는 탭 밖에 둔다. 탭 안에 넣었더니 기본 화면(일정)에서는
//    보이지 않아 「맞선 만들기가 없더라」는 말을 들었다. 이 화면에서 가장 먼저
//    하는 일을 한 번 더 눌러야 찾을 수 있게 두면 안 된다.

import { useState } from 'react';
import { CalendarDays, Heart, Plus } from 'lucide-react';
import MatchHistory from '@/features/matching/MatchHistory';
import ScheduleBoard from '@/features/matching/ScheduleBoard';
import CreateMatchDialog from '@/features/matching/CreateMatchDialog';

type Tab = 'schedule' | 'matches';

const TABS: Array<{ key: Tab; label: string; icon: typeof Heart; hint: string }> = [
  { key: 'schedule', label: '일정', icon: CalendarDays, hint: '잡아 둔 약속과 다음에 할 일' },
  { key: 'matches', label: '매칭', icon: Heart, hint: '짝지은 기록과 결과' },
];

export default function MatchingPage() {
  const [tab, setTab] = useState<Tab>('schedule');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-rose-500" />
            <h1 className="text-2xl font-semibold text-slate-900">매칭 관리</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            짝을 짓고, 화상이든 직접 만남이든 약속을 잡아 일정으로 관리합니다.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="primary-button shrink-0">
          <Plus size={16} />맞선 만들기
        </button>
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon, hint }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            title={hint}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold ${
              tab === key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? (
        <ScheduleBoard onCreateMatch={() => setCreating(true)} />
      ) : (
        <MatchHistory />
      )}

      {creating && (
        <CreateMatchDialog
          partnerId=""
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            // 만든 뒤에는 짝지은 결과를 보여 준다. 방금 한 일의 결과가 눈에 보여야 한다.
            setTab('matches');
          }}
        />
      )}
    </div>
  );
}
