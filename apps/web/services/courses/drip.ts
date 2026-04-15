/**
 * Content Drip Service
 * API calls for managing and reading course content drip (scheduled content release)
 */

import { api } from "@/services/api";

export interface DripStatus {
  is_locked: boolean;
  available_at: string | null;
  reason: string;
}

export interface DripConfig {
  available_from?: string | null;
  days_after_enrollment?: number | null;
  prerequisite_activity_id?: number | null;
}

export interface CourseDripConfig {
  drip_mode: string | null;
  activities: Record<string, DripConfig>;
}

export interface CourseDripStatus {
  drip_mode: string | null;
  activities: Record<string, DripStatus>;
}

/**
 * Get the current drip configuration for a course (admin)
 */
export async function getCourseDripConfig(
  courseUuid: string,
  accessToken: string
): Promise<CourseDripConfig> {
  const response = await api.get(
    `/courses/${courseUuid}/drip`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Update the drip mode for a course
 */
export async function updateCourseDripMode(
  courseUuid: string,
  mode: string | null,
  accessToken: string
): Promise<{ drip_mode: string | null }> {
  const response = await api.put(
    `/courses/${courseUuid}/drip/mode`,
    { drip_mode: mode },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Create or update drip configuration for a specific activity
 */
export async function upsertActivityDrip(
  courseUuid: string,
  activityUuid: string,
  config: DripConfig,
  accessToken: string
): Promise<any> {
  const response = await api.put(
    `/courses/${courseUuid}/drip/activity/${activityUuid}`,
    config,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Delete drip configuration from an activity
 */
export async function deleteActivityDrip(
  courseUuid: string,
  activityUuid: string,
  accessToken: string
): Promise<{ status: string }> {
  const response = await api.delete(
    `/courses/${courseUuid}/drip/activity/${activityUuid}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Get drip lock status for all activities in a course (student)
 */
export async function getCourseDripStatus(
  courseUuid: string,
  accessToken: string
): Promise<CourseDripStatus> {
  const response = await api.get(
    `/courses/${courseUuid}/drip/status`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}
