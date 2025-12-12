// Character model - utility functions for working with characters

function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

function isHeadmaster(index) {
  return blockTypes[index] === true;
}
