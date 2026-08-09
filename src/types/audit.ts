export interface SettingsAuditLog {
  id: string;
  field_changed: string;
  old_value: number | string;
  new_value: number | string;
  changed_at: string;
  changed_by: string;
  reason?: string;
}
