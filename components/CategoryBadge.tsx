import { Category, CATEGORY_BG, CATEGORY_ICONS } from '@/types/expense';

interface Props {
  category: Category;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  const classes = CATEGORY_BG[category];
  const icon = CATEGORY_ICONS[category];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-medium ${classes} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      }`}
    >
      <span>{icon}</span>
      {category}
    </span>
  );
}
