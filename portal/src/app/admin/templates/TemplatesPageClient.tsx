'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { OrderTemplate } from '@/lib/portal/types-ext';

interface TemplatesPageClientProps {
  templates: OrderTemplate[];
}

interface TemplateForm {
  name: string;
  title_template: string;
  material: string;
  standard: string;
  description: string;
}

const emptyForm: TemplateForm = {
  name: '',
  title_template: '',
  material: '',
  standard: '',
  description: '',
};

export function TemplatesPageClient({ templates }: TemplatesPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function startEdit(template: OrderTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      title_template: template.title_template,
      material: template.material ?? '',
      standard: template.standard ?? '',
      description: template.description ?? '',
    });
    setShowForm(true);
    setError('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.title_template.trim()) return;

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      title_template: form.title_template.trim(),
      material: form.material.trim() || null,
      standard: form.standard.trim() || null,
      description: form.description.trim() || null,
    };

    const { error: saveError } = editingId
      ? await supabase.from('order_templates').update(payload).eq('id', editingId)
      : await supabase.from('order_templates').insert(payload);

    setSaving(false);

    if (saveError) {
      setError(t('templatesPage.saveError', { message: saveError.message }));
      return;
    }

    cancelForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('templatesPage.confirmDelete'))) return;

    const { error: deleteError } = await supabase.from('order_templates').delete().eq('id', id);
    if (deleteError) {
      setError(t('templatesPage.saveError', { message: deleteError.message }));
      return;
    }

    if (editingId === id) cancelForm();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className="btn-primary flex items-center gap-2" onClick={startCreate}>
          <Plus size={16} />
          {t('templatesPage.add')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <h2 className="font-bold text-bone">
            {editingId ? t('templatesPage.edit') : t('templatesPage.add')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('templatesPage.name')}</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">{t('templatesPage.titleTemplate')}</label>
              <input
                className="input"
                value={form.title_template}
                onChange={(e) => setForm({ ...form, title_template: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">{t('templatesPage.material')}</label>
              <input
                className="input"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('templatesPage.standard')}</label>
              <input
                className="input"
                value={form.standard}
                onChange={(e) => setForm({ ...form, standard: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">{t('templatesPage.description')}</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('templatesPage.saving') : t('templatesPage.save')}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelForm}>
              {t('templatesPage.cancel')}
            </button>
          </div>
        </form>
      )}

      {error && !showForm && <p className="text-sm text-danger">{error}</p>}

      {templates.length === 0 ? (
        <div className="portal-empty-state">{t('templatesPage.empty')}</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-left text-steel-2">
                  <th className="px-4 py-3 font-medium">{t('templatesPage.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('templatesPage.titleTemplate')}</th>
                  <th className="px-4 py-3 font-medium">{t('templatesPage.material')}</th>
                  <th className="px-4 py-3 font-medium">{t('templatesPage.standard')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('common.edit')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-ink-4/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-bone">{template.name}</td>
                    <td className="px-4 py-3 text-steel-2">{template.title_template}</td>
                    <td className="px-4 py-3 text-steel-2">{template.material ?? '—'}</td>
                    <td className="px-4 py-3 text-steel-2">{template.standard ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs p-2"
                          onClick={() => startEdit(template)}
                          aria-label={t('templatesPage.edit')}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs p-2 text-danger"
                          onClick={() => handleDelete(template.id)}
                          aria-label={t('templatesPage.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
