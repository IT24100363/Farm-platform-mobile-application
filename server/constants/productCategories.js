export const PRODUCT_CATEGORIES = [
  'Fresh Vegetables',
  'Seasonal Fruits',
  'Dairy & Eggs',
  'Organic Staples',
  'Spices',
  'Processed Foods'
];

const CATEGORY_ALIASES = {
  'Fresh Vegetables': ['vegetables', 'vegetable', 'fresh vegetables'],
  'Seasonal Fruits': ['fruits', 'fruit', 'seasonal fruits'],
  'Dairy & Eggs': ['dairy', 'eggs', 'dairy and eggs', 'dairy & eggs'],
  'Organic Staples': ['organic', 'organic staples'],
  Spices: ['spices', 'spice'],
  'Processed Foods': ['processed', 'processed foods', 'processed food']
};

const canonicalBySlug = PRODUCT_CATEGORIES.reduce((acc, category) => {
  acc[category.toLowerCase()] = category;
  return acc;
}, {});

for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
  for (const alias of aliases) {
    canonicalBySlug[alias.toLowerCase()] = canonical;
  }
}

export const normalizeProductCategory = (value) => {
  if (!value || typeof value !== 'string') return null;
  return canonicalBySlug[value.trim().toLowerCase()] || null;
};

export const getCategoryMatchValues = (value) => {
  const normalized = normalizeProductCategory(value);
  if (!normalized) return [];
  const aliases = CATEGORY_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases]));
};
