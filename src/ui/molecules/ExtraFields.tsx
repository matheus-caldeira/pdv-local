import { getBusinessType } from '../../domain/business-type/registry';
import {
  declaredKeys,
  splitExtra,
} from '../../domain/business-type/business-type.rules';
import { t } from '../i18n/t';
import { FormField } from './FormField';
import { TextField } from './TextField';
import { Select } from './Select';

interface ExtraFieldsProps {
  businessTypeId: string;
  scope: 'business' | 'customer';
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function ExtraFields({
  businessTypeId,
  scope,
  value,
  onChange,
}: ExtraFieldsProps) {
  const def = getBusinessType(businessTypeId);
  if (!def) {
    return null;
  }

  const declared = declaredKeys(def, scope);
  const { inline, orphans } = splitExtra(value, declared);
  const fieldByKey = new Map(
    def.fields[scope].map((field) => [field.key, field]),
  );

  const handleChange = (key: string, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="flex flex-col gap-3">
      {inline.map(({ key, value: fieldValue }) => {
        const fieldDef = fieldByKey.get(key);
        const label = t(`field.${key}`, businessTypeId);
        return (
          <FormField key={key} label={label}>
            {fieldDef?.kind === 'select' ? (
              <Select
                value={fieldValue}
                onChange={(e) => handleChange(key, e.target.value)}
              >
                <option value="" />
                {fieldDef.options?.map((option) => (
                  <option key={option} value={option}>
                    {t(`field.${key}.${option}`, businessTypeId)}
                  </option>
                ))}
              </Select>
            ) : (
              <TextField
                value={fieldValue}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            )}
          </FormField>
        );
      })}
      {orphans.length > 0 && (
        <details className="rounded-sm border border-border-emphasis bg-surface-inset p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-secondary">
            Ver outras informações
          </summary>
          <dl className="mt-2 flex flex-col gap-1">
            {orphans.map(({ key, value: orphanValue }) => (
              <div key={key} className="flex justify-between gap-2 text-sm">
                <dt className="text-ink-tertiary">{key}</dt>
                <dd className="text-ink-primary">{orphanValue}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
