const test = require('node:test');
const assert = require('node:assert/strict');

const {
    findNextShalatTime,
    formatTimeParts,
    getRemainingTimeParts,
    isScheduleTime,
} = require('../../../resources/assets/js/public_display/shalat-schedule');

test('findNextShalatTime finds the next scheduled shalat time after the current time', () => {
    const schedules = {
        imsak: '04:12',
        shubuh: '04:22',
        dzuhr: '12:00',
        ashr: '15:15',
    };

    assert.equal(findNextShalatTime(schedules, new Date('2026-07-19T12:01:00'), 'imsak'), 'ashr');
});

test('findNextShalatTime returns the fallback when all schedule times have passed', () => {
    const schedules = {
        shubuh: '04:22',
        dzuhr: '12:00',
        isya: '19:20',
    };

    assert.equal(findNextShalatTime(schedules, new Date('2026-07-19T23:30:00'), 'imsak'), 'imsak');
});

test('findNextShalatTime ignores values that are not HH:mm schedule times', () => {
    const schedules = {
        sunrise: '-',
        note: 'closed',
        ashr: '15:15',
    };

    assert.equal(findNextShalatTime(schedules, new Date('2026-07-19T12:01:00'), 'imsak'), 'ashr');
    assert.equal(isScheduleTime('-'), false);
});

test('getRemainingTimeParts calculates remaining time parts with next-day wrapping', () => {
    assert.deepEqual(getRemainingTimeParts('04:12', new Date('2026-07-19T23:30:10')), {
        hours: 4,
        minutes: 41,
        seconds: 49,
    });
});

test('formatTimeParts formats time parts in the existing display format', () => {
    assert.equal(formatTimeParts({ hours: 1, minutes: 2, seconds: 3 }), '01 : 02 : 03');
});
