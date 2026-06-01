'use client';

import { useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileCheck,
  FileText,
  Loader2,
  MessageSquare,
  PackageCheck,
  ScanSearch,
  Truck,
  Workflow,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { NOTIFICATION_TYPES_FOR_PREFS } from '@/lib/portal/notification-prefs';
import type { NotificationPreference } from '@/lib/portal/types-ext';
import type { NotificationType } from '@/lib/stages';

interface NotificationPreferencesPanelProps {
  initialPrefs: NotificationPreference[];
}

const NOTIFICATION_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  stage_changed: Workflow,
  document_uploaded: FileText,
  quote_ready: FileCheck,
  shipment_updated: Truck,
  ndt_result: ScanSearch,
  delivery_overdue: CalendarClock,
  message_reply: MessageSquare,
  rfq_approved: CheckCircle2,
  rfq_rejected: XCircle,
  delivery_confirmed: PackageCheck,
};

function PrefToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="pref-toggle" title={label}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="pref-toggle-track" aria-hidden="true">
        <span className="pref-toggle-thumb" />
      </span>
      <span className="pref-toggle-label">{label}</span>
    </label>
  );
}

export function NotificationPreferencesPanel({ initialPrefs }: NotificationPreferencesPanelProps) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function getPref(type: string) {
    return prefs.find((p) => p.notification_type === type);
  }

  async function toggle(type: string, field: 'email_enabled' | 'in_app_enabled', value: boolean) {
    setSaving(type);
    setSaved(null);

    const res = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationType: type, [field]: value }),
    });

    if (res.ok) {
      const data = await res.json();
      setPrefs((prev) => {
        const idx = prev.findIndex((p) => p.notification_type === type);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.preference;
          return next;
        }
        return [...prev, data.preference];
      });
      setSaved(type);
      window.setTimeout(() => setSaved((current) => (current === type ? null : current)), 2000);
    }
    setSaving(null);
  }

  return (
    <div className="card p-6 notification-prefs">
      <div className="notification-prefs-header">
        <div className="notification-prefs-header-icon">
          <Bell size={18} />
        </div>
        <div>
          <h2 className="font-bold text-bone">{t('settingsPage.notificationPrefs')}</h2>
          <p className="text-sm text-steel-2 mt-1">{t('settingsPage.notificationPrefsDesc')}</p>
        </div>
      </div>

      <div className="notification-prefs-table-wrap">
        <table className="notification-prefs-table">
          <thead>
            <tr>
              <th className="notification-prefs-th notification-prefs-th--event">
                {t('settingsPage.prefEvent')}
              </th>
              <th className="notification-prefs-th notification-prefs-th--channel">
                {t('settingsPage.inApp')}
              </th>
              <th className="notification-prefs-th notification-prefs-th--channel">
                {t('settingsPage.notifyEmail')}
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_TYPES_FOR_PREFS.map((type) => {
              const pref = getPref(type);
              const emailOn = pref?.email_enabled ?? true;
              const inAppOn = pref?.in_app_enabled ?? true;
              const isSaving = saving === type;
              const isSaved = saved === type;
              const Icon = NOTIFICATION_ICONS[type] ?? Bell;

              return (
                <tr key={type} className="notification-prefs-row">
                  <td className="notification-prefs-td notification-prefs-td--event">
                    <div className="notification-pref-event">
                      <div className="notification-pref-event-icon">
                        <Icon size={16} />
                      </div>
                      <div className="notification-pref-event-text">
                        <span className="notification-pref-event-label">
                          {t(`notificationTypes.${type}`)}
                        </span>
                        {isSaving && (
                          <span className="notification-pref-status notification-pref-status--saving">
                            <Loader2 size={12} className="animate-spin" />
                            {t('settingsPage.prefsSaving')}
                          </span>
                        )}
                        {!isSaving && isSaved && (
                          <span className="notification-pref-status notification-pref-status--saved">
                            {t('settingsPage.prefsSaved')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="notification-prefs-td notification-prefs-td--channel">
                    <PrefToggle
                      checked={inAppOn}
                      disabled={isSaving}
                      label={t('settingsPage.inApp')}
                      onChange={(value) => toggle(type, 'in_app_enabled', value)}
                    />
                  </td>
                  <td className="notification-prefs-td notification-prefs-td--channel">
                    <PrefToggle
                      checked={emailOn}
                      disabled={isSaving}
                      label={t('settingsPage.notifyEmail')}
                      onChange={(value) => toggle(type, 'email_enabled', value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="notification-prefs-mobile">
        {NOTIFICATION_TYPES_FOR_PREFS.map((type) => {
          const pref = getPref(type);
          const emailOn = pref?.email_enabled ?? true;
          const inAppOn = pref?.in_app_enabled ?? true;
          const isSaving = saving === type;
          const isSaved = saved === type;
          const Icon = NOTIFICATION_ICONS[type] ?? Bell;

          return (
            <div key={type} className="notification-pref-card">
              <div className="notification-pref-card-head">
                <div className="notification-pref-event-icon">
                  <Icon size={16} />
                </div>
                <div className="notification-pref-event-text">
                  <span className="notification-pref-event-label">
                    {t(`notificationTypes.${type}`)}
                  </span>
                  {isSaving && (
                    <span className="notification-pref-status notification-pref-status--saving">
                      <Loader2 size={12} className="animate-spin" />
                      {t('settingsPage.prefsSaving')}
                    </span>
                  )}
                  {!isSaving && isSaved && (
                    <span className="notification-pref-status notification-pref-status--saved">
                      {t('settingsPage.prefsSaved')}
                    </span>
                  )}
                </div>
              </div>
              <div className="notification-pref-card-toggles">
                <PrefToggle
                  checked={inAppOn}
                  disabled={isSaving}
                  label={t('settingsPage.inApp')}
                  onChange={(value) => toggle(type, 'in_app_enabled', value)}
                />
                <PrefToggle
                  checked={emailOn}
                  disabled={isSaving}
                  label={t('settingsPage.notifyEmail')}
                  onChange={(value) => toggle(type, 'email_enabled', value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
