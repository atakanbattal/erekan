export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-arc-2 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-arc-1 disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-ink-4 bg-ink-2 px-5 py-2.5 text-sm font-semibold text-bone transition-colors hover:bg-ink-3 disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimarySm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-arc-2 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-arc-1 disabled:opacity-50';

export const btnSecondarySm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-4 bg-ink-2 px-3 py-1.5 text-xs font-semibold text-bone transition-colors hover:bg-ink-3 disabled:opacity-50';

export const metaBox =
  'flex items-start gap-3 rounded-lg border border-ink-4 bg-ink-2 p-3.5 min-w-0';

export const rowCard =
  'flex flex-col gap-3 rounded-lg border border-ink-4 bg-ink-0 p-4 sm:flex-row sm:items-center sm:justify-between';

export function filterTabClass(active: boolean) {
  return [
    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
    active
      ? 'border-arc-2 bg-arc-2/10 text-arc-2'
      : 'border-ink-4 bg-ink-1 text-steel-2 hover:border-ink-5 hover:text-bone',
  ].join(' ');
}

export const listLink =
  'flex w-full items-center justify-between gap-3 rounded-lg px-1 py-3 -mx-1 no-underline text-inherit transition-colors hover:bg-ink-2';

export const partCard =
  'flex flex-col rounded-xl border border-ink-4 bg-ink-0 p-4 min-w-0';

export const assetCardLink =
  'flex flex-col rounded-xl border border-ink-4 bg-ink-0 p-5 no-underline text-inherit transition-all hover:-translate-y-0.5 hover:shadow-md min-h-full';

export const actionLinkPrimary =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-arc-2 px-4 py-3 text-center text-sm font-semibold leading-snug text-white no-underline transition-colors hover:bg-arc-1 sm:w-auto sm:min-w-[10.5rem]';

export const actionLinkSecondary =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink-4 bg-ink-2 px-4 py-3 text-center text-sm font-semibold leading-snug text-bone no-underline transition-colors hover:bg-ink-3 sm:w-auto sm:min-w-[10.5rem]';

export const statTile =
  'flex flex-col gap-1 rounded-lg border border-ink-4 bg-ink-2 p-4 min-w-0';

export const sectionCard = 'card p-6';

export const detailGrid =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';

export const specRow =
  'flex flex-col gap-0.5 border-b border-ink-4 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4';

export const specLabel = 'text-xs font-semibold uppercase tracking-wide text-steel-2 shrink-0';

export const specValue = 'text-sm font-medium text-bone break-words';
