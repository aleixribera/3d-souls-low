'use strict';
// Levels menu order.
const LEVELS = [TUTORIAL, LEVEL_1, LEVEL_2];
// Developer rooms for trying out mechanics: listed under Test Grounds, shown only when the page is opened with #dev.
const TEST_LEVELS = [TEST_CROWD];
const ALL_LEVELS = [...LEVELS, ...TEST_LEVELS];   // every level, for lookups and the data check
const DEV = location.hash === '#dev';
