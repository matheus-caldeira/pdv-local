import { useLocation } from 'react-router-dom';
import { AppShell } from '../ui/templates/AppShell';
import { useModules } from './modules-context';
import { useSession } from '../ui/hooks/useSession';
import { useStatusControl } from '../ui/hooks/useStatusControl';
import { buildNavModel, resolveActiveGroup } from './nav-model';

export function AppShellRoute() {
  const location = useLocation();
  const { modules } = useModules();
  const { activeSession } = useSession();
  const statusControl = useStatusControl(location.pathname);

  const model = buildNavModel(modules, statusControl);
  const activeGroup = resolveActiveGroup(location.pathname, model);

  return (
    <AppShell
      model={model}
      activeGroupId={activeGroup.id}
      bottomBar={activeGroup.bar}
      activeSession={activeSession}
    />
  );
}
