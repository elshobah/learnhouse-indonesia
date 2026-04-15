/**
 * DripLockedView Component
 * Full-page view displayed when a student tries to access a locked activity
 */

import React from 'react';
import { Lock, Clock, ArrowLeft } from 'lucide-react';
import { DripStatus } from '@/services/courses/drip';
import Link from 'next/link';

interface DripLockedViewProps {
  activityName: string;
  courseSlug: string;
  courseUuid: string;
  dripStatus: DripStatus;
}

const DripLockedView: React.FC<DripLockedViewProps> = ({
  activityName,
  courseSlug,
  courseUuid,
  dripStatus,
}) => {
  const formatAvailableDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatAvailableDays = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days <= 0) return 'today';
      if (days === 1) return 'tomorrow';
      return `in ${days} days`;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Lock size={40} className="text-blue-600" />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Content Not Yet Available
          </h1>

          {/* Activity Name */}
          <p className="text-gray-600 mb-6">
            <span className="font-medium">"{activityName}"</span> is temporarily locked
          </p>

          {/* Status Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 flex items-start gap-2">
              <Clock size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <span>{dripStatus.reason || 'This content will be available soon.'}</span>
            </p>

            {/* Available Date */}
            {dripStatus.available_at && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Available:</p>
                <p className="font-semibold text-gray-900">
                  {formatAvailableDate(dripStatus.available_at)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ({formatAvailableDays(dripStatus.available_at)})
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-900 mb-2">While you wait:</p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Review previously completed lessons</li>
              <li>✓ Complete earlier activities if needed</li>
              <li>✓ Check your course progress</li>
            </ul>
          </div>

          {/* Back Button */}
          <Link
            href={`/${courseSlug}/course/${courseUuid}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Course
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Content drip helps you learn at a steady pace
        </p>
      </div>
    </div>
  );
};

export default DripLockedView;
