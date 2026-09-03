// The character profile's field set, declared once.
//
// It used to be spelled out five times: the modal's empty buffer, the mapping
// that fills that buffer from a saved character, the character.json the save
// path builds, the form markup, and a partial fifth copy as the required-field
// list. Adding a field meant editing all five, and only one of them is visible
// when you are looking at the form - so a field could reach the form without
// reaching character.json, and be silently dropped on save.
//
// Declaration order is the form's field order, which character.json follows
// too. The row layout is a separate concern and lives with the form.
//
// DOM-free, so the tests can run it under node.

const toInt = (value) => parseInt(value, 10);

export const CHARACTER_FIELDS = [
  {
    key: 'name',
    label: 'First Name',
    missingLabel: 'First name',
    type: 'text',
    default: '',
    required: true,
  },
  {
    key: 'surname',
    label: 'Last Name',
    missingLabel: 'Last name',
    type: 'text',
    default: '',
    required: true,
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    missingLabel: 'Date of birth',
    type: 'date',
    default: '',
    required: true,
  },
  { key: 'blood', label: 'Blood Type', type: 'select', default: 'A' },
  // The two halves of the Height control. It is a real two-input special case,
  // so the form writes that one row by hand; the default, the parse and the
  // completeness rule still come from here.
  {
    key: 'heightM',
    label: 'Height',
    type: 'number',
    default: 1,
    min: '0.9',
    max: '2.5',
    step: '0.01',
    parse: parseFloat,
    inHeightRow: true,
  },
  {
    key: 'heightCM',
    label: 'Height (cm)',
    type: 'number',
    default: 50,
    min: '0',
    max: '99',
    step: '1',
    parse: toInt,
    inHeightRow: true,
  },
  {
    key: 'weight',
    label: 'Weight (kg)',
    missingLabel: 'Weight',
    type: 'number',
    default: '',
    min: '0',
    max: '300',
    parse: toInt,
    required: true,
  },
  {
    key: 'chest',
    label: 'Chest (cm)',
    missingLabel: 'Chest',
    type: 'number',
    default: '',
    min: '0',
    max: '200',
    parse: toInt,
    required: true,
  },
  {
    key: 'likes',
    label: 'Likes',
    type: 'textarea',
    default: '',
    required: true,
    placeholder: (isHeadmaster) =>
      isHeadmaster ? 'What does this headmaster enjoy?' : 'What does this student like?',
  },
  {
    key: 'dislikes',
    label: 'Dislikes',
    type: 'textarea',
    default: '',
    required: true,
    placeholder: (isHeadmaster) =>
      isHeadmaster ? 'What does this headmaster dislike?' : 'What does this student dislike?',
  },
  {
    key: 'notes',
    label: 'Notes',
    type: 'textarea',
    default: '',
    required: true,
    placeholder: (isHeadmaster) =>
      isHeadmaster
        ? 'Additional notes about this headmaster...'
        : 'Additional notes about this student...',
  },
];

export const CHARACTER_FIELDS_BY_KEY = Object.fromEntries(
  CHARACTER_FIELDS.map((field) => [field.key, field])
);

// The modal's empty edit buffer.
export function emptyCharacterFields() {
  return Object.fromEntries(CHARACTER_FIELDS.map((field) => [field.key, field.default]));
}

// The edit buffer for a saved character. A falsy stored value takes the
// default, which is what keeps heightM at 1 rather than 0 for a profile that
// never had one.
export function characterFieldsFrom(saved = {}) {
  return Object.fromEntries(
    CHARACTER_FIELDS.map((field) => [field.key, saved[field.key] || field.default])
  );
}

// The typed half of character.json. The numeric fields are parsed here and
// nowhere else, so the file cannot end up holding the form's strings.
export function characterJsonFields(fields) {
  return Object.fromEntries(
    CHARACTER_FIELDS.map((field) => [
      field.key,
      field.parse ? field.parse(fields[field.key]) : fields[field.key],
    ])
  );
}

// Display labels for the completeness check, in form order.
export function requiredCharacterFields() {
  return CHARACTER_FIELDS.filter((field) => field.required).map((field) => [
    field.key,
    field.missingLabel || field.label,
  ]);
}
