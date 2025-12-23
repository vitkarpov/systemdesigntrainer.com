import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'unsaved';
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const configs = {
    saved: {
      icon: Check,
      text: 'Saved',
      className: 'text-green-600 dark:text-green-500',
      iconClassName: '',
    },
    saving: {
      icon: Loader2,
      text: 'Saving...',
      className: 'text-blue-600 dark:text-blue-500',
      iconClassName: 'animate-spin',
    },
    unsaved: {
      icon: AlertCircle,
      text: 'Unsaved',
      className: 'text-orange-600 dark:text-orange-500',
      iconClassName: '',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconClassName}`} />
      <span>{config.text}</span>
    </div>
  );
}
