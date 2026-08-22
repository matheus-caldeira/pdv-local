import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import type { NavGroup, NavGroupId, NavItem } from '../../app/nav-model';

interface NavAccordionGroupProps {
  group: NavGroup;
  expanded: boolean;
  onToggle: (id: NavGroupId) => void;
  searchFor: (to: string) => string;
  onNavigate: () => void;
  onAction: (action: 'about') => void;
  compact?: boolean;
}

const itemLinkClass =
  (compact: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center rounded-md text-sm font-medium transition-colors',
      compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2',
      isActive
        ? 'bg-accent-subtle font-semibold text-accent'
        : 'text-ink-secondary hover:bg-surface-inset hover:text-ink-primary',
    );

function GroupItems({
  group,
  searchFor,
  onNavigate,
  onAction,
  compact = false,
}: Pick<
  NavAccordionGroupProps,
  'group' | 'searchFor' | 'onNavigate' | 'onAction' | 'compact'
>) {
  return (
    <div
      id={`nav-group-${group.id}`}
      className={cn('flex flex-col gap-0.5', compact ? 'pb-1' : 'pb-2')}
    >
      {group.items.map((item: NavItem) =>
        item.kind === 'link' ? (
          <NavLink
            key={item.to}
            to={{ pathname: item.to, search: searchFor(item.to) }}
            end={item.end}
            className={itemLinkClass(compact)}
            title={compact ? item.label : undefined}
            onClick={onNavigate}
          >
            <item.icon size={18} strokeWidth={2} />
            <span className={compact ? 'sr-only' : undefined}>
              {item.label}
            </span>
          </NavLink>
        ) : (
          <button
            key={item.action}
            type="button"
            className={cn(
              'flex items-center rounded-md text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-inset hover:text-ink-primary',
              compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2',
            )}
            title={compact ? item.label : undefined}
            onClick={() => onAction(item.action)}
          >
            <item.icon size={18} strokeWidth={2} />
            <span className={compact ? 'sr-only' : undefined}>
              {item.label}
            </span>
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
  compact = false,
}: NavAccordionGroupProps) {
  if (group.fixed) {
    return (
      <div>
        {!compact && (
          <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold tracking-wide text-ink-tertiary uppercase">
            <group.icon size={16} strokeWidth={2} />
            <span>{group.label}</span>
          </div>
        )}
        <GroupItems
          group={group}
          searchFor={searchFor}
          onNavigate={onNavigate}
          onAction={onAction}
          compact={compact}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center rounded-md text-sm font-semibold text-ink-primary transition-colors hover:bg-surface-inset',
          compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2',
          compact && expanded ? 'bg-surface-inset' : '',
        )}
        aria-expanded={expanded}
        aria-controls={`nav-group-${group.id}`}
        title={compact ? group.label : undefined}
        onClick={() => onToggle(group.id)}
      >
        <group.icon size={18} strokeWidth={2} />
        <span className={compact ? 'sr-only' : 'flex-1 text-left'}>
          {group.label}
        </span>
        {!compact && (
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={cn('transition-transform', expanded ? 'rotate-180' : '')}
          />
        )}
      </button>
      {expanded && (
        <GroupItems
          group={group}
          searchFor={searchFor}
          onNavigate={onNavigate}
          onAction={onAction}
          compact={compact}
        />
      )}
    </div>
  );
}
