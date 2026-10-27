'use strict';
// Levels menu order.
const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];
// Developer rooms for trying out mechanics: listed under Test Grounds, shown only when the page is opened with #dev.
const TEST_LEVELS = [TEST_CROWD, TEST_HEIGHTS, TEST_COURTYARD, TEST_MIXED, TEST_TOWN, TEST_TRAINING];
// The Lands Between (v7.0): the second road's levels, in its order (the Levels menu lists them apart).
const LANDS_LEVELS = [LANDS_1, LANDS_2, LANDS_3, LANDS_4, LANDS_5, LANDS_6, LANDS_7, LANDS_8];
const ALL_LEVELS = [...LEVELS, ...LANDS_LEVELS, ...TEST_LEVELS];   // every level, for lookups and the data check
const DEV = location.hash === '#dev';
