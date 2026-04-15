'use client'

import React, { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Lock, Clock, ChevronDown, Save, Plus, Trash2 } from 'lucide-react';
import FormLayout, { FormField, FormLabelAndMessage } from '@components/Objects/StyledElements/Form/Form';
import * as Form from '@radix-ui/react-form';
import { getCourseDripConfig, updateCourseDripMode, upsertActivityDrip, deleteActivityDrip } from '@/services/courses/drip';
import { useAuth } from '@/components/Contexts/AuthContext';
import { useCourseFieldSync } from '@components/Contexts/CourseContext';

type EditCourseDripProps = {
  orgslug: string;
  course_uuid?: string;
};

const DRIP_MODES = [
  { value: null, label: 'No Content Drip' },
  { value: 'BY_DATE', label: 'Available From Date' },
  { value: 'DAYS_AFTER_ENROLLMENT', label: 'Days After Enrollment' },
  { value: 'SEQUENTIAL', label: 'Sequential (One by One)' },
  { value: 'PREREQUISITE', label: 'Prerequisite-Based' },
];

interface Activity {
  id: number;
  activity_uuid: string;
  name: string;
  chapter_id: number;
}

interface Chapter {
  id: number;
  name: string;
  activities: Activity[];
}

const EditCourseDrip: React.FC<EditCourseDripProps> = ({ orgslug, course_uuid }) => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { courseStructure } = useCourseFieldSync('EditCourseDrip');
  const [dripMode, setDripMode] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [activityConfigs, setActivityConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);

  // Fetch drip config
  const { data: dripConfig, error: dripError } = useSWR(
    accessToken && course_uuid ? [`/drip-config/${course_uuid}`, accessToken] : null,
    ([url, token]) => getCourseDripConfig(course_uuid!, token)
  );

  // Load course structure from context to build chapters/activities list
  useEffect(() => {
    if (courseStructure?.chapters) {
      setChapters(courseStructure.chapters as any);
      const allActs: Activity[] = [];
      courseStructure.chapters.forEach((chapter: any) => {
        if (chapter.activities) {
          allActs.push(
            ...chapter.activities.map((act: any) => ({
              ...act,
              chapter_id: chapter.id,
            }))
          );
        }
      });
      setAllActivities(allActs);
    }
  }, [courseStructure]);

  // Load drip config from API
  useEffect(() => {
    if (dripConfig) {
      setDripMode(dripConfig.drip_mode);
      setActivityConfigs(dripConfig.activities);
    }
  }, [dripConfig]);

  const handleModeChange = async (newMode: string | null) => {
    setLoading(true);
    try {
      await updateCourseDripMode(course_uuid!, newMode, accessToken!);
      setDripMode(newMode);
      await mutate([`/drip-config/${course_uuid}`, accessToken!]);
    } catch (error) {
      console.error('Error updating drip mode:', error);
      alert('Failed to update drip mode');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityConfigChange = (activityUuid: string, field: string, value: any) => {
    setActivityConfigs(prev => ({
      ...prev,
      [activityUuid]: {
        ...prev[activityUuid],
        [field]: value,
      }
    }));
  };

  const handleSaveActivityConfig = async (activityUuid: string) => {
    setLoading(true);
    try {
      const config = activityConfigs[activityUuid];
      await upsertActivityDrip(course_uuid!, activityUuid, config, accessToken!);
      alert('Activity drip configuration saved');
      await mutate([`/drip-config/${course_uuid}`, accessToken!]);
    } catch (error) {
      console.error('Error saving activity config:', error);
      alert('Failed to save activity configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivityConfig = async (activityUuid: string) => {
    if (!confirm('Remove drip configuration from this activity?')) return;

    setLoading(true);
    try {
      await deleteActivityDrip(course_uuid!, activityUuid, accessToken!);
      const newConfigs = { ...activityConfigs };
      delete newConfigs[activityUuid];
      setActivityConfigs(newConfigs);
      await mutate([`/drip-config/${course_uuid}`, accessToken!]);
    } catch (error) {
      console.error('Error deleting activity config:', error);
      alert('Failed to delete activity configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivityExpanded = (activityUuid: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityUuid)) {
      newExpanded.delete(activityUuid);
    } else {
      newExpanded.add(activityUuid);
    }
    setExpandedActivities(newExpanded);
  };

  const renderActivityConfig = (activity: Activity) => {
    const config = activityConfigs[activity.activity_uuid] || {};
    const isExpanded = expandedActivities.has(activity.activity_uuid);

    return (
      <div key={activity.activity_uuid} className="border border-gray-200 rounded-lg mb-3">
        <button
          onClick={() => toggleActivityExpanded(activity.activity_uuid)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          type="button"
        >
          <div className="flex items-center gap-2 text-left">
            {activity.name}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            {dripMode === 'BY_DATE' && (
              <FormField>
                <FormLabelAndMessage label="Available From" message="" />
                <input
                  type="datetime-local"
                  value={config.available_from ? config.available_from.slice(0, 16) : ''}
                  onChange={(e) =>
                    handleActivityConfigChange(
                      activity.activity_uuid,
                      'available_from',
                      e.target.value ? new Date(e.target.value).toISOString() : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>
            )}

            {dripMode === 'DAYS_AFTER_ENROLLMENT' && (
              <FormField>
                <FormLabelAndMessage label="Days After Enrollment" message="" />
                <input
                  type="number"
                  min="0"
                  value={config.days_after_enrollment || ''}
                  onChange={(e) =>
                    handleActivityConfigChange(
                      activity.activity_uuid,
                      'days_after_enrollment',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="e.g., 7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>
            )}

            {dripMode === 'PREREQUISITE' && (
              <FormField>
                <FormLabelAndMessage label="Prerequisite Activity" message="" />
                <select
                  value={config.prerequisite_activity_id || ''}
                  onChange={(e) =>
                    handleActivityConfigChange(
                      activity.activity_uuid,
                      'prerequisite_activity_id',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select prerequisite --</option>
                  {allActivities
                    .filter(a => a.activity_uuid !== activity.activity_uuid)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </FormField>
            )}

            {dripMode === 'SEQUENTIAL' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-gray-700">
                Sequential mode unlocks activities in order after completion. No per-activity configuration needed.
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSaveActivityConfig(activity.activity_uuid)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => handleDeleteActivityConfig(activity.activity_uuid)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (dripError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
        <div className="text-red-700">Error loading drip configuration</div>
      </div>
    );
  }

  return (
    <FormLayout>
      {/* Drip Mode Selection */}
      <FormField>
        <FormLabelAndMessage
          label="Content Drip Mode"
          message="Choose how to gradually release course content to students"
        />
        <select
          value={dripMode || ''}
          onChange={(e) => handleModeChange(e.target.value || null)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {DRIP_MODES.map(mode => (
            <option key={mode.value || 'none'} value={mode.value || ''}>
              {mode.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Mode Description */}
      {dripMode && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          {dripMode === 'BY_DATE' && (
            <p className="text-sm text-gray-700">
              <strong>By Date:</strong> Each activity becomes available on a specific date you set.
            </p>
          )}
          {dripMode === 'DAYS_AFTER_ENROLLMENT' && (
            <p className="text-sm text-gray-700">
              <strong>Days After Enrollment:</strong> Activities unlock after a certain number of days from when a student enrolls.
            </p>
          )}
          {dripMode === 'SEQUENTIAL' && (
            <p className="text-sm text-gray-700">
              <strong>Sequential:</strong> Activities unlock one by one as students complete each one.
            </p>
          )}
          {dripMode === 'PREREQUISITE' && (
            <p className="text-sm text-gray-700">
              <strong>Prerequisite:</strong> Each activity requires a specific other activity to be completed first.
            </p>
          )}
        </div>
      )}

      {/* Activity Configuration */}
      {dripMode && dripMode !== 'SEQUENTIAL' && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock size={20} />
            Configure Per-Activity
          </h3>

          {chapters.map(chapter => (
            <div key={chapter.id} className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">{chapter.name}</h4>
              <div className="ml-4">
                {chapter.activities?.map(activity => renderActivityConfig(activity))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dripMode === 'SEQUENTIAL' && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Clock size={20} />
            Sequential Mode Active
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            All activities in your course are now in sequential order. Students must complete each activity to unlock the next one.
          </p>
          <p className="text-xs text-gray-600">
            Activity order is determined by their position in the course structure. Go to the Content tab to reorder activities if needed.
          </p>
        </div>
      )}
    </FormLayout>
  );
};

export default EditCourseDrip;
