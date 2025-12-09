// Character model - utility functions for working with characters

function getStudents() {
  return cast.filter((c, index) => c && !blockTypes[index]);
}

function getHeadmaster() {
  const headmasterIndex = blockTypes.findIndex(type => type === true);
  return cast[headmasterIndex] || null;
}

function getCharactersByType(isHeadmaster) {
  return cast.filter((c, index) => c && blockTypes[index] === isHeadmaster);
}

function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

function isHeadmaster(index) {
  return blockTypes[index] === true;
}

function isStudent(index) {
  return blockTypes[index] === false;
}
