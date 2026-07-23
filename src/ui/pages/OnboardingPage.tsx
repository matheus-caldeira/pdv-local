import { useState } from 'react';
import { PiggyBank, ShoppingCart, Store } from 'lucide-react';
import { container } from '../../app/container';
import { useModules } from '../../app/modules-context';
import { fold } from '../../domain/shared/either';
import { businessTypeIds } from '../../domain/business-type/registry';
import { t } from '../i18n/t';
import { useToast } from '../molecules/toast-context';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

type Choice = 'pdv' | 'finance' | 'both';

const CHOICES: {
  id: Choice;
  icon: typeof Store;
  title: string;
  description: string;
}[] = [
  {
    id: 'pdv',
    icon: ShoppingCart,
    title: 'Ponto de Venda',
    description: 'Vendas, caixa, pedidos e produtos.',
  },
  {
    id: 'finance',
    icon: PiggyBank,
    title: 'Financeiro',
    description: 'Lançamentos, orçamento e fechamentos do mês.',
  },
  {
    id: 'both',
    icon: Store,
    title: 'Os dois',
    description: 'Vendas no balcão e controle financeiro juntos.',
  },
];

const toModules = (choice: Choice): string[] =>
  choice === 'both' ? ['pdv', 'finance'] : [choice];

export function OnboardingPage() {
  const toast = useToast();
  const { refresh } = useModules();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [saving, setSaving] = useState(false);

  const complete = async (modules: string[], businessTypeId?: string) => {
    setSaving(true);
    const result = await container.completeFirstRun(
      businessTypeId ? { modules, businessTypeId } : { modules },
    );
    await fold(
      result,
      async (error) => {
        toast(error.message, 'error');
        setSaving(false);
      },
      async () => {
        await refresh();
      },
    );
  };

  const pickChoice = (picked: Choice) => {
    if (picked === 'finance') {
      complete(toModules(picked));
      return;
    }
    setChoice(picked);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface-1 p-6">
      <img
        src={LOGO_URL}
        alt="Meu Bolso"
        className="h-16 w-16 object-contain"
      />
      {choice === null ? (
        <>
          <h1 className="text-center text-2xl font-bold">
            O que você quer usar?
          </h1>
          <div className="flex w-full max-w-[720px] flex-col gap-4 md:flex-row">
            {CHOICES.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={saving}
                className="flex flex-1 flex-col items-center gap-3 rounded-lg border border-border bg-surface-2 p-6 text-center transition-colors hover:border-accent"
                onClick={() => pickChoice(option.id)}
              >
                <option.icon
                  size={32}
                  strokeWidth={2}
                  className="text-accent"
                />
                <span className="text-lg font-semibold">{option.title}</span>
                <span className="text-sm text-ink-tertiary">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-tertiary">
            Dá para mudar depois em Configurações.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-center text-2xl font-bold">
            Qual é o seu tipo de negócio?
          </h1>
          <div className="flex w-full max-w-[720px] flex-col gap-4 md:flex-row">
            {businessTypeIds.map((id) => (
              <button
                key={id}
                type="button"
                disabled={saving}
                className="flex flex-1 flex-col items-center gap-3 rounded-lg border border-border bg-surface-2 p-6 text-center transition-colors hover:border-accent"
                onClick={() => complete(toModules(choice), id)}
              >
                <span className="text-lg font-semibold">
                  {t(`businessType.${id}`)}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-sm text-ink-tertiary underline"
            onClick={() => setChoice(null)}
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
}
