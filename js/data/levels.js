'use strict';
// Levels menu order.
const LEVELS = [TUTORIAL, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];
// Developer rooms for trying out mechanics: listed under Test Grounds, shown only when the page is opened with #dev.
const TEST_LEVELS = [TEST_CROWD, TEST_HEIGHTS, TEST_COURTYARD, TEST_MIXED, TEST_TOWN];
const ALL_LEVELS = [...LEVELS, ...TEST_LEVELS];   // every level, for lookups and the data check
const DEV = location.hash === '#dev';
