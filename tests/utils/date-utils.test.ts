import { PeriodType } from '../../src/types';
import { DateUtils } from '../../src/utils/date-utils';

describe('DateUtils', () => {
  describe('getPeriod', () => {
    it('should return correct period for 1week', () => {
      const period = DateUtils.getPeriod('1week');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last Week');

      // Check that the period is approximately 7 days
      const daysDiff = Math.ceil(
        (period.endDate.getTime() - period.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(7);
    });

    it('should return correct period for 2weeks', () => {
      const period = DateUtils.getPeriod('2weeks');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last 2 Weeks');

      const daysDiff = Math.ceil(
        (period.endDate.getTime() - period.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(14);
    });

    it('should return correct period for 1month', () => {
      const period = DateUtils.getPeriod('1month');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last Month');

      // Check that start date is approximately 1 month before end date
      const monthsDiff =
        (period.endDate.getFullYear() - period.startDate.getFullYear()) * 12 +
        (period.endDate.getMonth() - period.startDate.getMonth());
      expect(monthsDiff).toBe(1);
    });

    it('should return correct period for 3months', () => {
      const period = DateUtils.getPeriod('3months');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last 3 Months');

      const monthsDiff =
        (period.endDate.getFullYear() - period.startDate.getFullYear()) * 12 +
        (period.endDate.getMonth() - period.startDate.getMonth());
      expect(monthsDiff).toBe(3);
    });

    it('should return correct period for 6months', () => {
      const period = DateUtils.getPeriod('6months');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last 6 Months');

      const monthsDiff =
        (period.endDate.getFullYear() - period.startDate.getFullYear()) * 12 +
        (period.endDate.getMonth() - period.startDate.getMonth());
      expect(monthsDiff).toBe(6);
    });

    it('should return correct period for 9months', () => {
      const period = DateUtils.getPeriod('9months');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last 9 Months');

      const monthsDiff =
        (period.endDate.getFullYear() - period.startDate.getFullYear()) * 12 +
        (period.endDate.getMonth() - period.startDate.getMonth());
      expect(monthsDiff).toBe(9);
    });

    it('should return correct period for 1year', () => {
      const period = DateUtils.getPeriod('1year');

      expect(period.type).toBe('rolling');
      expect(period.label).toBe('Last Year');

      const yearsDiff =
        period.endDate.getFullYear() - period.startDate.getFullYear();
      expect(yearsDiff).toBe(1);
    });

    it('should return correct period for ytd', () => {
      const period = DateUtils.getPeriod('ytd');

      expect(period.type).toBe('year');
      expect(period.label).toBe('Year to Date');

      // Start date should be January 1st of current year
      expect(period.startDate.getMonth()).toBe(0); // January
      expect(period.startDate.getDate()).toBe(1);
      expect(period.startDate.getFullYear()).toBe(period.endDate.getFullYear());
    });

    it('should handle custom period with valid dates', () => {
      const customStart = new Date('2024-01-01T00:00:00Z');
      const customEnd = new Date('2024-01-10T23:59:59Z');

      const period = DateUtils.getPeriod('custom', customStart, customEnd);

      expect(period.type).toBe('rolling');
      expect(period.startDate).toEqual(customStart);
      expect(period.endDate).toEqual(customEnd);
      expect(period.label).toBe('2024-01-01 - 2024-01-10');
    });

    it('should throw error for custom period without dates', () => {
      expect(() => {
        DateUtils.getPeriod('custom');
      }).toThrow('Custom period requires both start and end dates');
    });

    it('should throw error for invalid period type', () => {
      expect(() => {
        DateUtils.getPeriod('invalid' as PeriodType);
      }).toThrow('Invalid period type or missing custom dates');
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = DateUtils.formatDate(date);

      expect(formatted).toBe('2024-01-15');
    });

    it('should handle different dates correctly', () => {
      const date1 = new Date('2023-12-31T23:59:59Z');
      const date2 = new Date('2024-02-29T00:00:00Z'); // Leap year

      expect(DateUtils.formatDate(date1)).toBe('2023-12-31');
      expect(DateUtils.formatDate(date2)).toBe('2024-02-29');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time using locale string', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = DateUtils.formatDateTime(date);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveDays', () => {
    it('should count unique days from commits', () => {
      const commits = [
        { date: new Date('2024-01-15T10:00:00Z') },
        { date: new Date('2024-01-15T14:00:00Z') }, // Same day
        { date: new Date('2024-01-16T09:00:00Z') },
        { date: new Date('2024-01-17T16:00:00Z') },
      ];

      const activeDays = DateUtils.getActiveDays(commits);
      expect(activeDays).toBe(3);
    });

    it('should return 0 for empty commits array', () => {
      const activeDays = DateUtils.getActiveDays([]);
      expect(activeDays).toBe(0);
    });

    it('should handle single commit', () => {
      const commits = [{ date: new Date('2024-01-15T10:00:00Z') }];
      const activeDays = DateUtils.getActiveDays(commits);
      expect(activeDays).toBe(1);
    });
  });

  describe('getCommitsByDay', () => {
    it('should group commits by day', () => {
      const commits = [
        { date: new Date('2024-01-15T10:00:00Z') },
        { date: new Date('2024-01-15T14:00:00Z') },
        { date: new Date('2024-01-16T09:00:00Z') },
        { date: new Date('2024-01-17T16:00:00Z') },
        { date: new Date('2024-01-17T18:00:00Z') },
      ];

      const commitsByDay = DateUtils.getCommitsByDay(commits);

      expect(commitsByDay.get('2024-01-15')).toBe(2);
      expect(commitsByDay.get('2024-01-16')).toBe(1);
      expect(commitsByDay.get('2024-01-17')).toBe(2);
      expect(commitsByDay.size).toBe(3);
    });

    it('should return empty map for empty commits array', () => {
      const commitsByDay = DateUtils.getCommitsByDay([]);
      expect(commitsByDay.size).toBe(0);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2024-01-13T10:00:00Z'); // Saturday
      expect(DateUtils.isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2024-01-14T10:00:00Z'); // Sunday
      expect(DateUtils.isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date('2024-01-15T10:00:00Z'); // Monday
      const friday = new Date('2024-01-19T10:00:00Z'); // Friday

      expect(DateUtils.isWeekend(monday)).toBe(false);
      expect(DateUtils.isWeekend(friday)).toBe(false);
    });
  });

  describe('isWorkingHours', () => {
    it('should return true for default working hours (9-18)', () => {
      const workingTime = new Date(2024, 0, 15, 14, 0, 0); // 2 PM local
      expect(DateUtils.isWorkingHours(workingTime)).toBe(true);
    });

    it('should return false for early morning', () => {
      const earlyMorning = new Date(2024, 0, 15, 7, 0, 0); // 7 AM local
      expect(DateUtils.isWorkingHours(earlyMorning)).toBe(false);
    });

    it('should return false for evening', () => {
      const evening = new Date(2024, 0, 15, 19, 0, 0); // 7 PM local
      expect(DateUtils.isWorkingHours(evening)).toBe(false);
    });

    it('should respect custom working hours', () => {
      const time = new Date(2024, 0, 15, 8, 0, 0); // 8 AM local

      expect(DateUtils.isWorkingHours(time, 8, 17)).toBe(true); // 8 is >= 8
      expect(DateUtils.isWorkingHours(time, 9, 18)).toBe(false); // 8 is < 9
    });

    it('should handle edge cases for working hours', () => {
      const startHour = new Date(2024, 0, 15, 9, 0, 0); // 9 AM local
      const endHour = new Date(2024, 0, 15, 18, 0, 0); // 6 PM local

      expect(DateUtils.isWorkingHours(startHour, 9, 18)).toBe(true);
      expect(DateUtils.isWorkingHours(endHour, 9, 18)).toBe(false); // 18 is exclusive
    });
  });

  describe('getDaysInPeriod', () => {
    it('should calculate days between dates', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-08T00:00:00Z');

      const days = DateUtils.getDaysInPeriod(start, end);
      expect(days).toBe(7);
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const days = DateUtils.getDaysInPeriod(date, date);
      expect(days).toBe(0);
    });

    it('should handle reversed dates', () => {
      const start = new Date('2024-01-08T00:00:00Z');
      const end = new Date('2024-01-01T00:00:00Z');

      const days = DateUtils.getDaysInPeriod(start, end);
      expect(days).toBe(7);
    });
  });

  describe('getHourlyCommitPattern', () => {
    it('should create hourly commit pattern', () => {
      // Use local time to avoid timezone issues
      const commits = [
        { date: new Date(2024, 0, 15, 9, 0, 0) }, // 9 AM local
        { date: new Date(2024, 0, 15, 9, 30, 0) }, // 9 AM local
        { date: new Date(2024, 0, 15, 14, 0, 0) }, // 2 PM local
        { date: new Date(2024, 0, 15, 22, 0, 0) }, // 10 PM local
      ];

      const pattern = DateUtils.getHourlyCommitPattern(commits);

      expect(pattern.size).toBe(24);
      expect(pattern.get(9)).toBe(2);
      expect(pattern.get(14)).toBe(1);
      expect(pattern.get(22)).toBe(1);
      expect(pattern.get(0)).toBe(0);
    });

    it('should initialize all hours with 0', () => {
      const pattern = DateUtils.getHourlyCommitPattern([]);

      expect(pattern.size).toBe(24);
      for (let hour = 0; hour < 24; hour++) {
        expect(pattern.get(hour)).toBe(0);
      }
    });
  });

  describe('isEarlyBird', () => {
    it('should return true for early morning hours (6-9)', () => {
      const earlyMorning = new Date(2024, 0, 15, 7, 0, 0); // 7 AM local
      expect(DateUtils.isEarlyBird(earlyMorning)).toBe(true);
    });

    it('should return false for other hours', () => {
      const afternoon = new Date(2024, 0, 15, 14, 0, 0); // 2 PM local
      const night = new Date(2024, 0, 15, 23, 0, 0); // 11 PM local

      expect(DateUtils.isEarlyBird(afternoon)).toBe(false);
      expect(DateUtils.isEarlyBird(night)).toBe(false);
    });
  });

  describe('isNightOwl', () => {
    it('should return true for late night hours (21-2)', () => {
      const lateNight = new Date(2024, 0, 15, 23, 0, 0); // 11 PM local
      const earlyMorning = new Date(2024, 0, 16, 1, 0, 0); // 1 AM local

      expect(DateUtils.isNightOwl(lateNight)).toBe(true);
      expect(DateUtils.isNightOwl(earlyMorning)).toBe(true);
    });

    it('should return false for daytime hours', () => {
      const afternoon = new Date(2024, 0, 15, 14, 0, 0); // 2 PM local
      expect(DateUtils.isNightOwl(afternoon)).toBe(false);
    });
  });

  describe('getTimePeriodName', () => {
    it('should return correct period names', () => {
      expect(DateUtils.getTimePeriodName(7)).toBe('Early Morning');
      expect(DateUtils.getTimePeriodName(10)).toBe('Morning');
      expect(DateUtils.getTimePeriodName(13)).toBe('Lunch Time');
      expect(DateUtils.getTimePeriodName(15)).toBe('Afternoon');
      expect(DateUtils.getTimePeriodName(19)).toBe('Evening');
      expect(DateUtils.getTimePeriodName(22)).toBe('Night');
      expect(DateUtils.getTimePeriodName(3)).toBe('Late Night');
    });
  });

  describe('getTimePeriodRange', () => {
    it('should return correct time ranges', () => {
      expect(DateUtils.getTimePeriodRange(7)).toBe('6AM-9AM');
      expect(DateUtils.getTimePeriodRange(10)).toBe('9AM-12PM');
      expect(DateUtils.getTimePeriodRange(13)).toBe('12PM-2PM');
      expect(DateUtils.getTimePeriodRange(15)).toBe('2PM-6PM');
      expect(DateUtils.getTimePeriodRange(19)).toBe('6PM-9PM');
      expect(DateUtils.getTimePeriodRange(22)).toBe('9PM-2AM');
      expect(DateUtils.getTimePeriodRange(3)).toBe('2AM-6AM');
    });
  });

  describe('isWorkingTimePeriod', () => {
    it('should return true for working hours (9-18)', () => {
      expect(DateUtils.isWorkingTimePeriod(9)).toBe(true);
      expect(DateUtils.isWorkingTimePeriod(12)).toBe(true);
      expect(DateUtils.isWorkingTimePeriod(17)).toBe(true);
    });

    it('should return false for non-working hours', () => {
      expect(DateUtils.isWorkingTimePeriod(8)).toBe(false);
      expect(DateUtils.isWorkingTimePeriod(18)).toBe(false);
      expect(DateUtils.isWorkingTimePeriod(22)).toBe(false);
    });
  });

  describe('formatHourLabel', () => {
    it('should format hours correctly', () => {
      expect(DateUtils.formatHourLabel(0)).toBe('12AM');
      expect(DateUtils.formatHourLabel(1)).toBe('1AM');
      expect(DateUtils.formatHourLabel(11)).toBe('11AM');
      expect(DateUtils.formatHourLabel(12)).toBe('12PM');
      expect(DateUtils.formatHourLabel(13)).toBe('1PM');
      expect(DateUtils.formatHourLabel(23)).toBe('11PM');
    });
  });
});
