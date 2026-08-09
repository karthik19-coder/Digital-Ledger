import { format, addDays, subDays, isToday as isDateToday, parseISO, startOfDay } from 'date-fns';

export type DateChangeListener = (newDate: Date) => void;

class BusinessDateService {
  private static instance: BusinessDateService;
  private selectedDate: Date;
  private listeners: Set<DateChangeListener> = new Set();
  private readonly STORAGE_KEY = 'global_business_date';

  private constructor() {
    const storedDate = sessionStorage.getItem(this.STORAGE_KEY);
    if (storedDate) {
      this.selectedDate = parseISO(storedDate);
    } else {
      this.selectedDate = startOfDay(new Date());
    }
  }

  public static getInstance(): BusinessDateService {
    if (!BusinessDateService.instance) {
      BusinessDateService.instance = new BusinessDateService();
    }
    return BusinessDateService.instance;
  }

  public getSelectedBusinessDate(): Date {
    return this.selectedDate;
  }

  public setSelectedBusinessDate(date: Date): void {
    const startOfNewDate = startOfDay(date);
    if (this.selectedDate.getTime() === startOfNewDate.getTime()) return;

    this.selectedDate = startOfNewDate;
    sessionStorage.setItem(this.STORAGE_KEY, startOfNewDate.toISOString());
    this.notifyListeners();
  }

  public nextDay(): void {
    this.setSelectedBusinessDate(addDays(this.selectedDate, 1));
  }

  public previousDay(): void {
    this.setSelectedBusinessDate(subDays(this.selectedDate, 1));
  }

  public isToday(): boolean {
    return isDateToday(this.selectedDate);
  }

  public subscribe(listener: DateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  public unsubscribe(listener: DateChangeListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.selectedDate));
    // Dispatch global event for non-react subscribers or other modules
    window.dispatchEvent(new Event('business-date-changed'));
  }
}

// Export a singleton instance
export const businessDateService = BusinessDateService.getInstance();
