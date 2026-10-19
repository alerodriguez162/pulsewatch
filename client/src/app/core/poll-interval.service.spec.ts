import { TestBed } from '@angular/core/testing';

import { PollIntervalService } from './poll-interval.service';

describe('PollIntervalService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('defaults to five seconds', () => {
    const service = TestBed.inject(PollIntervalService);
    expect(service.intervalMs()).toBe(5000);
  });

  it('stores a supported interval', () => {
    const service = TestBed.inject(PollIntervalService);
    service.set(30000);
    expect(service.intervalMs()).toBe(30000);
    expect(localStorage.getItem('pulsewatch-poll-ms')).toBe('30000');
  });

  it('ignores an unsupported interval', () => {
    const service = TestBed.inject(PollIntervalService);
    service.set(1000);
    expect(service.intervalMs()).toBe(5000);
  });

  it('restores a stored interval', () => {
    localStorage.setItem('pulsewatch-poll-ms', '10000');
    const service = TestBed.inject(PollIntervalService);
    expect(service.intervalMs()).toBe(10000);
  });
});
