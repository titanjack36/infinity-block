import { TimerSave, TimerState } from '../models/timer.interface';

const MsIn1Sec = 1000;

export default class Timer {
  private resetTimeValue: number = 0;
  private startTimeValue: number = 0;
  private startTimestamp: number = Date.now();
  private isTimerRunning: boolean = false;

  private lastTimeRemaining?: number;
  private lastFormattedTimeStr?: string;

  private callback?: (timeInSecs: number) => void;
  private cbIntervalId?: any;

  constructor() {
  }

  setTime(timeInSecs: number): void {
    this.resetTimeValue = Math.max(timeInSecs * MsIn1Sec, 0);
    this.reset();
  }

  addTime(addtTimeInSecs: number): void {
    this.startTimeValue = Math.max(this.startTimeValue + addtTimeInSecs * MsIn1Sec, 0);
  }

  reset(): void {
    this.startTimeValue = this.resetTimeValue;
    this.startTimestamp = Date.now();
  }

  start(): boolean {
    if (!this.isTimerRunning) {
      this.startTimestamp = Date.now();
      this.isTimerRunning = true;
      this.enableCallback();
      return true;
    }
    return false;
  }

  stop(): boolean {
    if (this.isTimerRunning) {
      this.startTimeValue = this.getTime() * MsIn1Sec;
      this.isTimerRunning = false;
      this.disableCallback();
      return true;
    }
    return false;
  }

  getTime(): number {
    const elapsedTime = this.isTimerRunning ? Date.now() - this.startTimestamp : 0;
    const timeRemaining = Math.max(this.startTimeValue - elapsedTime, 0);
    return Math.round(timeRemaining / MsIn1Sec);
  }

  getFormattedTime(): string {
    const timeInSecs = this.getTime();
    if (this.lastTimeRemaining !== undefined && timeInSecs === this.lastTimeRemaining) {
      return this.lastFormattedTimeStr!;
    }
    const hrVal = this.addPrefixZero(Math.floor(timeInSecs / 3600));
    const minVal = this.addPrefixZero(Math.floor(timeInSecs % 3600 / 60));
    const secVal = this.addPrefixZero(Math.floor(timeInSecs % 60));
    this.lastFormattedTimeStr = `${hrVal}h ${minVal}m ${secVal}s`;
    this.lastTimeRemaining = timeInSecs;
    return this.lastFormattedTimeStr;
  }

  sync(state: TimerState, ignoreIsTimerRunning: boolean = false): void {
    if (!(state.resetTimeValue >= 0 && 
        state.startTimeValue >= 0 &&
        (!state.isTimerRunning || state.startTimestamp >= 0))) {
      return;
    }
    this.resetTimeValue = state.resetTimeValue;
    this.startTimeValue = state.startTimeValue;
    this.startTimestamp = state.startTimestamp;
    this.isTimerRunning = ignoreIsTimerRunning ? this.isTimerRunning : !!state.isTimerRunning;
  }

  syncStartTimeValue(startTimeVal: number): void {
    if (!(startTimeVal >= 0)) {
      return;
    }
    this.startTimeValue = startTimeVal;
  }

  restoreFromSave(save: TimerSave, wasTimerRunning: boolean): void {
    if (!(save.timeRemaining >= 0 && save.timeCreated >= 0 && save.resetTimeValue >= 0)) {
      return;
    }
    this.isTimerRunning = wasTimerRunning;
    this.resetTimeValue = save.resetTimeValue;
    const elapsedTime = wasTimerRunning ? Date.now() - save.timeCreated : 0;
    this.startTimeValue = Math.max(save.timeRemaining * MsIn1Sec - elapsedTime, 0);
    this.startTimestamp = Date.now();
  }

  getTimerState(): TimerState {
    return {
      resetTimeValue: this.resetTimeValue,
      startTimeValue: this.startTimeValue,
      startTimestamp: this.startTimestamp,
      isTimerRunning: this.isTimerRunning
    };
  }

  getTimerSave(): TimerSave {
    return {
      resetTimeValue: this.resetTimeValue,
      timeRemaining: this.getTime(),
      timeCreated: Date.now()
    };
  }

  attachCallback(callback: (timeInSecs: number) => void): void {
    this.callback = callback;
    if (this.isTimerRunning) {
      this.enableCallback();
    }
  }

  detatchCallback(): void {
    this.disableCallback();
    this.callback = undefined;
  }

  private addPrefixZero(num: number): string {
    return ("0" + num).slice(-2);
  }

  private enableCallback() {
    if (this.callback === undefined || this.cbIntervalId !== undefined) {
      return;
    }
    this.cbIntervalId = setInterval(() => {
      const timeInSecs = this.getTime();
      if (this.lastTimeRemaining !== undefined && timeInSecs === this.lastTimeRemaining) {
        return;
      }
      this.callback!(timeInSecs);
    }, 50);
  }

  private disableCallback() {
    if (this.cbIntervalId) {
      clearInterval(this.cbIntervalId);
      this.cbIntervalId = undefined;
    }
  }
}