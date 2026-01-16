import { buildUserNameFromWorkos } from './user-name.util';

describe('User Name Utilities', () => {
  describe('buildUserNameFromWorkos', () => {
    it('should return full name when both firstName and lastName are provided', () => {
      const workosUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser);

      expect(result).toBe('John Doe');
    });

    it('should return firstName when only firstName is provided', () => {
      const workosUser = {
        firstName: 'John',
        lastName: null,
        email: 'john@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser);

      expect(result).toBe('John');
    });

    it('should return fallback when neither firstName nor lastName are provided', () => {
      const workosUser = {
        firstName: null,
        lastName: null,
        email: 'user@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser, 'Existing Name');

      expect(result).toBe('Existing Name');
    });

    it('should return null when no names provided and no fallback given', () => {
      const workosUser = {
        firstName: null,
        lastName: null,
        email: 'user@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser);

      expect(result).toBeNull();
    });

    it('should return null when no names provided and fallback is null', () => {
      const workosUser = {
        firstName: null,
        lastName: null,
        email: 'user@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser, null);

      expect(result).toBeNull();
    });

    it('should treat empty string as falsy and use fallback', () => {
      const workosUser = {
        firstName: '',
        lastName: '',
        email: 'user@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser, 'Fallback Name');

      expect(result).toBe('Fallback Name');
    });

    it('should treat undefined as falsy and use fallback', () => {
      const workosUser = {
        firstName: undefined,
        lastName: undefined,
        email: 'user@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser, 'Fallback Name');

      expect(result).toBe('Fallback Name');
    });

    it('should return firstName when lastName is empty string', () => {
      const workosUser = {
        firstName: 'Jane',
        lastName: '',
        email: 'jane@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser);

      expect(result).toBe('Jane');
    });

    it('should return firstName when lastName is undefined', () => {
      const workosUser = {
        firstName: 'Jane',
        lastName: undefined,
        email: 'jane@example.com',
      };

      const result = buildUserNameFromWorkos(workosUser);

      expect(result).toBe('Jane');
    });
  });
});
