// @vitest-environment jsdom
//
// Two editors shipped delete functions with no confirmation at all, while every
// comparable delete in the app confirms first: deleteScriptLine,
// deleteDialogueLine, deleteMassPanicLineGroup, deleteMinigame,
// deleteTruthBullet, removeCharacter. Both buttons sit directly beside the
// reorder arrows, so a misclick is likely.
import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../js/core/state.js';
import { deleteDebateScrumArgument } from '../js/views/minigames/debateScrumEditor.js';
import {
  deleteLogicDiveAnswer,
  deleteLogicDiveQuestion,
} from '../js/views/minigames/logicDiveEditor.js';

// The editors render into #mainGrid and dialogs mount into #dialogroot.
function mountEditorDom() {
  document.body.innerHTML = '<div id="mainGrid"></div><div id="dialogroot"></div>';
  window.icon = () => '';
}

function dialogButton(label) {
  return [...document.querySelectorAll('[data-dialog-index]')].find((b) => b.textContent === label);
}

function scrumMinigame() {
  return {
    gameId: 'mg_scrum',
    name: 'Scrum',
    gameType: 'debate_scrum',
    typeSpecific: {
      arguments: [
        { argumentId: 'a1', order: 0, oppositionStatement: 'You did it' },
        { argumentId: 'a2', order: 1, oppositionStatement: 'No I did not' },
      ],
    },
  };
}

function logicDiveMinigame() {
  return {
    gameId: 'mg_dive',
    name: 'Dive',
    gameType: 'logic_dive',
    typeSpecific: {
      questions: [
        {
          questionId: 'q1',
          order: 0,
          questionText: 'Who?',
          answers: [
            { answerId: 'an1', answerText: 'A', isCorrect: true },
            { answerId: 'an2', answerText: 'B', isCorrect: false },
            { answerId: 'an3', answerText: 'C', isCorrect: false },
          ],
        },
        { questionId: 'q2', order: 1, questionText: 'When?', answers: [] },
      ],
    },
  };
}

beforeEach(() => {
  mountEditorDom();
  state.dirHandle = null;
  state.trialName = 'T';
  state.cast = [];
  state.scriptLines = [];
  state.truthBullets = [];
});

describe('deleteDebateScrumArgument', () => {
  it('destroys nothing when the author cancels', async () => {
    state.minigames = [scrumMinigame()];
    const done = deleteDebateScrumArgument('mg_scrum', 'a1');
    dialogButton('Cancel').click();
    await done;

    expect(state.minigames[0].typeSpecific.arguments).toHaveLength(2);
  });

  it('deletes the argument when confirmed', async () => {
    state.minigames = [scrumMinigame()];
    const done = deleteDebateScrumArgument('mg_scrum', 'a1');
    dialogButton('Delete').click();
    await done;

    const left = state.minigames[0].typeSpecific.arguments;
    expect(left.map((a) => a.argumentId)).toEqual(['a2']);
  });
});

describe('deleteLogicDiveQuestion', () => {
  it('destroys nothing when the author cancels', async () => {
    state.minigames = [logicDiveMinigame()];
    const done = deleteLogicDiveQuestion('mg_dive', 'q1');
    dialogButton('Cancel').click();
    await done;

    expect(state.minigames[0].typeSpecific.questions).toHaveLength(2);
  });

  it('deletes the question and its answers when confirmed', async () => {
    state.minigames = [logicDiveMinigame()];
    const done = deleteLogicDiveQuestion('mg_dive', 'q1');
    dialogButton('Delete').click();
    await done;

    const left = state.minigames[0].typeSpecific.questions;
    expect(left.map((q) => q.questionId)).toEqual(['q2']);
  });
});

describe('deleteLogicDiveAnswer', () => {
  it('destroys nothing when the author cancels', async () => {
    state.minigames = [logicDiveMinigame()];
    const done = deleteLogicDiveAnswer('mg_dive', 'q1', 'an2');
    dialogButton('Cancel').click();
    await done;

    expect(state.minigames[0].typeSpecific.questions[0].answers).toHaveLength(3);
  });

  it('warns that removing the correct answer promotes another', async () => {
    // The reassignment is silent otherwise, so the author loses more than the
    // text they clicked beside.
    state.minigames = [logicDiveMinigame()];
    const done = deleteLogicDiveAnswer('mg_dive', 'q1', 'an1');
    expect(document.querySelector('.dr-dialog-msg').textContent).toContain('correct');
    dialogButton('Delete').click();
    await done;

    const answers = state.minigames[0].typeSpecific.questions[0].answers;
    expect(answers.map((a) => a.answerId)).toEqual(['an2', 'an3']);
    expect(answers[0].isCorrect).toBe(true);
  });

  it('still refuses to go below two answers, without asking', async () => {
    const mg = logicDiveMinigame();
    mg.typeSpecific.questions[0].answers.length = 2;
    state.minigames = [mg];
    await deleteLogicDiveAnswer('mg_dive', 'q1', 'an2');

    expect(document.querySelectorAll('[data-dialog-index]')).toHaveLength(0);
    expect(state.minigames[0].typeSpecific.questions[0].answers).toHaveLength(2);
  });
});
