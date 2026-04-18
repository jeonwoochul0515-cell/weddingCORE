import { useState } from 'react';
import { BG_INFO_FIELDS, type FieldKey } from './fields';

type Values = Partial<Record<FieldKey, string | number>>;

type Props = {
  initial?: Values;
  onSave: (values: Values) => Promise<void>;
  disabled?: boolean;
};

export default function BackgroundInfoForm({ initial, onSave, disabled }: Props) {
  const [values, setValues] = useState<Values>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: FieldKey, v: string | number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const completeCount = BG_INFO_FIELDS.filter(
    (f) => values[f.key] !== undefined && String(values[f.key]).trim() !== '',
  ).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>필수 항목 {completeCount}/{BG_INFO_FIELDS.length}</span>
        <span>결혼중개업법 §10의2</span>
      </div>

      <div className="space-y-4">
        {BG_INFO_FIELDS.map((f) => (
          <div key={f.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900">
                  {f.labels.ko}
                  {f.required && <span className="ml-1 text-red-500">*</span>}
                </label>
                <p className="text-xs text-slate-500">{f.descriptions.ko}</p>
              </div>
              <span className="text-xs text-slate-400">{f.legalBasis}</span>
            </div>
            {f.inputType === 'textarea' && (
              <textarea
                disabled={disabled}
                rows={2}
                value={(values[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            {f.inputType === 'text' && (
              <input
                disabled={disabled}
                value={(values[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            {f.inputType === 'number' && (
              <input
                disabled={disabled}
                type="number"
                value={(values[f.key] as number) ?? ''}
                onChange={(e) => set(f.key, Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || disabled}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
