import { useFinanceAutomations } from '../../hooks/useFinanceAutomations';
import { FinanceRecurrenceSection } from '../../organisms/finance/FinanceRecurrenceSection';
import { FinanceInstallmentSection } from '../../organisms/finance/FinanceInstallmentSection';
import { FinanceFormulaSection } from '../../organisms/finance/FinanceFormulaSection';

export function FinanceAutomationsPage() {
  const automations = useFinanceAutomations();

  return (
    <section className="flex max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Automações</h1>
      {automations.loading ? (
        <p className="text-sm text-ink-tertiary">Carregando automações…</p>
      ) : (
        <>
          <FinanceRecurrenceSection
            recurrences={automations.recurrences}
            categories={automations.categories}
            members={automations.members}
            currentMonth={automations.currentMonth}
            onSave={automations.saveRecurrence}
            onDelete={automations.deleteRecurrence}
            onLaunch={automations.launchRecurrence}
            onLaunchAll={automations.launchAllRecurrences}
          />
          <FinanceInstallmentSection
            plans={automations.plans}
            categories={automations.categories}
            members={automations.members}
            currentMonth={automations.currentMonth}
            onPreview={automations.previewInstallments}
            onCreate={automations.createInstallmentPlan}
            onDelete={automations.deleteInstallmentPlan}
          />
          <FinanceFormulaSection
            formulas={automations.formulas}
            categories={automations.categories}
            members={automations.members}
            currentMonth={automations.currentMonth}
            onSave={automations.saveFormula}
            onDelete={automations.deleteFormula}
            onPreview={automations.previewFormula}
            onGenerate={automations.generateFormulaEntry}
          />
        </>
      )}
    </section>
  );
}
