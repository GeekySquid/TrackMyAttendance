import { LucideIcon } from 'lucide-react';

interface GenericPageProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

export default function GenericPage({ title, subtitle, Icon }: GenericPageProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title} Module</h3>
        <p className="text-sm text-gray-500 max-w-md">
          This section is currently under construction. The {title.toLowerCase()} features will be available in the next update.
        </p>
      </div>
    </div>
  );
}
