import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { NavGroup, NavGroupId, NavItem } from '../../app/nav-model';

interface NavAccordionGroupProps {
  group: NavGroup;
  expanded: boolean;
  onToggle: (id: NavGroupId) => void;
  searchFor: (to: string) => string;
  onNavigate: () => void;
  onAction: (action: 'about') => void;
}

const itemLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent-subtle font-semibold text-accent'
      : 'text-ink-secondary hover:bg-surface-inset hover:text-ink-primary',
  ].join(' ');

function GroupItems({
  group,
  searchFor,
  onNavigate,
  onAction,
}: Pick<
  NavAccordionGroupProps,
  'group' | 'searchFor' | 'onNavigate' | 'onAction'
>) {
  return (
    <div id={`nav-group-${group.id}`} className="flex flex-col gap-0.5 pb-2">
      {group.items.map((item: NavItem) =>
        item.kind === 'link' ? (
          <NavLink
            key={item.to}
            to={{ pathname: item.to, search: searchFor(item.to) }}
            end={item.end}
            className={itemLinkClass}
            onClick={onNavigate}
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ) : (
          <button
            key={item.action}
            type="button"
            className="flex items-center gap-3 rounded-md px-4 py-2 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-inset hover:text-ink-primary"
            onClick={() => onAction(item.action)}
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

export function NavAccordionGroup({
  group,
  expanded,
  onToggle,
  searchFor,
  onNavigate,
  onAction,
}: NavAccordionGroupProps) {
  if (group.fixed) {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold tracking-wide text-ink-tertiary uppercase">
          <group.icon size={16} strokeWidth={2} />
          <span>{group.label}</span>
        </div>
        <GroupItems
          group={group}
          searchFor={searchFor}
          onNavigate={onNavigate}
          onAction={onAction}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-sm font-semibold text-ink-primary transition-colors hover:bg-surface-inset"
        aria-expanded={expanded}
        aria-controls={`nav-group-${group.id}`}
        onClick={() => onToggle(group.id)}
      >
        <group.icon size={18} strokeWidth={2} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={[
            'transition-transform',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      {expanded && (
        <GroupItems
          group={group}
          searchFor={searchFor}
          onNavigate={onNavigate}
          onAction={onAction}
        />
      )}
    </div>
  );
}
