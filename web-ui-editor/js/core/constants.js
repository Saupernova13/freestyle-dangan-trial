// Core constants for the Danganronpa Cast Manager

const BLOCK_COUNT = 17;
const blockNames = [...Array(16)].map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`).concat(['Headmaster']);
const blockTypes = [...Array(16)].fill(false).concat([true]); // false = student, true = headmaster
