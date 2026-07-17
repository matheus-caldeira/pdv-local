import { Money } from '../../atoms/Money';
import type { MemberInvolvement } from '../../../application/finance/dashboard.usecases';

interface FinanceMemberInvolvementProps {
  involvement: MemberInvolvement[];
}

export function FinanceMemberInvolvement({
  involvement,
}: FinanceMemberInvolvementProps) {
  if (involvement.length === 0) return null;

  return (
    <section
      aria-label="Envolvimento por membro"
      className="flex flex-col gap-2"
    >
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
        Envolvimento por membro
      </h3>
      <ul className="flex flex-col gap-2">
        {involvement.map((member) => (
          <li
            key={member.memberUid}
            className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-semibold text-ink-primary">
                {member.name}
              </span>
              <span className="text-xs text-ink-tertiary">
                <Money value={member.total} />{' '}
                <span className="font-mono tabular-nums">
                  ({Math.round(member.percent)}%)
                </span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={member.name}
              aria-valuenow={Math.round(member.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-surface-inset"
            >
              <div
                className="h-full rounded-full bg-info"
                style={{ width: `${Math.min(member.percent, 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
