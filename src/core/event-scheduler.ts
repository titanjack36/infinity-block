import { isSameDay } from "date-fns";
import { Profile, SchedEvent } from "../models/profile.interface";
import { getTimeInSecs } from "../utils/utils";

export default class EventScheduler {
  
  pendingSchedEvents: SchedEvent[];
  lastCheckedDate: Date;
  eventHandler?: (event: SchedEvent) => void;
  resetHandler?: () => void;

  /**
   * 
   * @param lastRecordedDate last recorded date by the app
   */
  constructor(lastRecordedDate: Date) {
    this.pendingSchedEvents = [];
    this.lastCheckedDate = lastRecordedDate;

    setInterval(() => {
      this.resetIfNewDay();
      this.checkSchedEvents();
    }, 5000)
  }

  /**
   * Updates pendingSchedEvents to contain all unexecuted events
   * in the updatedProfiles
   * @param updatedProfiles profiles that have been modified
   */
  onProfilesUpdated(updatedProfiles: Profile[]) {
    this.pendingSchedEvents = [];
    updatedProfiles.forEach(profile => {
      const schedule = profile.options.schedule;
      if (schedule.isEnabled) {
        // add all unexecuted scheduled events of profile
        this.pendingSchedEvents.push(
          ...schedule.events.filter(events => !events.executed));
      }
    });
  }

  /**
   * Add function to handle triggered scheduled event
   * @param handler function for handling triggered scheduled events
   */
  onEventTrigger(handler: (event: SchedEvent) => void) {
    this.eventHandler = handler;
  }

  /**
   * Add function to handle resetting scheduled events
   * @param handler function for handling resetting scheduled events
   */
  onEventReset(handler: () => void) {
    this.resetHandler = handler;
  }

  /**
   * Check if events need to be triggered.
   * An event is to be triggered if it has not been executed yet 
   * (it is in the pendingSchedEvents list) but its trigger time 
   * is less than the current time.
   * Do not trigger events if a handler is not attached.
   */
  async checkSchedEvents(): Promise<void> {
    const unexecutedEvents = [];
    for (const event of this.pendingSchedEvents) {
      if (this.eventHandler && getTimeInSecs(event.time!) < getTimeInSecs(new Date())) {
        try {
          this.eventHandler(event);
        } catch (err) {
          unexecutedEvents.push(event);
          console.error(err);
        }
      } else {
        unexecutedEvents.push(event);
      }
    }
    if (unexecutedEvents.length !== this.pendingSchedEvents.length) {
      this.pendingSchedEvents = unexecutedEvents;
    }
  }

  /**
   * Calls the reset handler if it is currently a different day
   * than the previously checked date.
   */
  resetIfNewDay() {
    const newDate = new Date();
    if (this.resetHandler && !isSameDay(this.lastCheckedDate, newDate)) {
      this.resetHandler();
      this.lastCheckedDate = newDate;
    }
  }
}