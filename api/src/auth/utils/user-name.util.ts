import { AuthenticationResponse } from '@workos-inc/node';

export function buildUserNameFromWorkos(
  workosUser: Pick<
    AuthenticationResponse['user'],
    'firstName' | 'lastName' | 'email'
  >,
  fallback?: string | null,
): string | null {
  if (workosUser.firstName && workosUser.lastName) {
    return `${workosUser.firstName} ${workosUser.lastName}`;
  }

  if (workosUser.firstName) {
    return workosUser.firstName;
  }

  return fallback ?? null;
}
