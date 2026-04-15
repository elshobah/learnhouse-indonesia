/**
 * LockedActivity Component
 * Displays a locked activity in the course overview
 */

import React from 'react';
import { Lock, Clock, BookOpen } from 'lucide-react';
import { DripStatus } from '@/services/courses/drip';

interface LockedActivityProps {
  activity: {
    id: number;
    name: string;
    activity_type: string;
    activity_uuid: string;
  };
  dripStatus: DripStatus;
}

const LockedActivity: React.FC<LockedActivityProps> = ({ activity, dripStatus }) => {
  const formatAvailableDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed mb-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Lock size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-600">{activity.name}</div>
            <div className="text-sm text-gray-500 mt-1">
              {dripStatus.reason || 'Not available yet'}
            </div>
            {dripStatus.available_at && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                <Clock size={12} />
                Available {formatAvailableDate(dripStatus.available_at)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedActivity;
