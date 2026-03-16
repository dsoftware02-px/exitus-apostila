export type LayoutId = 'sem-layout' | 'arco-iris' | 'floresta-aventura' | 'oceano-magico' | 'jardim-encantado' | 'doces-pastel';

export interface LayoutOption {
  id: LayoutId;
  name: string;
  file?: string;
}

export const DEFAULT_LAYOUT_ID: LayoutId = 'sem-layout';

// Standard page margins (mm) - used across all layout modes for consistency
export const STANDARD_MARGINS = {
  top: 18,
  right: 18,
  bottom: 20,
  left: 18,
} as const;

// For templates: outer decoration padding + inner content padding = STANDARD_MARGINS
export const TEMPLATE_OUTER_PADDING = 7; // mm - decoration border area
export const TEMPLATE_INNER_PADDING = {
  top: STANDARD_MARGINS.top - TEMPLATE_OUTER_PADDING,    // 11mm
  right: STANDARD_MARGINS.right - TEMPLATE_OUTER_PADDING, // 11mm
  bottom: STANDARD_MARGINS.bottom - TEMPLATE_OUTER_PADDING, // 13mm
  left: STANDARD_MARGINS.left - TEMPLATE_OUTER_PADDING,   // 11mm
} as const;

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'sem-layout',
    name: 'Sem layout'
  },
  {
    id: 'arco-iris',
    name: 'Arco-íris Encantado',
    file: '/layouts/arco-iris.html'
  },
  {
    id: 'floresta-aventura',
    name: 'Floresta Aventura',
    file: '/layouts/floresta-aventura.html'
  },
  {
    id: 'jardim-encantado',
    name: 'Jardim Encantado',
    file: '/layouts/jardim-encantado.html'
  },
  {
    id: 'doces-pastel',
    name: 'Doces & Pastel',
    file: '/layouts/doces-pastel.html'
  }
];

export function isLayoutId(value?: string | null): value is LayoutId {
  return LAYOUT_OPTIONS.some(layout => layout.id === value);
}

export function resolveLayoutId(value?: string | null): LayoutId {
  return isLayoutId(value) ? value : DEFAULT_LAYOUT_ID;
}

export function getLayoutFile(layoutId?: string | null): string | null {
  const resolved = resolveLayoutId(layoutId);
  return LAYOUT_OPTIONS.find(layout => layout.id === resolved)?.file ?? null;
}

export function hasLayoutTemplate(layoutId?: string | null): boolean {
  return Boolean(getLayoutFile(layoutId));
}
