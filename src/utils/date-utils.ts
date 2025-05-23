import { TimePeriod, PeriodType } from '../types';

export class DateUtils {
  static getPeriod(periodType: PeriodType, customStart?: Date, customEnd?: Date): TimePeriod {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let label: string;

    switch (periodType) {
      case '1week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        label = 'Last Week';
        break;

      case '2weeks':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
        label = 'Last 2 Weeks';
        break;

      case '1month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        label = 'Last Month';
        break;

      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        label = 'Last 3 Months';
        break;

      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        label = 'Last 6 Months';
        break;

      case '9months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 9);
        label = 'Last 9 Months';
        break;

      case '1year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        label = 'Last Year';
        break;

      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        label = 'Year to Date';
        break;

      default:
        if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
          label = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
        } else {
          throw new Error('Invalid period type or missing custom dates');
        }
    }

    return {
      type: periodType === 'ytd' ? 'year' : 'rolling',
      startDate,
      endDate,
      label
    };
  }

  static formatDate(date: Date): string {
    const isoString = date.toISOString();
    return isoString.split('T')[0]!;
  }

  static formatDateTime(date: Date): string {
    return date.toLocaleString();
  }

  static getActiveDays(commits: Array<{ date: Date }>): number {
    const uniqueDays = new Set<string>();
    
    for (const commit of commits) {
      const dayKey = this.formatDate(commit.date);
      uniqueDays.add(dayKey);
    }

    return uniqueDays.size;
  }

  static getCommitsByDay(commits: Array<{ date: Date }>): Map<string, number> {
    const commitsByDay = new Map<string, number>();

    for (const commit of commits) {
      const dayKey = this.formatDate(commit.date);
      commitsByDay.set(dayKey, (commitsByDay.get(dayKey) || 0) + 1);
    }

    return commitsByDay;
  }

  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  static isWorkingHours(date: Date, startHour = 9, endHour = 18): boolean {
    const hour = date.getHours();
    return hour >= startHour && hour < endHour;
  }

  static getDaysInPeriod(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 