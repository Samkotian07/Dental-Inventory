import { useState } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { NOTIFICATION_TYPES } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';
import { cn } from '../../utils/helpers';
import * as Icons from 'lucide-react';

const COLOR_MAP = {
  warning: 'bg-warning-100 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500',
  error: 'bg-error-100 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  secondary: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-500/15 dark:text-secondary-500',
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400',
  success: 'bg-success-100 text-success-600 dark:bg-success-500/15 dark:text-success-500',
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const recent = notifications.slice(0, 5);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
              ) : (
                recent.map((n) => {
                  const typeInfo = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.success;
                  const Icon = Icons[typeInfo.icon] || Icons.Bell;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition',
                        !n.isRead && 'bg-primary-50/50 dark:bg-primary-500/5'
                      )}
                    >
                      <div className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', COLOR_MAP[typeInfo.color])}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="shrink-0 p-1 text-gray-400 hover:text-primary-500"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-center text-sm font-medium text-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 transition"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
