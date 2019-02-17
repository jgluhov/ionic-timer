import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { interval, animationFrameScheduler, BehaviorSubject, Subject } from 'rxjs';
import { map, takeWhile, takeUntil } from 'rxjs/operators';
import { Insomnia } from '@ionic-native/insomnia/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  timeForm = this.fb.group({
    durationTime: ['00:01:30']
  });
  localTimerPercent$ = new BehaviorSubject(0);
  localTimerTeardown$ = new Subject();
  overallTimerTeardown$ = new Subject();
  localTimerRunning = false;
  overallTimerRunning = false;
  initialElapsedTime = { h: '00', m: '00', s: '00' };
  overallTimerElapsedTime$ = new BehaviorSubject(this.initialElapsedTime);
  constructor(
    private insomnia: Insomnia,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.timeForm.valueChanges.subscribe(this.startTimer);
  }

  startTimer() {
    this.restoreLocalTimer();

    interval(1000, animationFrameScheduler).pipe(
      map(this.toPercent(this.totalSeconds)),
      takeWhile(this.atTheEnd(100)),
      takeUntil(this.localTimerTeardown$),
    ).subscribe(
      {
        next: (percent: number) => this.localTimerPercent$.next(percent),
        complete: () => this.localTimerRunning = false
      },
    );

    if (!this.overallTimerRunning) {
      this.startOverallTimer();
    }

    this.localTimerRunning = true;
  }

  startOverallTimer() {
    const countdownDate = Date.now();

    interval(1000).pipe(
      map(() => {
        const now = Date.now();
        const distance = now - countdownDate;
        this.overallTimerElapsedTime$.next({
          h: Math.floor( (distance % (1000 * 60 * 60 * 24) ) / (1000 * 60 * 60) ).toString().padStart(2, '0'),
          m: Math.floor( (distance % (1000 * 60 * 60) ) / (1000 * 60) ).toString().padStart(2, '0'),
          s: Math.floor( (distance % (1000 * 60) ) / 1000 ).toString().padStart(2, '0')
        });
      }),
      takeUntil(this.overallTimerTeardown$)
    ).subscribe();

    this.overallTimerRunning = true;
    this.insomnia.keepAwake();
  }

  restoreLocalTimer() {
    this.localTimerRunning = false;
    this.localTimerTeardown$.next();
    this.localTimerPercent$.next(0);
  }

  restoreOverallTimer() {
    this.overallTimerRunning = false;
    this.overallTimerTeardown$.next();
    this.overallTimerElapsedTime$.next(this.initialElapsedTime);
  }

  get totalSeconds() {
    const { durationTime } = this.timeForm.value;
    const [ hours, minutes, seconds ] = durationTime.split(':').map(Number);

    return seconds + (minutes * 60) + (hours * 60 * 60);
  }

  toPercent = (totalSeconds: number) => (progress: number) => ++progress / totalSeconds * 100;
  atTheEnd = (end: number) => (percent: number) => percent <= end;

  restoreTimers() {
    this.restoreLocalTimer();
    this.restoreOverallTimer();
    this.insomnia.allowSleepAgain();
  }
}
