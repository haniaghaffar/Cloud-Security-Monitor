import { AlertCircle, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Monitored Cloud Infrastructure' }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Azure Resource Inventory
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Resource inventory and monitoring status must come from the backend, not frontend placeholders.
        </p>
      </div>

      <Card padding="lg" className="max-w-2xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Resource inventory is not available</h2>
            <p className="text-sm text-slate-600 mt-1">
              The frontend has no confirmed backend endpoint or response contract for monitored Azure resources.
              No resource names, identifiers, or connection statuses are assumed.
            </p>
            <Link to="/settings" className="inline-flex mt-4">
              <Button variant="outline" size="sm" leftIcon={<Link2 className="w-4 h-4" />}>
                View integration configuration
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
