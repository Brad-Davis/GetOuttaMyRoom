/**
 * Dialog scripts: id -> { lines: [{ speaker, text }] }
 * Add new ids here and start them with dialogService.start('your_id').
 */
export const DIALOG_SCRIPTS = {
    bed_goblin_intro: {
        lines: [
            { sound: 'bed_goblin_intro', speaker: 'Bed Goblin', text: 'OVER HERE, I CAN HELP YOU...' },
        ],
    },
};

export const SOUNDS = {
    bed_goblin_intro: {
        sound: 'bed_goblin_intro.mp3',
    },
};
