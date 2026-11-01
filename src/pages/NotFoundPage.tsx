import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export default function NotFoundPage() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          The security monitoring view you requested does not exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Overview
          </Button>
        </Link>
      </Card>
    </div>
  );
}
