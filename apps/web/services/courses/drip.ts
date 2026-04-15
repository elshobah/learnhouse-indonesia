/**
 * Content Drip Service
 * API calls for managing and reading course content drip (scheduled content release)
 */

import { getAPIUrl } from "@/services/config/config";
import { RequestBodyWithAuthHeader, errorHandling } from "@/services/utils/ts/requests";

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
  const result = await fetch(
    `${getAPIUrl()}courses/${courseUuid}/drip`,
    RequestBodyWithAuthHeader('GET', null, null, accessToken)
  );
  return errorHandling(result);
}

/**
 * Update the drip mode for a course
 */
export async function updateCourseDripMode(
  courseUuid: string,
  mode: string | null,
  accessToken: string
): Promise<{ drip_mode: string | null }> {
  const result = await fetch(
    `${getAPIUrl()}courses/${courseUuid}/drip/mode`,
    RequestBodyWithAuthHeader('PUT', { drip_mode: mode }, null, accessToken)
  );
  return errorHandling(result);
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
  const result = await fetch(
    `${getAPIUrl()}courses/${courseUuid}/drip/activity/${activityUuid}`,
    RequestBodyWithAuthHeader('PUT', config, null, accessToken)
  );
  return errorHandling(result);
}

/**
 * Delete drip configuration from an activity
 */
export async function deleteActivityDrip(
  courseUuid: string,
  activityUuid: string,
  accessToken: string
): Promise<{ status: string }> {
  const result = await fetch(
    `${getAPIUrl()}courses/${courseUuid}/drip/activity/${activityUuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, accessToken)
  );
  return errorHandling(result);
}

/**
 * Get drip lock status for all activities in a course (student)
 */
export async function getCourseDripStatus(
  courseUuid: string,
  accessToken: string
): Promise<CourseDripStatus> {
  const result = await fetch(
    `${getAPIUrl()}courses/${courseUuid}/drip/status`,
    RequestBodyWithAuthHeader('GET', null, null, accessToken)
  );
  return errorHandling(result);
}
