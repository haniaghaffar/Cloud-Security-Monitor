import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '../../types';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 mb-3">
      <ol className="flex items-center space-x-1.5 list-none p-0 m-0">
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
              {isLast || !item.path ? (
                <span className="font-medium text-slate-800" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-slate-800 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
